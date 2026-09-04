import { DurableObject } from "cloudflare:workers";
import type { Event } from "../src/core/types";
import { send } from "./push";

/**
 * One table's log.
 *
 * The room stores events and hands them on. It does not fold them, does not
 * know what a character is, and never decides anything — the whole of slice 6
 * is transport. What arrives is what every device already agreed on: an
 * append-only list of events with stable ids and a Lamport order.
 */
/** Only what pushing needs. The room does not read the rest of the worker's. */
type Env = {
  VAPID_PUBLIC?: string;
  VAPID_PRIVATE?: string;
  VAPID_SUBJECT?: string;
};

/** One device that has asked to be buzzed, and who it is watching. */
type PushRow = {
  endpoint: string; p256dh: string; auth: string; characters: string;
};

export class Room extends DurableObject<Env> {
  #sockets = new Set<WebSocket>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, seq INTEGER, body TEXT)`,
      );
      /*
       * Which phones to buzz, and for whom. Keyed by ENDPOINT because that is
       * what the browser gives back when it revokes one, and carrying the
       * characters as a list because a device can hold two — a player running
       * a familiar, a DM covering for somebody absent.
       */
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS pushes (
           endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
           characters TEXT NOT NULL, added INTEGER NOT NULL
         )`,
      );
    });
  }

  /**
   * Buzz every device watching this character.
   *
   * A subscription the browser has thrown away answers 404 or 410, and is
   * deleted rather than retried — a dead endpoint that is never dropped is a
   * push attempt on every turn, forever.
   *
   * No keys, no push. A deployment built without them sends nothing rather
   * than failing at the moment somebody's turn comes round.
   */
  async #buzz(character: string, title: string, body: string): Promise<void> {
    const { VAPID_PUBLIC: publicKey, VAPID_PRIVATE: privateKey, VAPID_SUBJECT: subject } = this.env;
    if (publicKey === undefined || privateKey === undefined || subject === undefined) return;

    const rows = this.ctx.storage.sql
      .exec<PushRow>("SELECT endpoint, p256dh, auth, characters FROM pushes").toArray();
    const payload = JSON.stringify({ title, body });

    for (const row of rows) {
      let watching: string[] = [];
      try { watching = JSON.parse(row.characters) as string[]; } catch { continue; }
      if (!watching.includes(character)) continue;
      const { gone } = await send(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        payload, { publicKey, privateKey, subject },
      );
      if (gone) this.ctx.storage.sql.exec("DELETE FROM pushes WHERE endpoint = ?", row.endpoint);
    }
  }

  /** Everything the room knows, in the order every device computes. */
  #all(): Event[] {
    const rows = this.ctx.storage.sql
      .exec<{ body: string }>(`SELECT body FROM events ORDER BY seq ASC, id ASC`)
      .toArray();
    return rows.map((r) => JSON.parse(r.body) as Event);
  }

  /**
   * Writing the same event twice is a no-op, which is what makes catch-up
   * safe to repeat. A device that reconnects five times sends the same log
   * five times and changes nothing.
   */
  #store(events: readonly Event[]): Event[] {
    const fresh: Event[] = [];
    for (const e of events) {
      const seen = this.ctx.storage.sql
        .exec<{ n: number }>(`SELECT COUNT(*) AS n FROM events WHERE id = ?`, e.id)
        .one().n;
      if (seen > 0) continue;
      this.ctx.storage.sql.exec(
        `INSERT INTO events (id, seq, body) VALUES (?, ?, ?)`,
        e.id, e.seq, JSON.stringify(e),
      );
      fresh.push(e);
    }
    return fresh;
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected a websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    this.#sockets.add(server);

    server.addEventListener("message", (m: MessageEvent) => {
      let msg: {
        kind?: string; events?: Event[];
        sub?: { endpoint: string; p256dh: string; auth: string };
        characters?: string[]; endpoint?: string;
        to?: string; title?: string; body?: string;
      };
      try {
        msg = JSON.parse(String(m.data)) as typeof msg;
      } catch {
        return;
      }

      if (msg.kind === "hello") {
        // Everything, always. The client merges by id and drops what it has.
        server.send(JSON.stringify({ kind: "catchup", events: this.#all() }));
        return;
      }

      if (msg.kind === "subscribe" && msg.sub !== undefined) {
        const { endpoint, p256dh, auth } = msg.sub;
        this.ctx.storage.sql.exec(
          `INSERT INTO pushes (endpoint, p256dh, auth, characters, added)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(endpoint) DO UPDATE SET p256dh = ?, auth = ?, characters = ?`,
          endpoint, p256dh, auth, JSON.stringify(msg.characters ?? []), Date.now(),
          p256dh, auth, JSON.stringify(msg.characters ?? []),
        );
        return;
      }

      if (msg.kind === "unsubscribe" && typeof msg.endpoint === "string") {
        this.ctx.storage.sql.exec("DELETE FROM pushes WHERE endpoint = ?", msg.endpoint);
        return;
      }

      if (msg.kind === "nudge" && typeof msg.to === "string") {
        /*
         * Worked out on the device that APPENDED the event, not here — this
         * room holds a log and has never had to understand it. That device is
         * awake by definition: it is the DM pressing Next turn.
         *
         * Fired and NOT awaited: a slow push service must not hold up the log.
         */
        this.ctx.waitUntil(this.#buzz(msg.to, msg.title ?? "Adventurer's Forge", msg.body ?? ""));
        return;
      }

      if (msg.kind === "append" && Array.isArray(msg.events)) {
        const fresh = this.#store(msg.events);
        if (fresh.length === 0) return;
        const payload = JSON.stringify({ kind: "events", events: fresh });
        for (const s of this.#sockets) {
          if (s === server) continue;
          try { s.send(payload); } catch { this.#sockets.delete(s); }
        }
      }
    });

    const drop = () => this.#sockets.delete(server);
    server.addEventListener("close", drop);
    server.addEventListener("error", drop);

    return new Response(null, { status: 101, webSocket: client });
  }
}

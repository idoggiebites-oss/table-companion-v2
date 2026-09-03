import { DurableObject } from "cloudflare:workers";
import type { Event } from "../src/core/types";

/**
 * One table's log.
 *
 * The room stores events and hands them on. It does not fold them, does not
 * know what a character is, and never decides anything — the whole of slice 6
 * is transport. What arrives is what every device already agreed on: an
 * append-only list of events with stable ids and a Lamport order.
 */
export class Room extends DurableObject {
  #sockets = new Set<WebSocket>();

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as never);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, seq INTEGER, body TEXT)`,
      );
    });
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
      let msg: { kind?: string; events?: Event[] };
      try {
        msg = JSON.parse(String(m.data)) as { kind?: string; events?: Event[] };
      } catch {
        return;
      }

      if (msg.kind === "hello") {
        // Everything, always. The client merges by id and drops what it has.
        server.send(JSON.stringify({ kind: "catchup", events: this.#all() }));
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

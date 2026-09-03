import type { Event } from "./types";

/**
 * Sync is a transport, not a redesign.
 *
 * The log has been the single source of truth since the first commit, so this
 * file moves events and nothing else: it never folds, never resolves, never
 * decides. Two rules make that safe —
 *
 *  1. Events are identified, so writing one twice is a no-op. Catch-up is
 *     therefore safe to repeat, and a device that reconnects five times sends
 *     the same log five times and changes nothing.
 *  2. Order is a Lamport counter, not arrival. A device can receive the whole
 *     log backwards and fold to the same state.
 */

export type Socket = {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
};

export type SyncState = "offline" | "connecting" | "live";

export type Sync = {
  /** Offer events to the room. Safe to call while offline. */
  push(events: readonly Event[]): void;
  state(): SyncState;
  close(): void;
};

export type SyncOptions = {
  /** Everything the room has, or has just heard. Already deduplicated by id. */
  onEvents: (events: readonly Event[]) => void;
  onState?: (state: SyncState) => void;
  /** What this device already holds, sent on every connection. */
  local: () => readonly Event[];
  open: (url: string) => Socket;
  /** Milliseconds between reconnection attempts. */
  retry?: number;
  schedule?: (fn: () => void, ms: number) => void;
};

/** Six characters, no vowels and no look-alikes — it gets read out loud. */
const ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";
export const isRoomCode = (s: string): boolean =>
  s.length === 6 && [...s].every((c) => ALPHABET.includes(c));

export function roomCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

export function connect(code: string, o: SyncOptions): Sync {
  const retry = o.retry ?? 2000;
  const later = o.schedule ?? ((fn, ms) => { setTimeout(fn, ms); });

  let socket: Socket | null = null;
  let state: SyncState = "offline";
  let closed = false;
  /** Written while offline, sent on the next connection. */
  let pending: Event[] = [];

  const announce = (s: SyncState) => {
    if (state === s) return;
    state = s;
    o.onState?.(s);
  };

  const open = () => {
    if (closed) return;
    announce("connecting");
    const s = o.open(`/room/${code}`);
    socket = s;

    s.onopen = () => {
      announce("live");
      // Ask for everything, and offer everything. The server keeps what is
      // new to it; both halves are idempotent.
      s.send(JSON.stringify({ kind: "hello" }));
      const mine = [...o.local(), ...pending];
      pending = [];
      if (mine.length > 0) s.send(JSON.stringify({ kind: "append", events: mine }));
    };

    s.onmessage = (m) => {
      let msg: { kind?: string; events?: Event[] };
      try {
        msg = JSON.parse(String(m.data)) as { kind?: string; events?: Event[] };
      } catch { return; }
      if ((msg.kind === "catchup" || msg.kind === "events") && Array.isArray(msg.events)) {
        o.onEvents(msg.events);
      }
    };

    const dropped = () => {
      socket = null;
      if (closed) return;
      announce("offline");
      later(open, retry);
    };
    s.onclose = dropped;
    s.onerror = dropped;
  };

  open();

  return {
    push(events) {
      if (events.length === 0) return;
      if (socket !== null && state === "live") {
        socket.send(JSON.stringify({ kind: "append", events }));
      } else {
        // A phone in a cellar is offline, not broken. It catches up later.
        pending.push(...events);
      }
    },
    state: () => state,
    close() {
      closed = true;
      socket?.close();
      socket = null;
      announce("offline");
    },
  };
}

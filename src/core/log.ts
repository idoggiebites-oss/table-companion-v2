import { type Event, type EventId, type DeviceId, before } from "./types";

export const SKIP = "skip";

export const isSkip = (e: Event): boolean => e.kind === SKIP;

const targetOf = (e: Event): EventId | null => {
  const t = e.data["target"];
  return typeof t === "string" ? t : null;
};

/**
 * Which events a fold should see.
 *
 * Undo appends a marker naming the event to skip; a marker can itself be
 * skipped, which is redo. Resolved from the newest backwards: a skip counts
 * unless a *later* counting skip names it. Evaluating forwards instead
 * oscillates on undo/redo/undo and never settles.
 */
export function live(events: readonly Event[]): readonly Event[] {
  const ordered = order(events);
  const killed = new Set<EventId>();
  const counts = new Set<EventId>();

  for (let i = ordered.length - 1; i >= 0; i--) {
    const e = ordered[i]!;
    if (!isSkip(e) || killed.has(e.id)) continue;
    counts.add(e.id);
    const t = targetOf(e);
    if (t !== null) killed.add(t);
  }

  return ordered.filter((e) => !isSkip(e) && !killed.has(e.id));
}

/** The same order on every device, whatever order things arrived in. */
export function order(events: readonly Event[]): readonly Event[] {
  return [...events].sort(before);
}

/** True when this event is currently taken back. */
export function isUndone(events: readonly Event[], id: EventId): boolean {
  return !live(events).some((e) => e.id === id);
}

/**
 * A clock that issues ids and Lamport sequence numbers. `witness` advances it
 * past anything seen from another device, so a later event always sorts later.
 */
export class Clock {
  #n = 0;
  constructor(readonly device: DeviceId) {}

  witness(events: readonly Event[]): void {
    for (const e of events) this.#n = Math.max(this.#n, e.seq);
  }

  issue(kind: string, data: Readonly<Record<string, unknown>> = {}, now = Date.now()): Event {
    this.#n += 1;
    return { id: `${this.device}:${this.#n}`, seq: this.#n, by: this.device, at: now, kind, data };
  }

  /** Undo is an append. It is never a deletion — other people have acted since. */
  undo(target: EventId, now = Date.now()): Event {
    return this.issue(SKIP, { target }, now);
  }
}

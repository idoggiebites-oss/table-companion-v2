/**
 * The core types. `core/` knows nothing about D&D — no creature, no spell, no
 * turn. Everything above it depends on this file and on nothing else here.
 */

declare const DEVICE: unique symbol;
/** Branded so a plain string cannot wander in as an author. */
export type DeviceId = string & { readonly [DEVICE]: true };
export const asDevice = (s: string): DeviceId => s as DeviceId;

export type EventId = string;

/**
 * One thing that happened. Append-only: an Event is never edited and never
 * removed. Taking something back appends a `skip` naming this id.
 */
export type Event = {
  readonly id: EventId;
  /**
   * Lamport counter. This — not `at` — is the ordering key. Six phones at a
   * table have six clocks, and one of them is wrong.
   */
  readonly seq: number;
  readonly by: DeviceId;
  /** Wall clock, for display only. Never sort by this. */
  readonly at: number;
  readonly kind: string;
  readonly data: Readonly<Record<string, unknown>>;
};

/**
 * What this device knows about itself. Seat, claimed characters, theme,
 * preferences — none of it is a fact about the campaign, so none of it is an
 * Event and none of it reaches another device.
 *
 * The shapes are deliberately disjoint: `types.assert.ts` proves at compile
 * time that neither is assignable to the other.
 */
export type DeviceState = {
  readonly scope: "device";
  readonly device: DeviceId;
  readonly theme: "light" | "dark" | "system";
  readonly seat: string | null;
};

/** A total order over events that every device computes identically. */
export function before(a: Event, b: Event): number {
  return a.seq - b.seq || (a.by < b.by ? -1 : a.by > b.by ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

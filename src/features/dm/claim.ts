import type { Fight } from "./fight";

/**
 * A swing, sent across and not yet answered.
 *
 * V1's rule and its reason: a player rolls their own dice and types what they
 * got; the DM decides whether it lands. That is how a table already works —
 * "eighteen to hit, seven damage" / "yeah, that hits" — and it is the only
 * division that keeps the disclosure ladder intact. A player who could apply
 * damage themselves would learn a creature's armour class by trial, and one
 * told "that misses" by the app would learn it in one go.
 *
 * BOTH numbers travel together because tables roll them together. Asking for
 * the damage only after the DM confirms would put a round trip in the middle
 * of somebody's turn.
 */
export type Claim = {
  readonly id: string;
  readonly who: string;
  /** Denormalised: the log has to read after the fight is long over. */
  readonly whoName: string;
  readonly targetId: string;
  readonly weapon: string;
  /** What the player rolled, their modifier already in it. */
  readonly toHit: number;
  readonly damage: number;
  readonly damageType: string;
};

export type Verdict = "hits" | "misses" | "unknown";

/**
 * What the DM's screen SUGGESTS. Never what it does.
 *
 * Unknown when there is no armour class to compare against — a character
 * being swung at has theirs on their own sheet, which this side does not
 * hold, and guessing would be worse than asking.
 */
export function verdictFor(toHit: number, ac: number | undefined): Verdict {
  if (ac === undefined) return "unknown";
  return toHit >= ac ? "hits" : "misses";
}

/** The line the DM reads: "18 against 15 — hits". */
export function describeVerdict(toHit: number, ac: number | undefined): string {
  const v = verdictFor(toHit, ac);
  return v === "unknown" ? `${String(toHit)} to hit` : `${String(toHit)} against ${String(ac)} — ${v}`;
}

/** The armour class of whatever is being swung at, when this side knows it. */
export const acOf = (f: Fight, id: string): number | undefined => {
  const c = f.combatants.find((x) => x.id === id);
  return c?.source.kind === "creature" ? c.source.ac : undefined;
};

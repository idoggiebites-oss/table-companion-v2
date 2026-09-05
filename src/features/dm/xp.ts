import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import { levelForXp, xpForLevel } from "../../rules/5e/progression";

export const XP = "party.xp";

/**
 * Experience, and who holds the key to a level.
 *
 * Levelling was the player's own button: a Level up sitting on every sheet,
 * pressable whenever. And `Hero.tsx` said the other half out loud — *"no
 * experience is tracked anywhere"* — while `encounter.ts` has computed what a
 * fight is worth since Task 31 and had nobody to give it to.
 *
 * **Both ways a table actually levels.** Arturo asked for "exp or milestone",
 * and they are not two systems: a milestone campaign grants a level outright,
 * an experience one awards numbers and the table crosses a threshold. Both end
 * at the same question — *is a level waiting?* — which is what the sheet asks.
 *
 * **The DM never takes the level.** They say it is owed; the player takes it,
 * because which fighting style or which subclass is theirs to choose and a DM
 * pressing it for them is the app deciding somebody's character.
 */
export type XpAct =
  /** Experience, split evenly. Empty `to` is the whole party. */
  | { readonly act: "award"; readonly amount: number; readonly to: readonly string[] }
  /** A milestone: the level is owed, no arithmetic. */
  | { readonly act: "milestone"; readonly to: readonly string[] }
  /** Taking one back — a DM mis-typed a zero. */
  | { readonly act: "unaward"; readonly amount: number; readonly to: readonly string[] };

export type Progress = {
  /** Experience held, by character. */
  readonly xp: Readonly<Record<string, number>>;
  /** Levels granted outright, by character. */
  readonly milestones: Readonly<Record<string, number>>;
};

export const NO_PROGRESS: Progress = { xp: {}, milestones: {} };

const asAct = (e: Event): XpAct | null =>
  e.kind === XP ? (e.data as unknown as XpAct) : null;

/**
 * Awards land per character, already divided.
 *
 * V1's rule, and the one that is easy to get backwards: the RAW total is what
 * a party earns and it is split evenly, never the adjusted one. Any multiplier
 * a table applies is for estimating how dangerous a fight will be — awarding
 * it roughly doubles a party's progression over a campaign.
 */
const spread = (
  held: Readonly<Record<string, number>>,
  to: readonly string[],
  amount: number,
): Record<string, number> => {
  const each = to.length === 0 ? 0 : Math.floor(amount / to.length);
  const out = { ...held };
  for (const who of to) out[who] = Math.max(0, (out[who] ?? 0) + each);
  return out;
};

function reduce(p: Progress, e: Event): Progress {
  const a = asAct(e);
  if (a === null) return p;
  switch (a.act) {
    case "award": return { ...p, xp: spread(p.xp, a.to, a.amount) };
    case "unaward": return { ...p, xp: spread(p.xp, a.to, -a.amount) };
    case "milestone": {
      const m = { ...p.milestones };
      for (const who of a.to) m[who] = (m[who] ?? 0) + 1;
      return { ...p, milestones: m };
    }
  }
}

export const progressFrom = (events: readonly Event[]): Progress =>
  fold(events, reduce, NO_PROGRESS);

/**
 * How many levels are waiting to be taken, given the level already held.
 *
 * **A character's level is worth the experience it took to get there**, even
 * if this app never watched them earn it. Characters are made at whatever
 * level the table is playing at — `makeSorcerer` starts one above first — so
 * counting an award from zero would owe a fifth-level character a level for
 * the next 300 experience anybody handed out. The held level seeds the total;
 * awards are added to it.
 *
 * The two routes add: a table that awarded experience for a term and then
 * handed out a milestone has done both, and neither should cancel the other.
 * Never negative — a DM taking experience back does not un-take a level
 * somebody has already spent an evening choosing.
 */
export function levelsOwed(p: Progress, who: string, level: number): number {
  const seed = xpForLevel(level) ?? 0;
  const reached = levelForXp(seed + (p.xp[who] ?? 0));
  return Math.max(0, reached + (p.milestones[who] ?? 0) - level);
}

/** What this one has earned, for a screen that shows a total. */
export const xpOf = (p: Progress, who: string): number => p.xp[who] ?? 0;

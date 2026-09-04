import {
  budgetForParty, encounterMultiplier, thresholdsForLevel, type Budget,
} from "./non-srd";

/**
 * How dangerous a fight is, and the working behind the answer.
 *
 * Ported from V1, which had this and V2 dropped in the port. Two rules travel
 * with it and neither is optional.
 *
 * **Show the working.** `raw × multiplier = adjusted`, against the party's own
 * budget. V1's reason: *"a band on its own teaches nobody why adding a seventh
 * goblin mattered"* — and the multiplier growing with creature count is the
 * step every table forgets. A screen that printed "Hard" and nothing else
 * would be right and useless.
 *
 * **The band is judged on the ADJUSTED total; the award is not.** The
 * multiplier estimates danger and is never earned. `features/dm/encounter.ts`
 * already carries the other half of this warning on `rawXp`: getting it
 * backwards roughly doubles a party's progression over a campaign.
 *
 * ## The licensing exit
 *
 * The thresholds and the multiplier are Dungeon Master's Guide content, so
 * they live in `non-srd.ts` and nowhere else. `check-imports` allows exactly
 * two importers of that file, and this is the second — a rule written into the
 * check before this module existed.
 *
 * **`budget` is optional everywhere below, and that optionality IS the exit.**
 * Delete `non-srd.ts`, drop the import, and every number here still computes
 * except `band`, which becomes null. V1 spells out the same procedure in its
 * own header. A design where the band were required would make the file
 * undeletable, which is the whole thing this arrangement exists to avoid.
 */

export type { Budget };

/*
 * Re-exported so that this module stays the ONLY door to the not-SRD tables.
 * `check-imports` allows exactly two importers of `non-srd.ts`, and a test
 * reaching past this file would be a third — which is not pedantry: the exit
 * is only one deletion if there is only one place that knows the file exists.
 */
export { encounterMultiplier, thresholdsForLevel };

/** Trivial through deadly. Null when there is no budget to judge against. */
export type Band = "trivial" | "easy" | "medium" | "hard" | "deadly";

export type Totals = {
  readonly creatures: number;
  /** What the party earns. Never adjusted — see the file header. */
  readonly rawXp: number;
  /** The award, split evenly, which is how it is handed out. */
  readonly perCharacter: number;
  /** Raw times the count multiplier. Estimates danger; never earned. */
  readonly adjustedXp: number;
  readonly multiplier: number;
  /** Null without a party to measure against, or without `non-srd.ts`. */
  readonly band: Band | null;
};

export function bandFor(xp: number, budget: Budget): Band {
  if (xp >= budget.deadly) return "deadly";
  if (xp >= budget.hard) return "hard";
  if (xp >= budget.medium) return "medium";
  if (xp >= budget.easy) return "easy";
  return "trivial";
}

/**
 * The party's budget, from the levels the app already holds.
 *
 * Re-exported rather than reached for directly, so that every consumer of the
 * gauge imports one module and `non-srd.ts` keeps exactly two importers.
 */
export const budgetFor = (levels: readonly number[]): Budget | null => budgetForParty(levels);

/**
 * Everything a card and an editor need about one encounter's danger.
 *
 * `partyLevels` empty means the party is unknown — a fresh install, or a DM
 * building an encounter before anybody has rolled a character. The totals
 * still compute; only the band goes away, which is the honest answer to
 * "how hard is this for a party that does not exist yet".
 */
export function totalsFor(
  { creatures, rawXp }: { creatures: number; rawXp: number },
  partyLevels: readonly number[] = [],
): Totals {
  const multiplier = encounterMultiplier(creatures);
  const adjustedXp = Math.round(rawXp * multiplier);
  const budget = budgetFor(partyLevels);
  const heads = Math.max(1, partyLevels.length);
  return {
    creatures,
    rawXp,
    perCharacter: Math.floor(rawXp / heads),
    adjustedXp,
    multiplier,
    band: budget === null ? null : bandFor(adjustedXp, budget),
  };
}

/**
 * The working, in the words the editor prints under the band.
 *
 * "450 × 2 = 900 against 700 hard" — every number that produced the verdict,
 * so a DM who disagrees can see which one they disagree with.
 */
export function describeTotals(t: Totals, budget: Budget | null): string {
  const working = t.multiplier === 1
    ? `${String(t.rawXp)} XP`
    : `${String(t.rawXp)} × ${String(t.multiplier)} = ${String(t.adjustedXp)} XP`;
  if (t.band === null || budget === null) return working;
  return `${working}, against ${String(budget[t.band === "trivial" ? "easy" : t.band])} ${
    t.band === "trivial" ? "easy" : t.band}`;
}

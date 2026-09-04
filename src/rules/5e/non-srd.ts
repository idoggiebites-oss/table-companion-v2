/**
 * NOT SRD. NOT REDISTRIBUTABLE.
 *
 * Two tables that are not in SRD 5.1 and are not covered by CC BY 4.0:
 *
 *   Ability score generation (PHB): the point-buy costs and the standard
 *   array. The SRD covers what ability scores DO, not how you first pick them.
 *
 *   Encounter building (DMG): the XP thresholds per level and the multiplier
 *   that grows with creature count. V1 checked each against the SRD PDF rather
 *   than assuming, using terms known to be in it as controls so that a failed
 *   text extraction could not be mistaken for an absent table.
 *
 * This is the one-file licensing exit, carried over from V1 deliberately.
 * **Delete this file and the app still runs.** The ability step offers Roll and
 * Manual rather than four options with two greyed out, and an encounter shows
 * its raw and adjusted experience with no difficulty band. That is the
 * fully-licensed build, and it is a supported one.
 *
 * `check-imports` enforces that only `pointbuy.ts` and `encounter.ts` reach
 * for this, so the exit stays one file and one deletion.
 *
 * CAVEAT, V1's and still true: these numbers are transcribed, and a wrong digit
 * in a threshold table is invisible — it just quietly mis-rates every fight.
 * `encounter.test.ts` holds the table to its own shape; spot-check it against
 * the book before trusting a band that looks wrong.
 */

/** Cost of raising a score to N, from a base of 8. */
export const POINT_COST: Readonly<Record<number, number>> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export const POINT_BUDGET = 27;
export const POINT_MIN = 8;
export const POINT_MAX = 15;

export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8];

/* ---- encounter building (DMG) -------------------------------------------- */

/** Easy, medium, hard and deadly, per character, at each level 1-20. */
export type Budget = {
  readonly easy: number; readonly medium: number;
  readonly hard: number; readonly deadly: number;
};

const THRESHOLDS: readonly (readonly [number, number, number, number])[] = [
  [25, 50, 75, 100],        // 1
  [50, 100, 150, 200],      // 2
  [75, 150, 225, 400],      // 3
  [125, 250, 375, 500],     // 4
  [250, 500, 750, 1100],    // 5
  [300, 600, 900, 1400],    // 6
  [350, 750, 1100, 1700],   // 7
  [450, 900, 1400, 2100],   // 8
  [550, 1100, 1600, 2400],  // 9
  [600, 1200, 1900, 2800],  // 10
  [800, 1600, 2400, 3600],  // 11
  [1000, 2000, 3000, 4500], // 12
  [1100, 2200, 3400, 5100], // 13
  [1250, 2500, 3800, 5700], // 14
  [1400, 2800, 4300, 6400], // 15
  [1600, 3200, 4800, 7200], // 16
  [2000, 3900, 5900, 8800], // 17
  [2100, 4200, 6300, 9500], // 18
  [2400, 4900, 7300, 10900],// 19
  [2800, 5700, 8500, 12700],// 20
];

export function thresholdsForLevel(level: number): Budget {
  const row = THRESHOLDS[Math.max(1, Math.min(20, Math.round(level))) - 1]!;
  return { easy: row[0], medium: row[1], hard: row[2], deadly: row[3] };
}

/**
 * The party's budget is the sum over its characters.
 *
 * Computed from the characters the app already holds rather than typed in,
 * which is the one step every other encounter calculator makes you do by hand.
 * Null for an empty party: there is no budget for nobody, and a zero one would
 * rate every fight deadly.
 */
export function budgetForParty(levels: readonly number[]): Budget | null {
  if (levels.length === 0) return null;
  return levels.reduce<Budget>((acc, lvl) => {
    const t = thresholdsForLevel(lvl);
    return {
      easy: acc.easy + t.easy, medium: acc.medium + t.medium,
      hard: acc.hard + t.hard, deadly: acc.deadly + t.deadly,
    };
  }, { easy: 0, medium: 0, hard: 0, deadly: 0 });
}

/**
 * Grows with the NUMBER of creatures, because six weak things are far more
 * dangerous than one thing worth the same experience.
 *
 * This is the step everyone forgets, which is exactly why the screen shows the
 * working rather than only the band: a band on its own teaches nobody why
 * adding a seventh goblin mattered.
 */
export function encounterMultiplier(creatures: number): number {
  if (creatures <= 0) return 0;
  if (creatures === 1) return 1;
  if (creatures === 2) return 1.5;
  if (creatures <= 6) return 2;
  if (creatures <= 10) return 2.5;
  if (creatures <= 14) return 3;
  return 4;
}

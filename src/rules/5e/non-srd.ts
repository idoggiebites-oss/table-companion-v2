/**
 * NOT SRD. NOT REDISTRIBUTABLE.
 *
 * The PHB point-buy cost table and standard array. These are not in SRD 5.1
 * and are not covered by CC BY 4.0.
 *
 * This is the one-file licensing exit, carried over from V1 deliberately.
 * Delete this file and the app still runs: the ability step offers Roll and
 * Manual, and the segmented control has two segments rather than four with two
 * greyed out. That is the fully-licensed build, and it is a supported one.
 *
 * `check-imports` enforces that only `pointbuy.ts` reaches for this, so the
 * exit stays one file and one deletion.
 */

/** Cost of raising a score to N, from a base of 8. */
export const POINT_COST: Readonly<Record<number, number>> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export const POINT_BUDGET = 27;
export const POINT_MIN = 8;
export const POINT_MAX = 15;

export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8];

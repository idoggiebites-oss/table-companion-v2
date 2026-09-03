import { POINT_COST, POINT_BUDGET, POINT_MIN, POINT_MAX, STANDARD_ARRAY } from "./non-srd";
import { ABILITIES, type Scores } from "./abilities";

/**
 * The only module that reaches for the not-SRD tables. Everything about the
 * ability step that is licensable lives behind this file, so the licensing
 * exit stays one deletion.
 */
export type Method = "point-buy" | "standard-array" | "roll" | "manual";

/** Which methods this build offers. Two of the four need the PHB tables. */
export function methods(hasNonSrd: boolean): Method[] {
  return hasNonSrd ? ["point-buy", "standard-array", "roll", "manual"] : ["roll", "manual"];
}

export const costOf = (score: number): number => POINT_COST[score] ?? Number.POSITIVE_INFINITY;

export const spent = (scores: Scores): number =>
  ABILITIES.reduce((n, a) => n + (POINT_COST[scores[a]] ?? 0), 0);

export const remaining = (scores: Scores): number => POINT_BUDGET - spent(scores);

/** A score is reachable only inside the table. 16 is not a point-buy number. */
export function canRaise(scores: Scores, ability: keyof Scores): boolean {
  const next = scores[ability] + 1;
  if (next > POINT_MAX) return false;
  return remaining(scores) >= costOf(next) - costOf(scores[ability]);
}

export function canLower(scores: Scores, ability: keyof Scores): boolean {
  return scores[ability] - 1 >= POINT_MIN;
}

export { POINT_BUDGET, POINT_MIN, POINT_MAX, STANDARD_ARRAY };

import { healthStep, VAGUE } from "../../rules/5e/vitals";
import type { Combatant } from "./fight";

/**
 * What a seat may be TOLD about a creature, as against what is true of it.
 *
 * Split out of `fight.ts` at the module budget, and the budget picked the
 * right line: everything here answers "who is allowed to know this", which is
 * a different question from "what happened", and the fight was carrying both.
 *
 * The ladder itself stays on the combatant, because it is a fact about the
 * creature. These are the readings taken off it.
 */

/** A creature's hit points, or null for a character — theirs are on their sheet. */
export function hpOf(c: Combatant): { hp: number; max: number } | null {
  if (c.source.kind !== "creature") return null;
  return { hp: c.source.max - c.damage, max: c.source.max };
}

/**
 * What a seat may be told about a creature's health, by its rung.
 *
 * A player asking "how hurt is that ogre" gets a WORD, never a number, until
 * the DM decides the mystery has stopped being fun — `healthStep` and `VAGUE`
 * already exist in `rules/5e/vitals.ts` for exactly that, and are the same
 * words the party screen uses, so the two sides of the table cannot end up
 * describing the same creature differently.
 */
export type HealthShown =
  | { readonly kind: "none" }
  | { readonly kind: "word"; readonly word: string }
  | { readonly kind: "numbers"; readonly hp: number; readonly max: number };

export function healthShown(dm: boolean, c: Combatant): HealthShown {
  const at = hpOf(c);
  if (at === null) return { kind: "none" };
  if (showsNumbers(dm, c)) return { kind: "numbers", hp: at.hp, max: at.max };
  if (c.disclosure === "vague") return { kind: "word", word: VAGUE[healthStep(at.hp, at.max)] };
  return { kind: "none" };
}

/** Whether a seat may be shown this combatant at all. */
export const visibleTo = (dm: boolean, c: Combatant): boolean => dm || c.disclosure !== "hidden";

/** What a seat is allowed to know about a combatant's health. */
export const showsNumbers = (dm: boolean, c: Combatant): boolean => dm || c.disclosure === "exact";

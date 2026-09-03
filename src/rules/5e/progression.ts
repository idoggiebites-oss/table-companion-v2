import { rulesFor } from "./classes";

/**
 * What a class level gives you, and what it asks in return.
 *
 * The point of this file is that there is exactly ONE of it. V1 had a builder
 * that could start a character at level seven and a level-up that could grow
 * one to level seven, and nothing held the two answers together. Here, joining
 * mid-campaign IS taking the levels one at a time — same function, same
 * events — so the two cannot drift.
 */

export type Grant =
  | { readonly kind: "hp"; readonly klass: string; readonly level: number; readonly die: number }
  | { readonly kind: "asi"; readonly klass: string; readonly level: number }
  | { readonly kind: "subclass"; readonly klass: string; readonly level: number };

/** Ability score improvements. Most classes at 4/8/12/16/19; two are not most. */
const ASI: Readonly<Record<string, readonly number[]>> = {
  fighter: [4, 6, 8, 12, 14, 16, 19],
  rogue: [4, 8, 10, 12, 16, 19],
};
const ASI_DEFAULT: readonly number[] = [4, 8, 12, 16, 19];

export const asiLevels = (klass: string): readonly number[] => ASI[klass] ?? ASI_DEFAULT;

/**
 * Everything one class level hands over.
 *
 * `classLevel` is the level IN THIS CLASS, not the character's total — a
 * fighter 5 / wizard 1 gets the wizard's first-level grants, not its sixth.
 */
export function grantsAt(klass: string, classLevel: number): Grant[] {
  const out: Grant[] = [{ kind: "hp", klass, level: classLevel, die: rulesFor(klass).hitDie }];
  if (rulesFor(klass).subclassAtLevel === classLevel) out.push({ kind: "subclass", klass, level: classLevel });
  if (asiLevels(klass).includes(classLevel)) out.push({ kind: "asi", klass, level: classLevel });
  return out;
}

/** Every grant from one class level up to another, in order. */
export function grantsBetween(klass: string, from: number, to: number): Grant[] {
  const out: Grant[] = [];
  for (let l = from + 1; l <= to; l++) out.push(...grantsAt(klass, l));
  return out;
}

/**
 * Hit points for a level after the first: the average of the die, rounded up.
 * The first level of the first class takes the whole die and is not a choice.
 */
export const averageHp = (die: number): number => Math.floor(die / 2) + 1;

/** Whether this level still owes an answer. */
export const owes = (g: Grant): boolean => g.kind !== "hp";

/**
 * Total experience required to reach each level, index 0 being level 1.
 *
 * SRD 5.1 page 56, the Character Advancement table — CC BY like the rest of
 * the reference, unlike the encounter tables behind `non-srd.ts`. The hub was
 * printing a hardcoded `0 / 300` at every level, so a third-level character
 * was told they were 300 from their next level when the answer is 2,700.
 *
 * A milestone campaign tracks none of this. A number nobody is counting is
 * worse than no number, so the hub shows it only when there is one.
 */
const ADVANCEMENT: readonly number[] = [
  0, 300, 900, 2_700, 6_500, 14_000, 23_000, 34_000, 48_000, 64_000,
  85_000, 100_000, 120_000, 140_000, 165_000, 195_000, 225_000, 265_000,
  305_000, 355_000,
];

export const MAX_LEVEL = ADVANCEMENT.length;

/** Total XP needed to reach a level, or null past the top of the table. */
export const xpForLevel = (level: number): number | null =>
  level < 1 || level > MAX_LEVEL ? null : ADVANCEMENT[level - 1]!;

/** The level a total earns. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < ADVANCEMENT.length; i++) if (xp >= ADVANCEMENT[i]!) level = i + 1;
  return level;
}

/** What the next level costs, from a level already held. */
export function nextThreshold(level: number): { next: number; at: number } | null {
  const at = xpForLevel(level + 1);
  return at === null ? null : { next: level + 1, at };
}

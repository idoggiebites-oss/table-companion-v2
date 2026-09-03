import type { Ability, Scores } from "../../rules/5e/abilities";
import { primary, type Build } from "./model";
import type { FeatEffects } from "../../rules/5e/feats";
import { savesFor } from "../../rules/5e/defence";
import { castsWith, slotsAt } from "../../rules/5e/casting";
import { multiclassSlots, pactMagic } from "../../rules/5e/multiclassing";


/** One ability score improvement, or the feat taken instead of it. */
export type Improvement =
  | { readonly abilities: readonly Ability[] }
  | { readonly feat: string; readonly name?: string };

/**
 * The scores a character actually has: assigned, plus what the ancestry gave.
 *
 * Everything derived reads this — armour class, initiative, saves, skills,
 * hit points. Reading `scores` directly leaves a High Elf two points of
 * Dexterity short and every number after it wrong.
 */
export function scoresOf(b: Build): Scores {
  const out = { ...b.scores };
  for (const [k, v] of Object.entries(b.bonuses)) {
    if (k in out) out[k as keyof Scores] = Math.min(20, out[k as keyof Scores] + v);
  }
  // The points the ancestry left the player to place — a Half-Elf's two.
  for (const [k, v] of Object.entries(b.heritage.abilities)) {
    if (k in out) out[k as keyof Scores] = Math.min(20, out[k as keyof Scores] + v);
  }
  /* A half-feat's point. Resilient (Constitution) raises Constitution by one
     as well as granting the save, and leaving it out makes the sheet wrong
     about the number the player took the feat for. */
  for (const f of featEffects(b)) {
    if (f.increase !== undefined) out[f.increase] = Math.min(20, out[f.increase] + 1);
  }
  // Then the ones earned on the way up. Both are capped at 20, which is where
  // a +2 stops being worth taking.
  for (const i of b.improvements) {
    if (!("abilities" in i)) continue;
    for (const a of i.abilities) out[a] = Math.min(20, out[a] + 1);
  }
  return out;
}

/** The feats taken, in the order taken. Derived — there is no second list. */
export const featsOf = (b: Build): readonly string[] => [
  ...(b.heritage.feat === null ? [] : [b.heritage.feat]),
  ...b.improvements.flatMap((i) => ("feat" in i ? [i.name ?? i.feat] : [])),
];

/**
 * The spell slots this character holds, per casting class.
 *
 * Per class rather than combined: 5e's multiclass caster uses a single
 * combined table, and this app does not model it. Two honest rows beat one
 * fabricated one, and the sheet says which it is showing.
 */
export function slotsOf(b: Build): readonly number[] {
  const casting = b.classes.filter((c) => castsWith(c.id, c.subclass));
  if (casting.length === 0) return [];
  /*
   * One class reads its own table; several read the COMBINED one. A
   * multiclass caster does not add their tables together — they work out one
   * effective caster level and read the full-caster table at it, which is why
   * a Cleric 3 / Wizard 3 has a sixth-level caster's slots while knowing only
   * second-level spells. V2 showed them per class and said the combined table
   * was "not derived here"; it is derivable, and V1 derived it.
   */
  if (casting.length === 1) return slotsAt(b.slots[casting[0]!.id], casting[0]!.level);
  return multiclassSlots(casting.map((c) => ({ id: c.id, level: c.level, subclass: c.subclass })));
}

/** A warlock's own track, which never joins that sum. */
export const pactOf = (b: Build): { count: number; level: number } | null =>
  pactMagic(b.classes.map((c) => ({ id: c.id, level: c.level })));

/** What every feat this character holds does to the numbers. */
export const featEffects = (b: Build): FeatEffects[] =>
  featsOf(b).flatMap((name) => (b.featEffects[name] === undefined ? [] : [b.featEffects[name]]));

/**
 * Saving throws, from the class and from Resilient.
 *
 * Resilient is the only feat in the game that grants one, and it is the reason
 * anybody takes it.
 */
export const savesOf = (b: Build): readonly string[] => [
  ...new Set([
    ...savesFor(primary(b)),
    ...featEffects(b).flatMap((f) => (f.saveProficiency === undefined ? [] : [f.saveProficiency])),
  ]),
];

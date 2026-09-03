import { modifier, type Scores } from "./abilities";
import { armourClass, UNARMOURED, type Worn } from "./armour";

/**
 * What a character is worth in a fight, with nothing on.
 *
 * This was the whole story for a while, because the build carried equipment
 * ids and nothing read them — and printing 12 and being right about what it
 * knew beat printing 16 on an assumption. The build carries the class's own
 * equipment lines now, so `armour.ts` answers this properly and the bare
 * unarmoured case is only the floor.
 */
export const unarmouredAC = (scores: Scores): number => UNARMOURED + modifier(scores.dex);

/** The armour class of a whole character, and the sum that made it. */
export const acFor = (worn: readonly Worn[], scores: Scores) => armourClass(worn, scores);

export const initiative = (scores: Scores): number => modifier(scores.dex);

/**
 * Feet per turn, when nothing else says.
 *
 * The compendium states a speed per race and the build carries it; this is
 * only the fallback for a character with no ancestry yet. Guessing from a
 * name was wrong for every ancestry outside the guess list.
 */
export const DEFAULT_SPEED = 30;

/** A save is the ability's own modifier, plus proficiency where a class grants it. */
const SAVES: Readonly<Record<string, readonly string[]>> = {
  barbarian: ["str", "con"], bard: ["dex", "cha"], cleric: ["wis", "cha"],
  druid: ["int", "wis"], fighter: ["str", "con"], monk: ["str", "dex"],
  paladin: ["wis", "cha"], ranger: ["str", "dex"], rogue: ["dex", "int"],
  sorcerer: ["con", "cha"], warlock: ["wis", "cha"], wizard: ["int", "wis"],
  artificer: ["con", "int"],
};

export const savesFor = (klass: string | null): readonly string[] =>
  klass === null ? [] : SAVES[klass.toLowerCase()] ?? [];

/** The six, in the order every sheet prints them. */
export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_NAME: Readonly<Record<Ability, string>> = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
};

export type Scores = Readonly<Record<Ability, number>>;

/** SRD, and true everywhere. */
export const modifier = (score: number): number => Math.floor((score - 10) / 2);

/** "+3", "+0", "-1" — signed, because a sheet never prints a bare modifier. */
export const signed = (n: number): string => (n < 0 ? `${n}` : `+${n}`);

/**
 * What each score actually changes, in the order it comes up in play.
 *
 * "d10 hit die · saves in STR and DEX" tells a returning player what they need
 * and a new one nothing at all. The question being asked at this screen is
 * *what does Strength even do*, and that is not derivable from any data file —
 * so it is written here, once, deliberately short.
 *
 * Ported from V1's `domain/guidance.ts`. Each names the things a table says
 * out loud rather than the rules' own categories: nobody asks which ability
 * governs a check, they ask what happens if this number is low.
 */
export const ABILITY_DOES: Readonly<Record<Ability, string>> = {
  str: "Melee attacks and damage, Athletics, shoving and carrying.",
  dex: "Armour class, initiative, ranged and finesse attacks, Stealth.",
  con: "Hit points, at every level. And holding concentration on a spell.",
  int: "Arcana, History, Investigation. Wizards cast with it.",
  wis: "Perception, Insight, Survival. Clerics and druids cast with it.",
  cha: "Persuasion, Deception, Intimidation. Bards, sorcerers, warlocks and paladins cast with it.",
};

export const BLANK: Scores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

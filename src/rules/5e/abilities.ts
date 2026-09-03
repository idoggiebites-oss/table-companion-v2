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

export const BLANK: Scores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

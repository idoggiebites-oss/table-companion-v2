/**
 * The twelve, and the two facts the step list needs from each.
 *
 * A compendium index carries a name and a provenance; it does not say when a
 * class picks its subclass or whether it casts at first level. That is rules
 * knowledge, and it is small enough to state.
 *
 * Anything not listed — and a complete compendium carries 67 classes — is
 * assumed not to cast at first level and to choose at third. Wrong for some
 * homebrew, and wrong in the direction that asks one question too few rather
 * than inventing a step nobody can answer.
 */
export type ClassRules = { readonly casterAtFirst: boolean; readonly subclassAtLevel: number; readonly hitDie: number };

export const CLASS_RULES: Readonly<Record<string, ClassRules>> = {
  barbarian: { casterAtFirst: false, subclassAtLevel: 3, hitDie: 12 },
  bard: { casterAtFirst: true, subclassAtLevel: 3, hitDie: 8 },
  cleric: { casterAtFirst: true, subclassAtLevel: 1, hitDie: 8 },
  druid: { casterAtFirst: true, subclassAtLevel: 2, hitDie: 8 },
  fighter: { casterAtFirst: false, subclassAtLevel: 3, hitDie: 10 },
  monk: { casterAtFirst: false, subclassAtLevel: 3, hitDie: 8 },
  paladin: { casterAtFirst: false, subclassAtLevel: 3, hitDie: 10 },
  ranger: { casterAtFirst: false, subclassAtLevel: 3, hitDie: 10 },
  rogue: { casterAtFirst: false, subclassAtLevel: 3, hitDie: 8 },
  sorcerer: { casterAtFirst: true, subclassAtLevel: 1, hitDie: 6 },
  warlock: { casterAtFirst: true, subclassAtLevel: 1, hitDie: 8 },
  wizard: { casterAtFirst: true, subclassAtLevel: 2, hitDie: 6 },
};

export const DEFAULT_CLASS: ClassRules = { casterAtFirst: false, subclassAtLevel: 3, hitDie: 8 };

export const rulesFor = (id: string): ClassRules => CLASS_RULES[id] ?? DEFAULT_CLASS;

/** The familiar twelve sort before everything else a compendium adds. */
export const isFamiliar = (id: string): boolean => id in CLASS_RULES;

/**
 * What a class is, in the words somebody choosing one would use.
 *
 * The compendium carries a hit die and a spell ability; it does not carry
 * "Arcane caster" or "Melee / Strength / Defense". A list of twelve names is
 * not a choice, so this is stated.
 */
export type Blurb = { readonly role: string; readonly tags: readonly string[] };

export const CLASS_BLURB: Readonly<Record<string, Blurb>> = {
  barbarian: { role: "Furious warrior", tags: ["Melee", "Strength", "Tough"] },
  bard: { role: "Inspiring performer", tags: ["Magic", "Charisma", "Support"] },
  cleric: { role: "Divine support", tags: ["Healing", "Wisdom", "Support"] },
  druid: { role: "Shapeshifting caster", tags: ["Magic", "Wisdom", "Nature"] },
  fighter: { role: "Martial warrior", tags: ["Melee", "Strength", "Defense"] },
  monk: { role: "Martial artist", tags: ["Melee", "Dexterity", "Mobile"] },
  paladin: { role: "Sworn champion", tags: ["Melee", "Charisma", "Healing"] },
  ranger: { role: "Natural explorer", tags: ["Ranged", "Wisdom", "Survival"] },
  rogue: { role: "Stealthy expert", tags: ["Dexterity", "Skill", "Stealth"] },
  sorcerer: { role: "Innate caster", tags: ["Magic", "Charisma", "Damage"] },
  warlock: { role: "Pact caster", tags: ["Magic", "Charisma", "Ranged"] },
  wizard: { role: "Arcane caster", tags: ["Magic", "Intelligence", "Ranged"] },
  artificer: { role: "Inventive caster", tags: ["Magic", "Intelligence", "Tools"] },
};

export const blurbFor = (id: string): Blurb | undefined => CLASS_BLURB[id];

/**
 * Which abilities a class leans on, best first.
 *
 * Used to offer a spread, never to impose one — a monk who wants to be strong
 * is making a choice. Anything unlisted falls back to the printed order.
 */
export const PRIORITY: Readonly<Record<string, readonly string[]>> = {
  barbarian: ["str", "con", "dex", "wis", "cha", "int"],
  bard: ["cha", "dex", "con", "wis", "int", "str"],
  cleric: ["wis", "con", "str", "cha", "dex", "int"],
  druid: ["wis", "con", "dex", "int", "cha", "str"],
  fighter: ["str", "con", "dex", "wis", "cha", "int"],
  monk: ["dex", "wis", "con", "str", "int", "cha"],
  paladin: ["str", "cha", "con", "wis", "dex", "int"],
  ranger: ["dex", "wis", "con", "str", "int", "cha"],
  rogue: ["dex", "con", "int", "wis", "cha", "str"],
  sorcerer: ["cha", "con", "dex", "wis", "int", "str"],
  warlock: ["cha", "con", "dex", "wis", "int", "str"],
  wizard: ["int", "con", "dex", "wis", "cha", "str"],
  artificer: ["int", "con", "dex", "wis", "cha", "str"],
};

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
export type Blurb = {
  readonly role: string;
  readonly tags: readonly string[];
  /**
   * One line on what playing it is actually LIKE.
   *
   * The role and the tags tell a returning player what they came for. This is
   * for the person who has never played one, and it is the thing no data file
   * carries. Ported from V1's `domain/guidance.ts`.
   *
   * Absent for a class this app does not ship a judgement about — see the
   * artificer below. Absent is honest; wrong is not.
   */
  readonly sentence?: string;
  /**
   * How much it asks you to keep track of. 1 easiest, 5 hardest.
   *
   * Bookkeeping and decisions, NOT power. A wizard has no more rules than a
   * fighter; it has three hundred more decisions. Authored, because this is a
   * judgement and there is nothing in the compendium to derive it from.
   */
  readonly complexity: number;
};

export const CLASS_BLURB: Readonly<Record<string, Blurb>> = {
  barbarian: { role: "Furious warrior", tags: ["Melee", "Strength", "Tough"],
    sentence: "Wade in and take the hits. Rage makes you hard to hurt. The easiest to play.",
    complexity: 1 },
  bard: { role: "Inspiring performer", tags: ["Magic", "Charisma", "Support"],
    sentence: "Talk your way past trouble and make everyone else better at their job.",
    complexity: 4 },
  cleric: { role: "Divine support", tags: ["Healing", "Wisdom", "Support"],
    sentence: "Heal, protect, and hit undead very hard. Armoured, and never short of something to do.",
    complexity: 3 },
  druid: { role: "Shapeshifting caster", tags: ["Magic", "Wisdom", "Nature"],
    sentence: "Turn into animals, and bend weather and plants to your side.",
    complexity: 5 },
  fighter: { role: "Martial warrior", tags: ["Melee", "Strength", "Defense"],
    sentence: "Hit things, take hits, and attack more often than anyone. The simplest place to start.",
    complexity: 1 },
  monk: { role: "Martial artist", tags: ["Melee", "Dexterity", "Mobile"],
    sentence: "Fast and unarmed, hard to pin down, better at running up a wall than standing still.",
    complexity: 3 },
  paladin: { role: "Sworn champion", tags: ["Melee", "Charisma", "Healing"],
    sentence: "Armoured, healing, and enormous damage in one swing when it matters.",
    complexity: 3 },
  ranger: { role: "Natural explorer", tags: ["Ranged", "Wisdom", "Survival"],
    sentence: "Track, shoot, and know the ground. Half warrior, half woodsman.",
    complexity: 3 },
  rogue: { role: "Stealthy expert", tags: ["Dexterity", "Skill", "Stealth"],
    sentence: "Sneak, pick locks, and hit for a great deal once a turn if you set it up.",
    complexity: 2 },
  sorcerer: { role: "Innate caster", tags: ["Magic", "Charisma", "Damage"],
    sentence: "Magic you were born with. Fewer spells than a wizard, bent to your will mid-cast.",
    complexity: 4 },
  warlock: { role: "Pact caster", tags: ["Magic", "Charisma", "Ranged"],
    sentence: "A pact for power. Few slots, but they come back on a short rest.",
    complexity: 3 },
  wizard: { role: "Arcane caster", tags: ["Magic", "Intelligence", "Ranged"],
    sentence: "The longest spell list in the game, prepared from a book you carry.",
    complexity: 5 },
  /* Tags and an icon, and deliberately NO sentence. V1 does the same: the
     artificer is not one of the twelve this app ships rules for — it is absent
     from `CLASS_RULES` above — and inventing a line about how it plays would be
     worse than saying nothing. Absent is honest; wrong is not. */
  artificer: { role: "Inventive caster", tags: ["Magic", "Intelligence", "Tools"], complexity: 4 },
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

/**
 * The authored half of a class's row, ready to spread onto an option.
 *
 * Here rather than at each of the two call sites, because those sites differ
 * in everything EXCEPT this — one reads a compendium and one is the shipped
 * fallback — and a sentence that reached only one of them would go missing
 * exactly where a person has no compendium to fall back on.
 *
 * A class this app ships no judgement about gets `{}`: no sentence, no pips,
 * no invention. A compendium brings fifty-five more, and absent is honest.
 */
export function facetsOf(id: string): {
  role?: string; tags?: readonly string[]; says?: string; bookkeeping?: number;
} {
  const b = CLASS_BLURB[id];
  if (b === undefined) return {};
  return {
    role: b.role, tags: b.tags, bookkeeping: b.complexity,
    ...(b.sentence === undefined ? {} : { says: b.sentence }),
  };
}

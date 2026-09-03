import { ABILITY_NAME, type Ability, type Scores } from "./abilities";

/**
 * What a SECOND class gives you, which is not what a first one does.
 *
 * Ported from V1's `domain/multiclassing.ts`. Taking a level of fighter at
 * creation makes you a fighter: all the armour, all the weapons, two skills
 * off its list. Taking one later makes you a fighter who missed basic
 * training — the book grants a short, specific list per class, and no skills
 * at all for most of them.
 *
 * V1's note, and V2 had the same shape: the builder had this half-right by
 * accident. A second class granted nothing, which is correct for nine classes
 * out of thirteen and wrong for the three that do grant a skill. It also said
 * nothing about the armour and weapons that DO come across, so a
 * fighter/wizard's shield proficiency was a thing the player had to remember.
 *
 * 2014 rules. Recorded rather than mechanised, the same way subclass features
 * are: the app writes down what you gained and the table reads it.
 */

export type MulticlassGrant = {
  /** Armour and weapons, in the book's own words. */
  readonly proficiencies: readonly string[];
  /** How many skills, and from where. Absent means none — which is usual. */
  readonly skills?: { readonly choose: number; readonly from: readonly string[] };
  readonly tools?: readonly string[];
};

const LIGHT = "light armour";
const MEDIUM = "medium armour";
const SHIELDS = "shields";
const SIMPLE = "simple weapons";
const MARTIAL = "martial weapons";

export const MULTICLASS: Readonly<Record<string, MulticlassGrant>> = {
  barbarian: { proficiencies: [SHIELDS, SIMPLE, MARTIAL] },
  bard: {
    proficiencies: [LIGHT],
    // The bard is the one class whose multiclass skill is any skill at all.
    skills: { choose: 1, from: [] },
    tools: ["one musical instrument"],
  },
  cleric: { proficiencies: [LIGHT, MEDIUM, SHIELDS] },
  druid: { proficiencies: [LIGHT, MEDIUM, "shields (nonmetal)"] },
  fighter: { proficiencies: [LIGHT, MEDIUM, SHIELDS, SIMPLE, MARTIAL] },
  monk: { proficiencies: [SIMPLE, "shortswords"] },
  paladin: { proficiencies: [LIGHT, MEDIUM, SHIELDS, SIMPLE, MARTIAL] },
  ranger: {
    proficiencies: [LIGHT, MEDIUM, SHIELDS, SIMPLE, MARTIAL],
    skills: {
      choose: 1,
      from: ["animal-handling", "athletics", "insight", "investigation", "nature",
             "perception", "stealth", "survival"],
    },
  },
  rogue: {
    proficiencies: [LIGHT],
    skills: {
      choose: 1,
      from: ["acrobatics", "athletics", "deception", "insight", "intimidation",
             "investigation", "perception", "performance", "persuasion",
             "sleight-of-hand", "stealth"],
    },
    tools: ["thieves' tools"],
  },
  // Neither gains a thing beyond the spellcasting itself.
  sorcerer: { proficiencies: [] },
  wizard: { proficiencies: [] },
  warlock: { proficiencies: [LIGHT, SIMPLE] },
  artificer: {
    proficiencies: [LIGHT, MEDIUM, SHIELDS],
    tools: ["thieves' tools", "tinker's tools"],
  },
};

export const multiclassGrant = (id: string): MulticlassGrant | null => MULTICLASS[id] ?? null;

/** The whole grant as one sentence, for a card that has to say it out loud. */
export function describeGrant(name: string, g: MulticlassGrant): string {
  const parts = [...g.proficiencies, ...(g.tools ?? [])];
  if (g.skills !== undefined) {
    parts.push(g.skills.from.length === 0 ? "one skill of your choice" : "one skill from its list");
  }
  if (parts.length === 0) {
    return `${name} brings its spellcasting and nothing else — no armour, no weapons, no skills.`;
  }
  const list = parts.length === 1
    ? parts[0]!
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]!}`;
  return `Taken as a second class, ${name} brings ${list}.`;
}

/* ------------------------------------------------------------------ *
 * Spell slots, when there is more than one class
 * ------------------------------------------------------------------ */

/**
 * How much of a caster each class is.
 *
 * A multiclass caster does NOT add their classes' slot tables together. They
 * work out one effective caster level and read the full-caster table at it,
 * which is why a Cleric 3 / Wizard 3 has the slots of a 6th-level caster
 * while knowing only 2nd-level spells. V1's note: nobody gets this right at a
 * table without the book open, and getting it wrong quietly is worse than not
 * offering it.
 *
 * Warlocks are not in that sum at all. Pact magic is its own track, with its
 * own table and its own short rest, and it stacks alongside rather than into.
 */
const CASTER_SHARE: Readonly<Record<string, "full" | "half" | "third" | "pact">> = {
  bard: "full", cleric: "full", druid: "full", sorcerer: "full", wizard: "full",
  paladin: "half", ranger: "half", artificer: "half",
  warlock: "pact",
};

/** Subclasses that make a third of a caster out of a class that is none. */
const THIRD_CASTER = /eldritch.?knight|arcane.?trickster/i;

/**
 * The one number the multiclass table is read at.
 *
 * Full casters count their level, half casters half, third casters a third —
 * each rounded DOWN, except the artificer, which the rules round UP and which
 * V1 calls the single most-forgotten exception in the whole calculation.
 */
export function casterLevel(classes: readonly { id: string; level: number; subclass?: string | null }[]): number {
  let total = 0;
  for (const c of classes) {
    const id = c.id.toLowerCase();
    const share = CASTER_SHARE[id];
    if (share === "full") total += c.level;
    else if (share === "half") total += id === "artificer" ? Math.ceil(c.level / 2) : Math.floor(c.level / 2);
    else if (share === undefined && THIRD_CASTER.test(c.subclass ?? "")) total += Math.floor(c.level / 3);
  }
  return total;
}

/**
 * The full-caster slot table, 1..20. Index 0 of each row is 1st-level slots.
 *
 * Written out rather than derived: every attempt to generate this from a rule
 * is a rule with exceptions, and a wrong row here is a player casting a spell
 * they do not have.
 */
const FULL_CASTER: readonly (readonly number[])[] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Slots for a multiclass caster. Empty when nothing in the mix casts. */
export function multiclassSlots(
  classes: readonly { id: string; level: number; subclass?: string | null }[],
): readonly number[] {
  const level = casterLevel(classes);
  if (level <= 0) return [];
  return [...(FULL_CASTER[Math.min(20, level) - 1] ?? [])];
}

/** A warlock's own track, which never joins the sum above. */
export function pactMagic(
  classes: readonly { id: string; level: number }[],
): { count: number; level: number } | null {
  const warlock = classes.find((c) => c.id.toLowerCase() === "warlock");
  if (warlock === undefined || warlock.level < 1) return null;
  const l = Math.min(20, warlock.level);
  return {
    count: l >= 17 ? 4 : l >= 11 ? 3 : l >= 2 ? 2 : 1,
    level: l >= 9 ? 5 : l >= 7 ? 4 : l >= 5 ? 3 : l >= 3 ? 2 : 1,
  };
}

/** Whether the multiclass table applies at all, or the class's own does. */
export const isMulticlass = (classes: readonly { level: number }[]): boolean =>
  classes.filter((c) => c.level > 0).length > 1;

/* ------------------------------------------------------------------ *
 * What each class demands before it will have you
 * ------------------------------------------------------------------ */

const REQUIREMENTS: Readonly<Record<string, { readonly all?: readonly Ability[]; readonly any?: readonly Ability[] }>> = {
  barbarian: { all: ["str"] },
  bard: { all: ["cha"] },
  cleric: { all: ["wis"] },
  druid: { all: ["wis"] },
  fighter: { any: ["str", "dex"] },
  monk: { all: ["dex", "wis"] },
  paladin: { all: ["str", "cha"] },
  ranger: { all: ["dex", "wis"] },
  rogue: { all: ["dex"] },
  sorcerer: { all: ["cha"] },
  warlock: { all: ["cha"] },
  wizard: { all: ["int"] },
  artificer: { all: ["int"] },
};

const MINIMUM = 13;

/**
 * Why they cannot take this level, or null.
 *
 * **The rule cuts both ways and people forget the first half:** taking a level
 * in something new requires the minimums of the class you are LEAVING as well
 * as the one you are joining.
 */
export function multiclassBlock(
  { from, into, scores }: {
    from: readonly { id: string }[];
    into: string;
    scores: Scores;
  },
): string | null {
  const needed = [into, ...from.map((c) => c.id)]
    .map((id) => id.toLowerCase())
    .filter((id, i, all) => all.indexOf(id) === i);

  const unmet: string[] = [];
  for (const id of needed) {
    const rule = REQUIREMENTS[id];
    // A class this app has no rule for is not blocked.
    if (rule === undefined) continue;
    if (rule.all !== undefined && !rule.all.every((a) => scores[a] >= MINIMUM)) {
      unmet.push(`${title(id)} needs ${rule.all.map((a) => ABILITY_NAME[a]).join(" and ")} ${String(MINIMUM)}`);
    }
    if (rule.any !== undefined && !rule.any.some((a) => scores[a] >= MINIMUM)) {
      unmet.push(`${title(id)} needs ${rule.any.map((a) => ABILITY_NAME[a]).join(" or ")} ${String(MINIMUM)}`);
    }
  }
  return unmet.length > 0 ? `${unmet.join(". ")}.` : null;
}

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

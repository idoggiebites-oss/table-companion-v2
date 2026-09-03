/**
 * What a caster knows and can cast, by level.
 *
 * Two different kinds of fact, from two different places:
 *
 *   - **Spell slots are DATA.** Every class in the compendium carries its own
 *     twenty-row table — a wizard's runs `[2]` at first level to
 *     `[4,3,3,3,3,2,2,1,1]` at twentieth. V1 read only the first row and
 *     stored it; V2 read none of it, so a wizard 3 held four first-level and
 *     two second-level slots and the sheet said nothing at all.
 *   - **Cantrips known is a TABLE**, because the compendium does not carry it.
 *     V1 hardcoded zero here and moved on. It is small enough to state, and
 *     stating it beats a builder that offers everybody three — which is the
 *     wizard's number given to six other classes.
 *
 * SRD 5.1 class tables. Anything unlisted casts nothing and is offered
 * nothing, which is right for the ten non-casters and right in the cautious
 * direction for a homebrew class the app has never heard of.
 */

/** Cantrips known at each character level, index 0 being level 1. */
const CANTRIPS: Readonly<Record<string, readonly number[]>> = {
  bard:      [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  cleric:    [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid:     [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer:  [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock:   [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  wizard:    [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  artificer: [2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5],
};

/**
 * Spells KNOWN at each character level, for the classes that know rather than
 * prepare. A cleric, druid, paladin and wizard prepare from a list and are
 * absent here; a wizard's spellbook is its own thing again.
 */
const KNOWN: Readonly<Record<string, readonly number[]>> = {
  bard:     [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  ranger:   [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  warlock:  [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
};

const at = (table: readonly number[] | undefined, level: number): number =>
  table?.[Math.max(0, Math.min(19, Math.round(level) - 1))] ?? 0;

export const spellsKnown = (klass: string, level: number): number => at(KNOWN[klass], level);

/** Whether this class knows a fixed number of spells rather than preparing. */
export const knowsSpells = (klass: string): boolean => klass in KNOWN;

/**
 * A wizard's spellbook: six at first level, two more at every level after.
 *
 * Not "known" — a wizard prepares from the book, and the book is the thing
 * they choose. Kept apart from KNOWN for exactly that reason.
 */
export const spellbook = (klass: string, level: number): number =>
  klass === "wizard" ? 6 + 2 * Math.max(0, Math.min(20, Math.round(level)) - 1) : 0;

/**
 * How many spells this character CHOOSES at creation.
 *
 * Three answers, and the middle one is the one V2 missed. A wizard writes six
 * into a spellbook. A bard, ranger, sorcerer or warlock knows a fixed number —
 * a level-one bard knows four, and V2 asked for cantrips and stopped, so a
 * bard finished creation knowing no spells while a bard GROWN to level two
 * knew one. The two doors contradicted each other, which is the whole thing
 * `progression.ts` exists to prevent.
 *
 * A cleric, druid or paladin prepares from the entire class list every day and
 * chooses nothing here. Asking them to pick at creation would be inventing a
 * rule.
 */
export function spellsAtCreation(klass: string, level: number): number {
  if (klass === "wizard") return spellbook(klass, level);
  return spellsKnown(klass, level);
}

/** Whether this class prepares from the whole list rather than knowing some. */
export const prepares = (klass: string): boolean =>
  !knowsSpells(klass) && klass !== "wizard" && castsCantrips(klass);

/**
 * How many spells a preparer has ready: their ability modifier plus level,
 * minimum one. Shown rather than chosen — preparation changes every dawn.
 */
export const preparedCount = (abilityMod: number, level: number): number =>
  Math.max(1, abilityMod + level);

export const cantripsKnown = (klass: string, level: number): number =>
  at(CANTRIPS[klass], level);

/** Whether this class is offered cantrips at all. */
export const castsCantrips = (klass: string): boolean => klass in CANTRIPS;

/**
 * Whether this class's slot table is the CLASS's, or one subclass's.
 *
 * A Fighter's table reads `[], [], [2], [3]` — that is the Eldritch Knight's,
 * and a plain fighter never casts a thing. A Rogue's is the Arcane Trickster's.
 * Handing every fighter two first-level slots at third level because the class
 * record carries a table is exactly the kind of quiet wrongness that makes a
 * sheet untrustworthy.
 *
 * Anything unlisted is trusted with its own table: a homebrew caster the app
 * has no rules for should still show what its data says.
 */
const BY_SUBCLASS: Readonly<Record<string, string>> = {
  fighter: "eldritch-knight",
  rogue: "arcane-trickster",
};

export function castsWith(klass: string, subclass: string | null): boolean {
  const owner = BY_SUBCLASS[klass];
  if (owner === undefined) return true;
  return subclass !== null && subclass.toLowerCase().includes(owner);
}

/**
 * The slots a class holds at a level, read from its own table.
 *
 * `[4, 3, 2]` means four first-level, three second, two third. An empty list
 * is a class that casts nothing at this level, which is not the same as a
 * class that never casts — a paladin's table is empty at first level and not
 * at second.
 */
export function slotsAt(table: readonly (readonly number[])[] | undefined, level: number): readonly number[] {
  const row = table?.[Math.max(0, Math.min((table.length || 1) - 1, Math.round(level) - 1))];
  return (row ?? []).filter((n) => n > 0);
}

/**
 * What a level newly teaches: cantrips and spells, as a difference.
 *
 * A bard reaching 2 learns one more spell and no more cantrips; a wizard
 * reaching 4 learns a cantrip. The level-up asked for none of it.
 */
export function learnedAt(klass: string, from: number, to: number): { cantrips: number; spells: number } {
  return {
    cantrips: Math.max(0, cantripsKnown(klass, to) - cantripsKnown(klass, from)),
    spells: Math.max(0, spellsKnown(klass, to) - spellsKnown(klass, from)),
  };
}

/** The highest spell level this character can cast, or 0 for none. */
export const topSpellLevel = (slots: readonly number[]): number => slots.length;

/**
 * The slot levels gained between two character levels, so a level-up can say
 * what actually changed. Reaching a new spell level is the largest thing that
 * happens to a caster, and the screen said nothing about it.
 */
export function slotsGained(
  table: readonly (readonly number[])[] | undefined,
  from: number,
  to: number,
): { level: number; had: number; now: number }[] {
  const before = slotsAt(table, from);
  const after = slotsAt(table, to);
  const out: { level: number; had: number; now: number }[] = [];
  for (let i = 0; i < after.length; i++) {
    const had = before[i] ?? 0;
    const now = after[i] ?? 0;
    if (now > had) out.push({ level: i + 1, had, now });
  }
  return out;
}

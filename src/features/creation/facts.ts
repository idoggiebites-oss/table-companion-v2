import type { StepFacts } from "../../rules/5e/steps";
import { asiLevels } from "../../rules/5e/progression";
import { multiclassGrant } from "../../rules/5e/multiclassing";
import { categoriesIn } from "../../content/gear";
import { primary, type Build } from "./model";
import type { Offer } from "./offers";

/**
 * The part of a build a step needs to know about. Not the whole build: a list
 * of options does not depend on ability scores, and a content layer that took
 * the whole thing could quietly start depending on them.
 */
export type Asking = {
  readonly race: string | null;
  readonly subrace: string | null;
  readonly klass: string | null;
  readonly background: string | null;
  /** The first class's path, which decides which spells it can cast. */
  readonly subclass: string | null;
  /** The classes taken AFTER the first, which grant differently. */
  readonly classes: readonly string[];
  /**
   * Skills the ancestry has already handed over at the heritage step.
   *
   * The skills step has to know: a Half-Elf's two Skill Versatility picks are
   * made BEFORE it, and a row that is already owned must be shown as held or
   * a class pick gets spent on something the character has.
   */
  readonly heritage: readonly string[];
};

export const asking = (b: Build): Asking => ({
  race: b.race, subrace: b.subrace, klass: primary(b), background: b.background,
  subclass: b.names["subclass"] ?? b.classes[0]?.subclass ?? null,
  classes: b.classes.slice(1).map((c) => c.id),
  heritage: b.heritage.skills,
});

/** What the step list needs to know. The content layer answers the rest. */
export type Catalogue = {
  hasSubraces(raceId: string): boolean;
  casterAtFirst(classId: string): boolean;
  subclassAtLevel(classId: string): number;
  /**
   * The level this class adopts a fighting style, or Infinity for the ten that
   * never do. Data, not a table: the class lists its styles as its own
   * features and states the level on each.
   */
  styleAtLevel(classId: string): number;
  /**
   * Questions this character's classes have opened and not answered — every
   * one except the subclass, which has a step of its own.
   */
  openQuestions(build: Build): { key: string; klass: string; of: string; level: number }[];
  /** The questions a class opens AT this level, for the level-up to ask. */
  questionsAt?(classId: string, level: number): { of: string; options: readonly import("../../ui/step/Choices").Option[] }[];
  /** Spells a class could learn at this level. */
  spellsAt?(classId: string, level: number, subclass?: string | null): readonly import("../../ui/step/Choices").Option[];
  /** What this class offers instead of the kit — "5d4x10". */
  wealthFor?(classId: string): string | undefined;
  /** A class's hit die, for a dip that rolls its new class's. */
  hitDieFor?(classId: string): number;
  /** How many cantrips this class knows at this level. */
  cantripsFor(classId: string, level: number): number;
  /** This class's own spell-slot table, or undefined for the ten that never cast. */
  slotTableFor(classId: string): readonly (readonly number[])[] | undefined;
  /** What the ancestry left the player to place, and how many pieces. */
  heritageFor(build: Asking): { points: number; skills: number; feat: boolean };
  /**
   * What this character's ancestry, class and background between them hand
   * over, and what they leave open. Read from all three at once because a
   * question is only worth asking once — a Half-Elf who already speaks Elvish
   * should not be offered it again by their background.
   */
  proficienciesFor(build: Asking): Offer;
};

/** How many pieces of the ancestry's gift are still unplaced. */
export function openHeritage(b: Build, cat: Catalogue): number {
  const h = cat.heritageFor(asking(b));
  return h.points + h.skills + (h.feat ? 1 : 0);
}

/**
 * How many improvements this character has already passed.
 *
 * Only for a character joining mid-campaign: one grown at the table answers
 * each as it arrives, through the level-up screen and the same event.
 */
export function owedImprovements(b: Build): number {
  return b.classes.reduce(
    (n, c) => n + asiLevels(c.id).filter((l) => l <= c.level).length, 0,
  );
}

/**
 * Skills owed by the classes taken after the first.
 *
 * The first class makes you that class outright: all its armour, all its
 * weapons, skills off its list. A later one grants a short specific list, and
 * for ten of the thirteen it grants no skill at all.
 */
export const owedMulticlassSkills = (b: Build): number =>
  b.classes.slice(1).reduce((n, c) => n + (multiclassGrant(c.id)?.skills?.choose ?? 0), 0);

export function factsOf(b: Build, cat: Catalogue): StepFacts {
  return {
    race: b.race === null ? null : { id: b.race, hasSubraces: cat.hasSubraces(b.race) },
    classes: b.classes.map((c) => ({
      id: c.id, level: c.level,
      casterAtFirst: cat.casterAtFirst(c.id),
      subclassAtLevel: cat.subclassAtLevel(c.id),
      styleAtLevel: cat.styleAtLevel(c.id),
    })),
    level: b.level,
    picks: cat.proficienciesFor(asking(b)).picks.reduce((n, p) => n + p.count, 0),
    heritage: openHeritage(b, cat),
    improvements: owedImprovements(b),
    mcSkills: owedMulticlassSkills(b),
    classPicks: cat.openQuestions(b).length,
    weapons: b.equipment.reduce((n, line) => n + categoriesIn(line).length, 0),
  };
}

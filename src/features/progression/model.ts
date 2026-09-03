import type { Event } from "../../core/types";
import { grantsAt, averageHp, type Grant } from "../../rules/5e/progression";
import { rulesFor } from "../../rules/5e/classes";
import type { Build } from "../creation/model";
import type { Ability } from "../../rules/5e/abilities";

export const TAKE = "progress.take";

/** One level, taken in one class, with whatever that level asked for. */
export type LevelTaken = {
  readonly klass: string;
  /** The level in that class, not the character's total. */
  readonly classLevel: number;
  /** What was thrown for hit points, or the average if nobody threw. */
  readonly hp: number;
  readonly subclass?: string;
  /** The words the person saw, so a sheet never has to say "order-of-scribes". */
  readonly subclassName?: string;
  /** A dip's own die, when the level is the first in a new class. */
  readonly die?: number;
  /** Answers to the questions this level opened — Metamagic, a Pact Boon. */
  readonly picks?: Readonly<Record<string, string>>;
  /** Spells and cantrips learned at this level. */
  readonly learned?: readonly string[];
  readonly asi?: { readonly abilities: readonly Ability[] } | { readonly feat: string };
};

/** What this level is going to ask before it can be taken. */
export const asksFor = (klass: string, classLevel: number): Grant[] =>
  grantsAt(klass, classLevel).filter((g) => g.kind !== "hp");

/** The default answer for hit points: the average, which nobody has to throw. */
export const defaultHp = (klass: string): number => averageHp(rulesFor(klass).hitDie);

/**
 * Take a level. This is the only way a character grows, and it is also how a
 * character joins mid-campaign — `levelsTo` just calls it repeatedly.
 */
export function takeLevel(build: Build, taken: LevelTaken): Build {
  const existing = build.classes.find((c) => c.id === taken.klass);
  const classes = existing === undefined
    ? [...build.classes, { id: taken.klass, level: 1, subclass: taken.subclass ?? null }]
    : build.classes.map((c) =>
        c.id === taken.klass
          ? { ...c, level: taken.classLevel, subclass: taken.subclass ?? c.subclass }
          : c,
      );

  /*
   * An improvement is appended, never applied. `scores` stays what the person
   * assigned and `scoresOf` does the arithmetic — so the builder's answer for
   * a character joining at level 8 and the level-up's answer at level 8 are
   * entries in the same list, read by the same function.
   */
  /*
   * `hp` records the levels AFTER the character's first, because the first
   * takes the whole die and is never a throw. Recording it anyway put the two
   * doors out of step: joining at five wrote five entries and growing to five
   * wrote four, and every entry after that meant a different level.
   */
  const already = build.classes.reduce((n, c) => n + c.level, 0);
  /* A dip's class joins the list, so `maxHitPoints` reads its own die from
     `rulesFor` on every later recount — the recorded roll is what changes. */

  return {
    ...build,
    classes,
    ...(taken.subclassName === undefined
      ? {}
      : { names: { ...build.names, subclass: taken.subclassName } }),
    level: classes.reduce((n, c) => n + c.level, 0),
    hp: already === 0 ? build.hp : [...build.hp, taken.hp],
    ...(taken.picks === undefined ? {} : { picks: { ...build.picks, ...taken.picks } }),
    ...(taken.learned === undefined ? {} : { spells: [...build.spells, ...taken.learned] }),
    improvements: taken.asi === undefined ? build.improvements : [...build.improvements, taken.asi],
  };
}

/**
 * The levels a character needs to reach a target, in one class.
 *
 * Joining at level 7 is taking six levels. There is no second code path for
 * "start above one", which is the whole point — see progression.ts.
 */
export function levelsTo(klass: string, from: number, to: number): LevelTaken[] {
  const out: LevelTaken[] = [];
  for (let l = from + 1; l <= to; l++) out.push({ klass, classLevel: l, hp: defaultHp(klass) });
  return out;
}

export const isTake = (e: Event): boolean => e.kind === TAKE;

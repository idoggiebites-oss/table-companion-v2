import type { Event } from "../../core/types";
import { fold } from "../../core/fold";
import { live, type Clock } from "../../core/log";
import { BLANK, type Scores } from "../../rules/5e/abilities";
import type { Method } from "../../rules/5e/pointbuy";
import type { StepId } from "../../rules/5e/steps";
import type { Worn } from "../../rules/5e/armour";
import type { Stack } from "../../rules/5e/items";
import { NO_GRANT, type Grant, type Source } from "./proficiency";
import { type Improvement } from "./scores";
/* Straight from the leaf, not through `scores`: see the note in heritage.ts. */
import { NO_HERITAGE, type Heritage } from "./heritage";
import { NO_INNATE, type InnateCasting } from "../../content/innate";
import { NO_SENSES, type Senses } from "../../content/senses";
import type { FeatEffects } from "../../rules/5e/feats";

import type { Offer } from "./offers";
import { TAKE, takeLevel, type LevelTaken } from "../progression/model";
import { allocate } from "./allocate";

/** Everything the builder has been told, and nothing it inferred. */
/** One class and how much of this character it accounts for. */
export type ClassLevel = { readonly id: string; readonly level: number; readonly subclass: string | null };

export type Build = {
  readonly race: string | null;
  readonly subrace: string | null;
  /** A character is not one class at one level. It is a list of them. */
  readonly classes: readonly ClassLevel[];
  readonly level: number;
  readonly method: Method;
  readonly scores: Scores;
  readonly background: string | null;
  readonly skills: readonly string[];
  /**
   * The fighting style a Fighter, Paladin or Ranger adopts. One, and only for
   * the classes that offer one — a Wizard is never asked.
   */
  readonly style: string | null;
  /**
   * What the person CHOSE at the proficiencies step. Not everything they hold
   * — read `languagesOf` and `toolsOf` for that.
   */
  readonly languages: readonly string[];
  readonly tools: readonly string[];
  /**
   * What each source handed over without being asked.
   *
   * Kept per source, and replaced wholesale when that source changes, for the
   * same reason `bonuses` is: a character who swaps a Criminal background for
   * an Acolyte one should stop owning thieves' tools. Merging the three into
   * one list makes that unwindable.
   *
   * Stored rather than derived because the sheet must not need the compendium
   * open to say what a character speaks — the same commitment `bonuses` makes.
   */
  readonly granted: Readonly<Record<Source, Grant>>;
  /**
   * The half the ancestry left to the player — 66 of 605 ancestries leave
   * ability points, 32 a skill, 4 a feat outright.
   *
   * V1's note, and V2 had the same hole: the builder applied the fixed half
   * and silently dropped the rest, so a Half-Elf arrived two points short of
   * what the book says. A Variant Human was worse — their fixed half is `{}`,
   * so they arrived with nothing at all.
   */
  readonly heritage: Heritage;
  readonly equipment: readonly string[];
  /**
   * The armour those lines name, resolved when they were chosen.
   *
   * Stored rather than derived for the reason `bonuses` and `granted` are: a
   * sheet must not need the compendium open to say what a character's armour
   * class is. The lines themselves are prose, and reading armour out of prose
   * is a build-time job.
   */
  readonly worn: readonly Worn[];
  /**
   * The weapons chosen to settle a category the equipment line left open —
   * "any martial weapon" is 250 things, and the line alone names none of them.
   *
   * Kept apart from `equipment` so re-answering replaces rather than piling
   * a second longsword onto the first.
   */
  readonly weapons: readonly string[];
  /**
   * Things picked up since — a reward, a purchase, a tarnished key the DM
   * handed over. What creation gave is still its own prose lines, resolved
   * against the catalogue by the screen that has one.
   */
  readonly stacks: readonly Stack[];
  /**
   * What is in hand and on the body, by item id.
   *
   * A SET held apart from the quantities rather than a flag on the stack:
   * equipping does not change how many you own, and a flag forces a stack of
   * two daggers to split the moment one is drawn.
   */
  readonly equipped: readonly string[];
  /**
   * What the class offers INSTEAD of the kit — "5d4x10" gold, stated by 50 of
   * them. Recorded, not offered as a mode: swapping the kit for gold is a
   * whole second flow, and saying the number beats saying nothing while
   * pretending the choice does not exist.
   */
  readonly wealth: string | null;
  readonly spells: readonly string[];
  /**
   * Every ability score improvement or feat this character has taken, in the
   * order taken, from BOTH doors: chosen at creation for a character joining
   * above level one, and appended by `takeLevel` on the way up.
   *
   * One list, because two were the drift. V1's builder stated the points a
   * level-8 character was owed and gave nowhere to spend them; V2 skipped the
   * question entirely, so a Fighter created at 8 arrived having passed 4, 6
   * and 8 with none of them spent. `scoresOf` and `featsOf` read this, and
   * nothing else writes a score.
   */
  readonly improvements: readonly Improvement[];
  /**
   * What was thrown for hit points, level by level after the first.
   *
   * Recorded and then ignored until now: the roll was written into the event
   * and `maxHitPoints` recomputed the average anyway, so a player who threw a
   * 10 on a d10 was given 6.
   */
  readonly hp: readonly number[];
  /**
   * Each class's own spell-slot table, keyed by class id.
   *
   * Stored rather than derived, for the reason every other grant is: the sheet
   * must not need the compendium open to say what a caster can cast. Written
   * by whichever choice learned the table and never cleared — a table is a
   * property of the class, not of this character's level.
   */
  readonly slots: Readonly<Record<string, readonly (readonly number[])[]>>;
  /**
   * Every question a class asked about itself, and the answer, keyed
   * `<classId>:<question>` — `sorcerer:Metamagic`, `fighter:Fighting Style`.
   *
   * One store, because a subclass, a fighting style, a sorcerer's Metamagic
   * and a warlock's Pact Boon are the same shape in the data. V2 had a
   * special case for two of them, so a sorcerer was never asked about
   * Metamagic and a warlock never about their Pact Boon.
   */
  readonly picks: Readonly<Record<string, string>>;
  /**
   * The features gained, level by level, already filtered to this character's
   * own subclasses. A ranger's class table carries 372 feature names by
   * level 8, of which 22 belong to the character holding the sheet.
   */
  readonly features: readonly { readonly level: number; readonly names: readonly string[] }[];
  /**
   * What the ancestry grants and when — a drow's Faerie Fire at 3rd. 119 of
   * 605 ancestries grant a spell and 36 grant one at a later level, and this
   * is the whole of racial progression.
   */
  readonly innate: InnateCasting;
  /** How far they see in the dark. 314 of 605 ancestries say. */
  readonly senses: Senses;
  /**
   * What each feat taken does to the numbers, keyed by name.
   *
   * The conclusion, not the prose: a feat's effect is stated in its text, and
   * that text costs 45KB across 850 feats. Derived at build time and recorded
   * with the choice, so the sheet never needs the compendium open to know a
   * Resilient character's saves.
   */
  readonly featEffects: Readonly<Record<string, FeatEffects>>;
  readonly identity: Readonly<Record<string, string>>;
  /**
   * What the person chose, in the words they saw.
   *
   * The build stores ids because ids are what the rules join on; a screen
   * needs the name. Deriving it later means holding the compendium open
   * forever, so the choice records both — "elf-high" and "High".
   */
  readonly names: Readonly<Record<string, string>>;
  /**
   * What the ancestry adds. Kept apart from `scores` because the two answer
   * different questions: `scores` is what the person assigned, `bonuses` is
   * what the book grants, and a sheet that shows only their sum cannot say
   * why a 15 became a 17.
   */
  readonly bonuses: Readonly<Record<string, number>>;
  readonly speed: number;
  /** Which steps have been answered, in the order they were answered. */
  readonly answered: readonly StepId[];
};

export const EMPTY: Build = {
  race: null, subrace: null, classes: [], level: 1,
  method: "point-buy", scores: BLANK, background: null,
  skills: [], style: null, languages: [], tools: [],
  granted: { race: NO_GRANT, klass: NO_GRANT, background: NO_GRANT },
  heritage: NO_HERITAGE,
  equipment: [], worn: [], weapons: [], stacks: [], equipped: [], wealth: null, spells: [], improvements: [], hp: [], slots: {},
  picks: {}, features: [], innate: NO_INNATE, senses: NO_SENSES, featEffects: {}, identity: {}, names: {},
  bonuses: {}, speed: 30, answered: [],
};

export const CHOICE = "creation.choose";


/** The primary class — the one the character started as. */
export const primary = (b: Build): string | null => b.classes[0]?.id ?? null;

export const totalLevel = (b: Build): number => b.classes.reduce((n, c) => n + c.level, 0) || b.level;

/**
 * The class that is owed a path but has not chosen one.
 *
 * This took an optional `Catalogue` to check the level as well, and no caller
 * ever passed one — the step list has already decided the question by the time
 * anything asks. Dropped rather than carried across a module split for the
 * sake of a branch nothing exercises.
 */
export const needsPath = (b: Build): ClassLevel | undefined =>
  b.classes.find((c) => c.subclass === null);

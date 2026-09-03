import { isMarked, type Provenance } from "./source";
import type { Granted } from "./proficiencies";
import type { BackgroundGrants } from "./background";
import type { GearLine } from "./starting";
import type { FreeBonus } from "./races";
import type { InnateCasting } from "./innate";
import type { Senses } from "./senses";
import type { FeatEffects } from "../rules/5e/feats";

/**
 * The compiled record. Provenance is REQUIRED, not optional — that is the
 * whole architectural commitment of this slice. V1 derived it at every call
 * site and fixed the resulting ordering bug twice, in two places. Here you
 * cannot construct a record without it, so a third occurrence is unwritable.
 */
export type Entry = {
  readonly id: string;
  readonly name: string;
  readonly kind: Kind;
  readonly provenance: Provenance;
};

export type Kind = "race" | "background" | "feat" | "spell" | "item" | "class" | "subclass" | "creature";

/**
 * An ancestry carries the names of what it grants — Darkvision, Fey Ancestry,
 * Trance — so a person can see what a choice means before making it. Names
 * only: the prose lives in the detail chunk.
 */
export type RaceEntry = Entry & {
  readonly kind: "race";
  readonly traits: readonly string[];
  /** What the ancestry adds to the scores a person assigned. */
  readonly bonuses: Readonly<Record<string, number>>;
  readonly speed: number;
  readonly size: string;
  /** What the ancestry lets you speak, and how many more you choose. */
  readonly languages: Granted;
  /**
   * The half the ancestry leaves to the player: a Half-Elf's two points, a
   * Variant Human's two points, skill and feat. Absent for the ancestries
   * that decide everything themselves, which is most of them.
   */
  readonly free?: FreeBonus;
  readonly freeSkills?: number;
  readonly grantsFeat?: boolean;
  /**
   * Spells the ancestry grants, and at which level. 119 of 605 grant one and
   * 36 grant one at a LATER level — a drow's Faerie Fire at 3rd. This is the
   * whole of racial progression.
   */
  readonly innate?: InnateCasting;
  /** How far they see in the dark, and what it costs them in daylight. */
  readonly senses?: Senses;
};

/**
 * A class carries everything a first-level character is handed: the skills it
 * offers and how many, what it can wear and swing, its tools, and the lines of
 * its equipment list. All read from the class's own `Starting <Class>` feature
 * at compile time — V2 shipped for a while with a three-weapon table hardcoded
 * for four classes and "choose 2" for everyone, and a Rogue chooses four.
 */
export type ClassEntry = Entry & {
  readonly kind: "class";
  readonly skills: readonly string[];
  readonly skillCount: number;
  readonly armor: readonly string[];
  readonly weapons: readonly string[];
  readonly tools: Granted;
  readonly gear: readonly GearLine[];
  /**
   * Spell slots by character level, the class's own table. Absent for the ten
   * that never cast — which is not the same as a row of zeroes at level one,
   * because a paladin has one of those and does cast.
   */
  readonly slots?: readonly (readonly number[])[];
  /** "5d4x10" — what to roll if they take gold instead of the kit. */
  readonly wealth?: string;
};

/**
 * A background states two skills structurally, and its languages and tools in
 * prose. Both are read here, once, rather than at the moment a screen wants
 * to draw them.
 */
export type BackgroundEntry = Entry & {
  readonly kind: "background";
  readonly skills: readonly string[];
  readonly grants: BackgroundGrants;
};

/** A feat carries what it asks of you, which V2 offered to everybody. */
export type FeatEntry = Entry & {
  readonly kind: "feat";
  readonly prerequisite?: string;
  /** What it does to the numbers, derived at build time from its prose. */
  readonly effects?: FeatEffects;
};

/** A spell carries the third axis: whether it is a spell at all. */
export type SpellEntry = Entry & {
  readonly kind: "spell";
  readonly level: number;
  readonly school: string;
  readonly classes: readonly string[];
  /** 1,494 of 3,443 entries in a real compendium are not spells. */
  readonly isFeature: boolean;
};

/** What a list screen needs. The prose lives in the detail chunk. */
export type Index = Entry | SpellEntry | ClassEntry | BackgroundEntry | RaceEntry | FeatEntry;

/** The game's own first, then by book, then by name. One comparator, one place. */
export function byProvenance(a: Entry, b: Entry): number {
  const own = Number(isMarked(a.provenance)) - Number(isMarked(b.provenance));
  if (own !== 0) return own;
  if (a.provenance.order !== b.provenance.order) return a.provenance.order - b.provenance.order;
  return a.name.localeCompare(b.name);
}


/**
 * A creature, as a staging list needs one.
 *
 * Names and numbers only — the statblock itself is 6,633 documents and lives
 * in the detail chunk. Provenance is present but nearly useless here: 33 of
 * the 6,633 carry a `Source:` line, so this list is sorted by NAME rather
 * than by book, and `cr` is carried as a number so a DM can sort or filter by
 * it without re-parsing a string at runtime.
 */
export type CreatureEntry = Entry & {
  readonly kind: "creature";
  /** Challenge rating, already a number: 0.125 rather than "1/8". */
  readonly cr: number;
  readonly type: string;
  readonly size: string;
  readonly ac: number;
  readonly hp: number;
  /** How many legendary actions a round, zero for most. Derived at build. */
  readonly legendary: number;
  /** Whether the creature's lair acts on its own count. */
  readonly lair: boolean;
};

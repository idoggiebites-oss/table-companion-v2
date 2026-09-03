import type { Entry, SpellEntry, ClassEntry, BackgroundEntry, RaceEntry } from "../../content/schema";
import type { Armour } from "../../content/armour";
import type { ToolKind } from "../../content/proficiencies";
import type { Option } from "../../ui/step/Choices";

export type { Armour };

/** What a class offers as a path, and the level it offers it. */
export type Paths = Record<string, { grant: string; level: number; options: Entry[] }>;

/**
 * Every question a class asks about itself, keyed by class — a subclass, a
 * fighting style, a sorcerer's Metamagic, a warlock's Pact Boon. One shape in
 * the data, so one shape here.
 */
export type Choices = Record<string, { of: string; level: number; options: Entry[] }[]>;

/** Fighting styles, keyed the same way and for the same reason. */
export type Styles = Record<string, { level: number; options: Entry[] }>;

/** The 27 suits and shields a starting equipment line can name. */

/** A weapon a category can resolve to — "any martial weapon" is 250 of these. */
export type Weapon = {
  readonly id: string;
  readonly name: string;
  readonly weapon: "Simple" | "Martial";
  readonly range?: "Melee" | "Ranged";
  readonly damage: string;
};

/** The 54 things a proficiency can name. */
export type Tool = { readonly id: string; readonly name: string; readonly kind: ToolKind | null };

export type Loaded = {
  readonly races: readonly RaceEntry[];
  readonly classes: readonly ClassEntry[];
  readonly backgrounds: readonly BackgroundEntry[];
  readonly spells: readonly SpellEntry[];
  readonly paths: Paths;
  readonly styles: Styles;
  readonly tools: readonly Tool[];
  readonly armour: readonly Armour[];
  /** Feats, for a variant human's gift and for an improvement spent on one. */
  readonly feats: readonly Entry[];
  readonly choices: Choices;
  readonly weapons: readonly Weapon[];
};

const MARK: Readonly<Record<string, string>> = { homebrew: "Homebrew", indie: "Third party", ua: "Unearthed Arcana" };
export const markOf = (e: Entry): string | undefined => MARK[e.provenance.tier];

export const toOption = (e: Entry, role?: string, tags?: readonly string[]): Option => ({
  id: e.id, name: e.name,
  ...(role === undefined ? {} : { role }),
  ...(tags === undefined ? {} : { tags }),
  ...(markOf(e) === undefined ? {} : { mark: markOf(e)! }),
});

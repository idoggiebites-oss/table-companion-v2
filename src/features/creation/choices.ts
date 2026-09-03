import type { Event } from "../../core/types";
import type { Scores } from "../../rules/5e/abilities";
import type { Method } from "../../rules/5e/pointbuy";
import type { Grant } from "./proficiency";
import type { Heritage, Improvement } from "./scores";
import type { Worn } from "../../rules/5e/armour";
import type { Stack } from "../../rules/5e/items";
import type { InnateCasting } from "../../content/innate";
import type { Senses } from "../../content/senses";
import type { FeatEffects } from "../../rules/5e/feats";

/** Which character a choice belongs to. A device holds more than one. */
export type CharacterId = string;
export const characterOf = (e: Event): CharacterId | null => {
  const c = e.data["character"];
  return typeof c === "string" ? c : null;
};

/**
 * Every choice is an event. There is no other way to change a build.
 *
 * `name` rides along on any choice that picked something from a list: the
 * words the person saw, so a screen never has to hold the compendium open to
 * say "High Elf" instead of "elf-high".
 */
export type Named = { readonly name?: string };

export type Choice = Named & (
  | { readonly step: "ancestry"; readonly race: string;
      readonly bonuses?: Readonly<Record<string, number>>; readonly speed?: number;
      readonly grant?: Grant; readonly innate?: InnateCasting; readonly senses?: Senses }
  | { readonly step: "subrace"; readonly subrace: string;
      readonly bonuses?: Readonly<Record<string, number>>; readonly speed?: number;
      readonly grant?: Grant; readonly innate?: InnateCasting; readonly senses?: Senses }
  | { readonly step: "class"; readonly klass: string; readonly grant?: Grant;
      readonly slots?: readonly (readonly number[])[]; readonly wealth?: string }
  | { readonly step: "level"; readonly level: number }
  | { readonly step: "multiclass"; readonly classes: readonly { readonly id: string; readonly level: number }[];
      readonly slots?: Readonly<Record<string, readonly (readonly number[])[]>> }
  | { readonly step: "subclass"; readonly subclass: string; readonly klass?: string }
  | { readonly step: "abilities"; readonly method: Method; readonly scores: Scores }
  | { readonly step: "background"; readonly background: string; readonly grant?: Grant }
  | { readonly step: "skills"; readonly skills: readonly string[] }
  | { readonly step: "style"; readonly style: string }
  | { readonly step: "picks"; readonly picks: Readonly<Record<string, string>> }
  | { readonly step: "features";
      readonly features: readonly { readonly level: number; readonly names: readonly string[] }[] }
  | { readonly step: "proficiencies"; readonly languages: readonly string[]; readonly tools: readonly string[] }
  | { readonly step: "equipment"; readonly equipment: readonly string[]; readonly worn?: readonly Worn[] }
  | { readonly step: "weapons"; readonly weapons: readonly string[] }
  /**
   * What is in hand and on the body, after a change at the table.
   *
   * The whole resulting set, not a toggle: putting on a greatsword empties
   * the other hand, and recording "equipped the greatsword" would leave the
   * reducer to work out that the shield went away — which needs the catalogue
   * the screen has and the fold does not. The screen decides; the event says
   * what was decided; the log shows the shield going.
   */
  | { readonly step: "wear"; readonly equipped: readonly string[];
      readonly worn: readonly Worn[]; readonly said?: string }
  | { readonly step: "carry"; readonly stacks: readonly Stack[]; readonly said?: string }
  | { readonly step: "spells"; readonly spells: readonly string[] }
  | { readonly step: "improvements"; readonly improvements: readonly Improvement[];
      readonly featEffects?: Readonly<Record<string, FeatEffects>> }
  | { readonly step: "heritage"; readonly heritage: Heritage;
      readonly featEffects?: Readonly<Record<string, FeatEffects>> }
  | { readonly step: "identity"; readonly identity: Readonly<Record<string, string>> });

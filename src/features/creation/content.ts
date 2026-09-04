import type { Option, Group } from "../../ui/step/Choices";
import type { Asking, Catalogue } from "./facts";
import type { Build } from "./model";
import type { Grant } from "./proficiency";
import type { Worn } from "../../rules/5e/armour";
import type { InnateCasting } from "../../content/innate";
import type { Senses } from "../../content/senses";
import type { FeatEffects } from "../../rules/5e/feats";
import { NO_OFFER } from "./offers";
import { facetsOf } from "../../rules/5e/classes";
import { iconForClass } from "../../ui/Icon";

export type { Asking };
import type { StepId } from "../../rules/5e/steps";

/** What each step needs from the compendium. One shape, three layers behind it. */
export type CreationContent = Catalogue & {
  optionsFor(step: StepId, build: Asking): readonly Option[];
  /**
   * For the steps that are several questions at once — equipment, and
   * languages and tools. `undefined` for every step that is one question.
   */
  groupsFor?(step: StepId, build: Build): readonly Group[] | undefined;
  skillLimit(build: { klass: string | null; background: string | null }): number;
  detailFor(
    step: StepId,
    ids: readonly string[],
    /** A lineage means nothing without the ancestry it belongs to. */
    build?: { readonly race: string | null },
  ): { label: string; lead?: string; lines?: readonly string[] } | undefined;
  /** What this class calls its path — "Arcane Tradition", "Sacred Oath". */
  grantFor?(classId: string): string | undefined;
  /** What choosing this hands over without being asked. */
  grantOf?(step: StepId, id: string): Grant;
  /** What an ancestry grants in spells, and at which level. */
  innateOf?(step: StepId, id: string): InnateCasting | undefined;
  /** What a feat does to the numbers, by id. */
  effectsOf?(featId: string): FeatEffects;
  /** How far this ancestry sees in the dark. */
  sensesOf?(step: StepId, id: string): Senses | undefined;
  /** The armour a set of chosen equipment lines names. */
  wornIn?(lines: readonly string[]): readonly Worn[];
};

const RACES: Option[] = [
  { id: "dwarf", name: "Dwarf" }, { id: "elf", name: "Elf" }, { id: "halfling", name: "Halfling" },
  { id: "human", name: "Human" }, { id: "dragonborn", name: "Dragonborn" }, { id: "tiefling", name: "Tiefling" },
];

const LINEAGES: Record<string, Option[]> = {
  elf: [{ id: "high-elf", name: "High Elf" }, { id: "wood-elf", name: "Wood Elf" }, { id: "drow", name: "Drow" }],
  dwarf: [{ id: "hill-dwarf", name: "Hill Dwarf" }, { id: "mountain-dwarf", name: "Mountain Dwarf" }],
};

/*
 * Built from `CLASS_BLURB` rather than restated. This list held its own copy
 * of the same roles and tags, so a sentence added in one place would have been
 * missing in the other — and this is the list a person sees when no compendium
 * has loaded, which is the worst place to lose it.
 */
const CLASSES: Option[] = ["wizard", "fighter", "rogue", "cleric", "ranger"].map((id) => ({
  id, name: `${id[0]!.toUpperCase()}${id.slice(1)}`,
  ...facetsOf(id), icon: iconForClass(id),
}));

const PATHS: Record<string, Option[]> = {
  cleric: [{ id: "life", name: "Life Domain", role: "Healing and protection" },
           { id: "light", name: "Light Domain", role: "Radiance and fire" }],
};

const BACKGROUNDS: Option[] = [
  { id: "sage", name: "Sage", role: "Years in libraries and institutions" },
  { id: "soldier", name: "Soldier", role: "A rank, and the people who kept it" },
  { id: "criminal", name: "Criminal", role: "Work nobody wrote down" },
];

const SKILLS: Option[] = [
  { id: "acrobatics", name: "Acrobatics (Dex)" }, { id: "arcana", name: "Arcana (Int)" },
  { id: "athletics", name: "Athletics (Str)" }, { id: "deception", name: "Deception (Cha)" },
  { id: "history", name: "History (Int)" }, { id: "insight", name: "Insight (Wis)" },
  { id: "investigation", name: "Investigation (Int)" },
];

const GEAR: Option[] = [
  { id: "quarterstaff", name: "Quarterstaff", role: "1d6 bludgeoning · versatile" },
  { id: "dagger", name: "Dagger", role: "1d4 piercing · finesse, light" },
  { id: "sling", name: "Sling", role: "1d4 bludgeoning · ranged (30/120)" },
];

const SPELLS: Option[] = [
  { id: "fire-bolt", name: "Fire Bolt", role: "Evocation cantrip · 1d10 fire" },
  { id: "mage-hand", name: "Mage Hand", role: "Conjuration cantrip · utility" },
  { id: "prestidigitation", name: "Prestidigitation", role: "Transmutation cantrip · utility" },
  { id: "ray-of-frost", name: "Ray of Frost", role: "Evocation cantrip · 1d8 cold" },
];

const NAME = (list: readonly Option[], id: string) => list.find((o) => o.id === id)?.name ?? id;

/**
 * The SRD-shaped fallback. A deployment without a compendium runs on this and
 * every screen works — absent is normal, and it is the only redistributable
 * configuration.
 */
export const SRD_ONLY: CreationContent = {
  hasSubraces: (race) => race in LINEAGES,
  casterAtFirst: (klass) => klass === "wizard" || klass === "cleric",
  subclassAtLevel: (klass) => (klass === "cleric" ? 1 : klass === "wizard" ? 2 : 3),
  skillLimit: () => 2,
  // Nothing in the SRD-shaped fallback offers a fighting style or leaves a
  // language open, so neither step ever arrives. Absent is normal.
  styleAtLevel: () => Number.POSITIVE_INFINITY,
  cantripsFor: () => 3,
  openQuestions: () => [],
  slotTableFor: () => undefined,
  proficienciesFor: () => NO_OFFER,
  // The SRD-shaped fallback carries no trait prose, so nothing is left open.
  heritageFor: () => ({ points: 0, skills: 0, feat: false }),
  grantFor: (klass) => (klass === "cleric" ? "Divine Domain" : undefined),
  optionsFor(step, build) {
    switch (step) {
      case "ancestry": return RACES;
      case "subrace": return build.race === null ? [] : (LINEAGES[build.race] ?? []);
      case "class": return CLASSES;
      case "subclass": return build.klass === null ? [] : (PATHS[build.klass] ?? []);
      case "background": return BACKGROUNDS;
      case "skills": return SKILLS;
      default: return [];
    }
  },

  /**
   * The steps that ask several questions at once must be answered here too.
   *
   * Seven of them moved to `groupsFor` and this was not one of the things that
   * moved, so a deployment with no compendium — the only redistributable
   * configuration, and a supported one — showed an EMPTY Spells step and an
   * empty Equipment step, with Continue enabled because a screen of no pools
   * is trivially satisfied. Absent is normal; empty is not.
   */
  groupsFor(step) {
    if (step === "spells") {
      return [{ id: "cantrips", label: "Cantrips", limit: 3, note: "choose 3", options: SPELLS }];
    }
    if (step === "equipment") {
      return [{ id: "gear-0", label: "Choice 1", limit: 1, options: GEAR }];
    }
    // Heritage, class questions, weapons and proficiencies never arrive here:
    // the fallback carries no trait prose and no class feature list.
    return [];
  },
  detailFor(step, ids) {
    const id = ids[0];
    if (id === undefined) return undefined;
    switch (step) {
      case "ancestry": return { label: `${NAME(RACES, id)} traits`, lines: ["Darkvision", "Fey ancestry", "Trance", "Keen senses"] };
      case "class": return { label: NAME(CLASSES, id), lead: CLASSES.find((c) => c.id === id)?.role ?? "", lines: ["Hit die d6", "Saves: Intelligence, Wisdom"] };
      case "background": return { label: NAME(BACKGROUNDS, id), lead: "You gain", lines: ["Arcana, History", "Researcher's pack", "Two languages"] };
      case "skills": return undefined;
      default: return undefined;
    }
  },
};

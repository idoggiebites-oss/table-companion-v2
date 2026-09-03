import type { Event } from "../../core/types";
import { takeLevel, TAKE, type LevelTaken } from "../progression/model";
import { allocate } from "./allocate";
import { NO_GRANT } from "./proficiency";
import { NO_HERITAGE } from "./scores";
import { NO_INNATE } from "../../content/innate";
import { NO_SENSES } from "../../content/senses";
import { CHOICE, needsPath, type Build } from "./model";
import type { Choice } from "./choices";
import type { StepId } from "../../rules/5e/steps";

const remember = (b: Build, step: StepId): readonly StepId[] =>
  b.answered.includes(step) ? b.answered : [...b.answered, step];

/**
 * Every choice is an event, and this is the only thing that reads one.
 *
 * Growing is folded here too, so there is one build and one history: a
 * character who joined at five and one who grew to five are the same fold over
 * the same kinds of event.
 */
export function reduce(b: Build, e: Event): Build {
  if (e.kind === TAKE) return takeLevel(b, e.data as unknown as LevelTaken);
  if (e.kind !== CHOICE) return b;
  const c = e.data as unknown as Choice;
  const answered = remember(b, c.step);
  const said = e.data["name"];
  if (typeof said === "string") b = { ...b, names: { ...b.names, [c.step]: said } };
  switch (c.step) {
    /*
     * Changing the ancestry drops everything the old one gave: a lineage that
     * no longer applies, the points it left open, its spells and its eyes.
     * `diffSteps` reports the removal rather than letting it happen silently.
     */
    case "ancestry": return {
      ...b, race: c.race, subrace: null,
      bonuses: c.bonuses ?? {}, speed: c.speed ?? 30,
      granted: { ...b.granted, race: c.grant ?? NO_GRANT },
      heritage: NO_HERITAGE,
      innate: c.innate ?? NO_INNATE,
      senses: c.senses ?? NO_SENSES,
      answered,
    };
    case "subrace": return {
      ...b, subrace: c.subrace,
      // A lineage states the whole grant, not a delta on the ancestry's.
      ...(c.bonuses === undefined ? {} : { bonuses: c.bonuses }),
      ...(c.speed === undefined ? {} : { speed: c.speed }),
      ...(c.grant === undefined ? {} : { granted: { ...b.granted, race: c.grant } }),
      ...(c.innate === undefined ? {} : { innate: c.innate }),
      ...(c.senses === undefined ? {} : { senses: c.senses }),
      answered,
    };
    // A new first class replaces the lot: the levels were placed in classes
    // that are no longer there.
    case "class": return {
      ...b, classes: [{ id: c.klass, level: b.level, subclass: null }],
      granted: { ...b.granted, klass: c.grant ?? NO_GRANT },
      wealth: c.wealth ?? null,
      ...(c.slots === undefined ? {} : { slots: { ...b.slots, [c.klass]: c.slots } }),
      answered,
    };
    case "level": {
      const first = b.classes[0];
      if (first === undefined) return { ...b, level: c.level, answered };
      // Every level in the first class until the person says otherwise.
      return { ...allocate(b, [{ id: first.id, level: c.level }]), level: c.level, answered };
    }
    case "multiclass": return {
      ...allocate(b, c.classes), level: b.level,
      ...(c.slots === undefined ? {} : { slots: { ...b.slots, ...c.slots } }),
      answered,
    };
    case "subclass": return {
      ...b,
      classes: b.classes.map((x) =>
        x.id === (c.klass ?? needsPath(b)?.id) ? { ...x, subclass: c.subclass } : x,
      ),
      answered,
    };
    case "abilities": return { ...b, method: c.method, scores: c.scores, answered };
    case "background": return {
      ...b, background: c.background,
      granted: { ...b.granted, background: c.grant ?? NO_GRANT }, answered,
    };
    case "skills": return { ...b, skills: [...c.skills], answered };
    case "style": return { ...b, style: c.style, answered };
    case "picks": return { ...b, picks: { ...b.picks, ...c.picks }, answered };
    case "features": return { ...b, features: [...c.features], answered };
    case "proficiencies": return { ...b, languages: [...c.languages], tools: [...c.tools], answered };
    // A new equipment answer drops the weapons that settled the old one.
    case "equipment": return {
      ...b, equipment: [...c.equipment], worn: [...(c.worn ?? [])], weapons: [], answered,
    };
    case "weapons": return { ...b, weapons: [...c.weapons], answered };
    /* Armour class follows what is worn, so the armour records travel with
       the change rather than being re-derived from a catalogue the sheet does
       not hold. */
    case "wear": return { ...b, equipped: [...c.equipped], worn: [...c.worn], answered: b.answered };
    case "carry": return { ...b, stacks: [...c.stacks], answered: b.answered };
    case "spells": return { ...b, spells: [...c.spells], answered };
    // Replaces rather than appends: this is the answer to "what did you spend
    // the improvements you have already passed on", and it is re-answerable.
    case "improvements": return {
      ...b, improvements: [...c.improvements],
      featEffects: { ...b.featEffects, ...(c.featEffects ?? {}) }, answered,
    };
    case "heritage": return {
      ...b, heritage: c.heritage,
      featEffects: { ...b.featEffects, ...(c.featEffects ?? {}) }, answered,
    };
    case "identity": return { ...b, identity: { ...b.identity, ...c.identity }, answered };
  }
}

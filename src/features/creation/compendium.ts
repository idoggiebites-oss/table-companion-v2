import type { Entry, ClassEntry, BackgroundEntry, RaceEntry } from "../../content/schema";
import { byProvenance } from "../../content/schema";
import { toOption, type Loaded, type Armour, type Paths, type Styles, type Tool, type Choices, type Weapon } from "./loaded";

export type { Loaded, Armour, Paths, Styles, Tool, Choices, Weapon };
import type { ToolKind } from "../../content/proficiencies";
import { wornFrom } from "../../content/armour";
import { groupsFrom } from "./groups";
import { offerFrom, grantFrom } from "./offers";
import type { Asking } from "./facts";
import type { Build } from "./model";
import { bookName } from "../../content/books";
import { isMarked } from "../../content/source";
import { spellsFrom } from "./spells";
import type { Option, Group } from "../../ui/step/Choices";
import type { CreationContent } from "./content";
import { groupAncestries, hasLineages, lineageLabel, baseName, type Ancestry } from "./lineage";
import { detailFor } from "./detail";
import { rulesFor, isFamiliar, facetsOf } from "../../rules/5e/classes";
import { SKILLS } from "../../rules/5e/skills";
import { cantripsKnown } from "../../rules/5e/casting";
import { featsFrom } from "./feats";
import type { FeatEffects } from "../../rules/5e/feats";
import { multiclassGrant } from "../../rules/5e/multiclassing";
import { ABILITIES, ABILITY_NAME } from "../../rules/5e/abilities";
import { key } from "../../content/names";
import { iconForClass } from "../../ui/Icon";
import { portraitFor } from "./portraits";
import { STYLE } from "../../content/choicepoints";

/**
 * A CreationContent over the compiled compendium.
 *
 * Everything here reads a resolved field. Nothing re-parses a name: the three
 * axes were settled in the build, which is the whole point of slice 2.
 */
export function contentFrom(loaded: Loaded, opts: { onlyGames: boolean }): CreationContent {
  // Hide only what is positively marked. `unknown` stays: the twelve core
  // classes carry no source line at all, and filtering on "official" alone
  // removed every one of them from the list.
  const keep = <T extends Entry>(rows: readonly T[]): T[] =>
    (opts.onlyGames ? rows.filter((r) => !isMarked(r.provenance)) : [...rows]).sort(byProvenance);

  const ancestries = groupAncestries(keep(loaded.races), (r) => r.provenance.order);
  const byAncestry = new Map<string, Ancestry<Entry>>(ancestries.map((a) => [a.id, a]));

  const classes = keep(loaded.classes);
  const familiarFirst = [...classes].sort(
    (a, b) => Number(isFamiliar(key(b.name))) - Number(isFamiliar(key(a.name))) || byProvenance(a, b),
  );

  const cantrips = keep(loaded.spells).filter((s) => !s.isFeature && s.level === 0);
  const classOf = (id: string | null): ClassEntry | undefined =>
    id === null ? undefined : loaded.classes.find((c) => c.id === id);
  const bgOf = (id: string | null): BackgroundEntry | undefined =>
    id === null ? undefined : loaded.backgrounds.find((b) => b.id === id);
  const offer = offerFrom(loaded);
  const granted = grantFrom(loaded);
  /* The lineage speaks, not the group: a Half-Elf's two points are the
     Half-Elf's. Falling back covers ancestries with no lineages. */
  const raceOf = (b: Asking): RaceEntry | undefined =>
    loaded.races.find((r) => r.id === (b.subrace ?? b.race));
  const nameOfClass = (id: string) => loaded.classes.find((c) => c.id === id)?.name ?? id;
  /*
   * Every question this character's classes have opened and not answered — a
   * sorcerer's Metamagic at 3, a warlock's Pact Boon, a ranger's Deft
   * Explorer. The subclass has a step of its own, so it is left out here.
   */
  const openQuestions = (b: Build) => {
    const out: { key: string; klass: string; of: string; level: number }[] = [];
    for (const c of b.classes) {
      // Two questions already have screens of their own.
      const own = [loaded.paths[c.id]?.grant, loaded.styles[c.id] === undefined ? undefined : STYLE];
      for (const p of loaded.choices[c.id] ?? []) {
        if (own.includes(p.of) || p.level > c.level) continue;
        out.push({ key: `${c.id}:${p.of}`, klass: c.id, of: p.of, level: p.level });
      }
    }
    return out;
  };
  const heritageFor = (b: Asking) => {
    const r = raceOf(b);
    return {
      points: (r?.free?.count ?? 0) * (r?.free?.each ?? 1),
      skills: r?.freeSkills ?? 0,
      feat: r?.grantsFeat === true,
    };
  };
  const { forClass, spellOptions, spellsAt } = spellsFrom(loaded, keep);
  const featOptions = featsFrom(loaded, keep);
  const groupsFor = groupsFrom({
    loaded, keep, offer, classOf, bgOf, heritageFor, nameOfClass, openQuestions,
    cantripsFor: (id, level) => cantripsKnown(key(id), level),
    spellOptions,
    featOptions,
    weaponsIn: (weapon, range) => loaded.weapons
      .filter((w) => w.weapon === weapon && (range === null || w.range === range))
      .map((w) => ({ id: w.id, name: w.name, ...(w.damage === "" ? {} : { role: w.damage }) })),
  });
  /** "a mace" → "A mace". The book lower-cases mid-sentence; a row is not one. */
  const titled = (said: string) => said.charAt(0).toUpperCase() + said.slice(1);

  return {
    hasSubraces: (id) => hasLineages(byAncestry.get(id)),
    casterAtFirst: (id) => rulesFor(key(id)).casterAtFirst,
    // A class with no paths in the data is never asked for one: a step with
    // nothing in it is a dead end, not a question.
    subclassAtLevel: (id) => loaded.paths[id]?.level ?? Number.POSITIVE_INFINITY,
    // Data, not a table. A class that never lists one is never asked.
    styleAtLevel: (id) => loaded.styles[id]?.level ?? Number.POSITIVE_INFINITY,
    // The class's own number. Three was the wizard's, given to six others.
    cantripsFor: (id, level) => cantripsKnown(key(id), level),

    /*
     * Every question this character's classes have opened and not answered —
     * a sorcerer's Metamagic at 3, a warlock's Pact Boon, a ranger's Deft
     * Explorer. The subclass has its own step, so it is left out here.
     */
    openQuestions,
    slotTableFor: (id) => classOf(id)?.slots,
    hitDieFor: (id) => rulesFor(key(id)).hitDie,
    wealthFor: (id) => classOf(id)?.wealth,

    /* The questions this level OPENS, not every one the class has. The
       subclass has its own control on that screen. */
    questionsAt: (id, level) =>
      (loaded.choices[id] ?? [])
        .filter((p) => p.level === level && p.of !== loaded.paths[id]?.grant)
        .map((p) => ({ of: p.of, options: keep(p.options).map((o) => toOption(o)) })),

    spellsAt,
    proficienciesFor: offer,
    heritageFor,
    // The book's own number: a Rogue chooses four and a Ranger three. V2 asked
    // everybody for two, which is the Fighter's answer given to eleven classes.
    skillLimit: (b) => classOf(b.klass)?.skillCount ?? 2,

    optionsFor(step, build) {
      switch (step) {
        case "ancestry":
          return ancestries.map((a) => {
            // The group borrows its first lineage's face — a Dwarf card shows
            // a Hill Dwarf, because "Dwarf" has no portrait of its own.
            const first = a.lineages[0];
            const art =
              portraitFor(a.name) ??
              (first === undefined ? undefined : portraitFor(a.name, lineageLabel(a.name, first.name)));
            // What the group grants comes from the lineage a person will pick;
            // the ancestry card carries the first one's, so a single-lineage
            // ancestry is right without a second question.
            const g = first as { bonuses?: Record<string, number>; speed?: number } | undefined;
            return {
              id: a.id, name: a.name,
              // A group has no record of its own: its first lineage explains it.
              ...(first === undefined ? {} : { describe: first.id }),
              ...(art === undefined ? {} : { art }),
              ...(g?.bonuses === undefined ? {} : { bonuses: g.bonuses }),
              ...(g?.speed === undefined ? {} : { speed: g.speed }),
            };
          });
        case "subrace": {
          const a = build.race === null ? undefined : byAncestry.get(build.race);
          return a === undefined ? [] : a.lineages.map((l) => {
            const label = lineageLabel(a.name, l.name);
            const art = portraitFor(a.name, label);
            const g = l as unknown as { bonuses?: Record<string, number>; speed?: number };
            return {
              ...toOption(l), name: label,
              ...(art === undefined ? {} : { art }),
              ...(g.bonuses === undefined ? {} : { bonuses: g.bonuses }),
              ...(g.speed === undefined ? {} : { speed: g.speed }),
            };
          });
        }
        case "class":
          return familiarFirst.map((c) => {
            const id = key(c.name);
            return { ...toOption(c), ...facetsOf(id), icon: iconForClass(id) };
          });
        case "subclass": {
          const p = build.klass === null ? undefined : loaded.paths[build.klass];
          if (p === undefined) return [];
          // Grouped by the book that printed each, in publication order. The
          // grant is named once in the question, so the row carries only the
          // path's own name.
          return keep(p.options).map((o) => ({
            ...toOption(o),
            group: bookName(o.provenance.book),
            groupOrder: o.provenance.order,
          }));
        }
        case "background":
          return keep(loaded.backgrounds).map((b) =>
            toOption(b, b.provenance.book === null ? "Elsewhere" : b.provenance.source));
        case "skills": {
          /*
           * The class's own list, not all eighteen. A Wizard is offered six and
           * a Bard all of them, and the difference is the whole point of the
           * step — a Wizard proficient in Athletics did not come from the book.
           *
           * Anything the background or ancestry already granted is shown, and
           * shown as held: choosing it here would spend a pick on something
           * already owned, and hiding it would leave a person wondering where
           * their background's skills went.
           */
          const klass = classOf(build.klass);
          const bg = bgOf(build.background);
          const given = new Map<string, string>();
          for (const g of bg?.skills ?? []) given.set(key(g), bg?.name ?? "Background");
          /* The ancestry's half, which this comment has always promised and
             the code never delivered: `heritage.skills` was written by the
             heritage step and read by nobody, so a Half-Elf's two Skill
             Versatility picks were collected and silently dropped. */
          const from = baseName(raceOf(build)?.name ?? "") || "your ancestry";
          for (const g of build.heritage) given.set(key(g), from);
          const offered = klass === undefined || klass.skills.length === 0
            ? SKILLS
            : SKILLS.filter((k) => klass.skills.some((n) => key(n) === k.id));
          const rows = [...offered];
          // Held skills the class does not offer still belong on the sheet.
          for (const k of SKILLS) {
            if (given.has(k.id) && !rows.includes(k)) rows.push(k);
          }
          return rows.map((k) => ({
            id: k.id, name: `${k.name} (${k.ability.charAt(0).toUpperCase()}${k.ability.slice(1)})`,
            ...(given.has(k.id) ? { held: `From ${given.get(k.id)!}` } : {}),
          }));
        }
        case "feat":
          return featOptions(build);
        case "style": {
          const st = build.klass === null ? undefined : loaded.styles[build.klass];
          if (st === undefined) return [];
          return keep(st.options).map((x) => ({
            ...toOption(x),
            group: bookName(x.provenance.book),
            groupOrder: x.provenance.order,
          }));
        }
        // Equipment and proficiencies are several questions, not one, so they
        // are answered by `groupsFor`. A flat list of them would be a list of
        // options from different pools with no way to tell them apart.
        case "equipment":
        case "proficiencies":
          return [];
        case "spells":
          return forClass(build.klass, build.subclass).map((s) =>
            toOption(s, s.school === "" ? undefined : `${s.school} cantrip`));
        default:
          return [];
      }
    },

    groupsFor,

    grantFor: (classId) => loaded.paths[classId]?.grant,
    grantOf: granted,
    /* What the ancestry grants and WHEN — a drow's Faerie Fire at 3rd.
       Recorded with the choice, like every other grant. */
    innateOf: (step, id) =>
      step === "ancestry" || step === "subrace"
        ? loaded.races.find((r) => r.id === id)?.innate
        : undefined,
    effectsOf: (featId) =>
      (loaded.feats.find((f) => f.id === featId) as { effects?: FeatEffects } | undefined)?.effects ?? {},
    sensesOf: (step, id) =>
      step === "ancestry" || step === "subrace"
        ? loaded.races.find((r) => r.id === id)?.senses
        : undefined,
    // Prose in, armour out. The lines are the book's own words, so the suit
    // has to be found IN a sentence rather than looked up by id.
    wornIn: (lines) => wornFrom(lines, loaded.armour),

    detailFor: (step, ids, build) => detailFor(step, ids, build, { byAncestry, loaded }),
  };
}

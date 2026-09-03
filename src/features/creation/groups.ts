import type { Entry, ClassEntry, BackgroundEntry } from "../../content/schema";
import type { Group, Option } from "../../ui/step/Choices";
import { SKILLS } from "../../rules/5e/skills";
import { spellsAtCreation } from "../../rules/5e/casting";
import { categoriesIn } from "../../content/gear";
import { scoresOf } from "./scores";
import type { Scores } from "../../rules/5e/abilities";
import { ABILITIES, ABILITY_NAME } from "../../rules/5e/abilities";
import { multiclassGrant } from "../../rules/5e/multiclassing";
import { key } from "../../content/names";
import type { StepId } from "../../rules/5e/steps";
import { asking, type Asking } from "./facts";
import type { Build } from "./model";
import type { Offer } from "./offers";
import { toOption, type Loaded } from "./loaded";

type Deps = {
  readonly loaded: Loaded;
  keep<T extends Entry>(rows: readonly T[]): T[];
  offer(b: Asking): Offer;
  classOf(id: string | null): ClassEntry | undefined;
  bgOf(id: string | null): BackgroundEntry | undefined;
  heritageFor(b: Asking): { points: number; skills: number; feat: boolean };
  nameOfClass(id: string): string;
  openQuestions(b: Build): { key: string; klass: string; of: string; level: number }[];
  cantripsFor(classId: string, level: number): number;
  /** Spells of a given level this character could take. 0 means cantrips. */
  spellOptions(classId: string, subclass: string | null, level: number): readonly Option[];
  weaponsIn(weapon: "Simple" | "Martial", range: "Melee" | "Ranged" | null): readonly Option[];
  featOptions(b: Asking, scores: Scores): readonly Option[];
};

/**
 * The steps that are several questions at once.
 *
 * Equipment is one question per line of the class's list; proficiencies is one
 * per source, because the pools differ; heritage is one per thing the ancestry
 * left open. All three are "a run of small questions on one screen", which is
 * why they share a component and share this.
 */
export function groupsFrom(d: Deps) {
  const { loaded, keep, offer, classOf, bgOf, heritageFor, nameOfClass, openQuestions,
    cantripsFor, spellOptions, weaponsIn, featOptions } = d;
  /** "a mace" -> "A mace". The book lower-cases mid-sentence; a row is not one. */
  const titled = (said: string) => said.charAt(0).toUpperCase() + said.slice(1);

  /* The whole build, not just `Asking`: a class question depends on the level
     the class has reached and on what has already been answered. */
  return function groupsFor(step: StepId, whole: Build): readonly Group[] | undefined {
    const build = asking(whole);

      if (step === "equipment") {
        /* Read from the class's own Starting feature. The table this replaces
           held three weapons for four classes, and gave a Cleric a longsword. */
        const gear = classOf(build.klass)?.gear ?? [];
        return gear.map((line, i) => ({
          id: line.id,
          label: line.options.length > 1 ? `Choice ${String(i + 1)}` : "You also carry",
          ...(line.options.length > 1 ? {} : { note: "granted" }),
          limit: line.options.length > 1 ? 1 : 0,
          options: line.options.map((text, n) => ({
            id: `${line.id}:${String(n)}`, name: titled(text),
            ...(line.options.length > 1 ? {} : { held: "From your class" }),
          })),
        }));
      }
      if (step === "heritage") {
        /* The half the ancestry left open. A Half-Elf places two points and
           picks two skills; a Variant Human places two, picks a skill and
           takes a feat. Each is its own pool with its own count. */
        const h = heritageFor(build);
        const out: Group[] = [];
        if (h.points > 0) {
          out.push({
            id: "abilities", label: "Ability points", limit: h.points,
            note: `choose ${String(h.points)} — one point each`,
            options: ABILITIES.map((a) => ({ id: a, name: ABILITY_NAME[a] })),
          });
        }
        if (h.skills > 0) {
          const given = new Set(bgOf(build.background)?.skills.map((x) => key(x)) ?? []);
          out.push({
            id: "skills", label: "Skills", limit: h.skills,
            note: `choose ${String(h.skills)}`,
            options: SKILLS.filter((k) => !given.has(k.id))
              .map((k) => ({ id: k.id, name: k.name })),
          });
        }
        if (h.feat) {
          out.push({
            id: "feat", label: "A feat", limit: 1, note: "your ancestry grants one",
            // With what each asks of you: a variant human's granted feat is
            // still a feat they have to qualify for.
            options: featOptions(build, scoresOf(whole)),
          });
        }
        return out;
      }
      if (step === "mcskills") {
        /* One pool per later class that grants a skill. A bard's is any skill
           at all; a ranger's and a rogue's come from their own lists. */
        const out: Group[] = [];
        for (const c of build.classes ?? []) {
          const g = multiclassGrant(c)?.skills;
          if (g === undefined) continue;
          const pool = g.from.length === 0 ? SKILLS : SKILLS.filter((k) => g.from.includes(k.id));
          out.push({
            id: `mc-${c}`, label: nameOfClass(c), limit: g.choose,
            note: g.from.length === 0 ? "any skill" : "from its own list",
            options: pool.map((k) => ({ id: k.id, name: k.name })),
          });
        }
        return out;
      }
      if (step === "spells") {
      /*
       * Cantrips AND spells, as two pools. Asking only for cantrips left a
       * bard finishing creation knowing no spells while a bard grown to the
       * same level knew one — the two doors disagreeing, which is the whole
       * thing the progression seam exists to prevent.
       */
      const klass = build.klass;
      if (klass === null) return [];
      const id = key(klass);
      const cantrips = cantripsFor(klass, whole.level);
      const spells = spellsAtCreation(id, whole.level);
      const out: Group[] = [];
      if (cantrips > 0) {
        out.push({
          id: "cantrips", label: "Cantrips", limit: cantrips,
          note: `choose ${String(cantrips)}`,
          options: spellOptions(klass, build.subclass, 0),
        });
      }
      if (spells > 0) {
        out.push({
          id: "spells",
          label: id === "wizard" ? "Your spellbook" : "Spells known",
          limit: spells,
          note: id === "wizard" ? `write ${String(spells)} into it` : `choose ${String(spells)}`,
          options: spellOptions(klass, build.subclass, 1),
        });
      }
      return out;
    }
    if (step === "weapons") {
      /* One question per category the chosen lines left open, filtered to
         what the phrase actually asked for — a "martial melee weapon" pool is
         250 rows, not all 555. */
      const out: Group[] = [];
      for (const [i, line] of whole.equipment.entries()) {
        for (const [j, c] of categoriesIn(line).entries()) {
          out.push({
            id: `weapon-${String(i)}-${String(j)}`,
            label: c.label,
            note: c.qty === 1 ? "choose one" : `choose ${String(c.qty)}`,
            limit: c.qty,
            options: weaponsIn(c.weapon, c.range ?? null),
          });
        }
      }
      return out;
    }
    if (step === "picks") {
      /* Every question the class has opened and nobody has answered — a
         sorcerer's Metamagic, a warlock's Pact Boon, a ranger's Deft
         Explorer. One pool each, because each has its own list. */
      return openQuestions(whole).map((q) => {
        const point = (loaded.choices[q.klass] ?? []).find((p) => p.of === q.of);
        return {
          id: q.key,
          label: q.of,
          note: `${nameOfClass(q.klass)} · level ${String(q.level)}`,
          limit: 1,
          options: keep(point?.options ?? []).map((o) => toOption(o)),
        };
      });
    }
    if (step === "proficiencies") {
        return offer(build).picks.map((p) => ({
          id: p.id, label: p.label, note: `${p.from} · choose ${String(p.count)}`,
          limit: p.count,
          options: p.options.map((name) => ({ id: name, name })),
        }));
      }
      return undefined;
  };
}

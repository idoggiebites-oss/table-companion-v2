import { useMemo, useState } from "react";
import { PickOneStep, PickManyStep, PickPerGroupStep } from "./PickStep";
import { ImprovementsStep } from "./ImprovementsStep";
import { ReviewStep } from "./ReviewStep";
import { WeaponStep } from "./WeaponStep";
import { AbilitiesStep } from "./AbilitiesStep";
import { IdentityStep } from "./IdentityStep";
import { LevelStep, MulticlassStep } from "./LevelStep";
import { buildFrom, primary, needsPath, scoresOf, type Choice } from "./model";
import { factsOf, asking } from "./facts";
import { SRD_ONLY, type CreationContent } from "./content";
import { stepsFor, diffSteps, type Step, type StepId } from "../../rules/5e/steps";
import type { Event } from "../../core/types";
import { PRIORITY } from "../../rules/5e/classes";
import { ABILITIES, ABILITY_NAME, modifier, signed, type Ability } from "../../rules/5e/abilities";
import { SKILLS, proficiency } from "../../rules/5e/skills";
import { asiLevels } from "../../rules/5e/progression";
import { key } from "../../content/names";
import type { Option } from "../../ui/step/Choices";

/**
 * The guided flow. It owns nothing: the build is the fold of the events, and
 * the step list is computed from the build. Choosing an elf therefore grows a
 * Lineage step as a consequence rather than as a special case.
 */
export function Creation({
  events, character, onChoose, content = SRD_ONLY, hasNonSrd = true, onDone, onExit,
}: {
  events: readonly Event[];
  /** Which character these choices belong to. A device holds several. */
  character?: string;
  onChoose: (choice: Choice) => void;
  content?: CreationContent;
  hasNonSrd?: boolean;
  onDone?: () => void;
  /** Back, on the first step, leaves. A flow you can only finish is a trap. */
  onExit?: () => void;
}) {
  const [at, setAt] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [previous, setPrevious] = useState<readonly Step[]>([]);

  const build = useMemo(() => buildFrom(events, character), [events, character]);
  const steps = useMemo(() => stepsFor(factsOf(build, content)), [build, content]);
  const step = steps[Math.min(at, steps.length - 1)];

  const change = useMemo(
    () => (previous.length === 0 ? null : diffSteps(previous, steps, build.answered)),
    [previous, steps, build.answered],
  );

  const advance = (choice: Choice, said?: string) => {
    setDirection("forward");
    setPrevious(steps);
    onChoose(said === undefined ? choice : { ...choice, name: said });
    setAt((i) => Math.min(i + 1, steps.length));

  };

  const back = at === 0 ? onExit : () => { setDirection("back"); setAt((i) => Math.max(0, i - 1)); };
  if (step === undefined) return null;

  const arrived =
    change !== null && change.added.length > 0 && change.added.includes(step.id)
      ? `This step was added by what you just chose.`
      : undefined;

  const common = {
    /*
     * `key` is NOT in here — every call site writes it out. A key arriving by
     * spread is deprecated in React 19, and when it stops working it will stop
     * SILENTLY: six steps share `PickOneStep`, and unkeyed, React keeps one
     * instance and its `picked` with it — arriving at Class with the lineage
     * still selected, Continue enabled, and pressing it recording the
     * LINEAGE's id as the class. `check-keys` holds the line.
     */
    index: at, total: steps.length, stepKey: step.id, direction,
    ...(back === undefined ? {} : { onBack: back }),
    ...(arrived === undefined ? {} : { arrived }),
  };
  const opts = (id: StepId) => content.optionsFor(id, asking(build));
  const groups = (id: StepId) => content.groupsFor?.(id, build) ?? [];
  /**
   * Spells are sliced by school, which the compendium carries. The concept's
   * Damage / Utility / Control chips are not a field in the data.
   */
  /** "an Arcane Tradition", not "a Arcane Tradition". */
  const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

  /** A person reads names, not ids. */
  const nameOf = (options: readonly Option[], id: string) =>
    options.find((o) => o.id === id)?.name ?? id;
  const detail = (id: StepId) => (ids: readonly string[]) => {
    /* The skills breakdown is arithmetic over THIS character, so it is worked
       out here rather than by the content layer, which knows no scores. */
    if (id === "skills") {
      const first = ids[0];
      if (first === undefined) return undefined;
      const skill = SKILLS.find((k) => k.id === first);
      if (skill === undefined) return undefined;
      const abilityMod = modifier(scoresOf(build)[skill.ability]);
      const prof = proficiency(build.level);
      return {
        label: `${skill.name} ${signed(abilityMod + prof)}`,
        lines: [
          `${signed(abilityMod)} ${ABILITY_NAME[skill.ability]}`,
          `${signed(prof)} Proficiency`,
        ],
      };
    }
    return content.detailFor(id, ids, build);
  };

  switch (step.id) {
    case "abilities":
      return (
        <AbilitiesStep
          key={step.id} {...common}
          hasNonSrd={hasNonSrd}
          {...(primary(build) === null ? {} : {
            recommended: {
              // The class's own name and its own order — a monk leans on
              // Dexterity, and calling it "monk" in lower case is the id
              // leaking through to a person.
              klass: nameOf(opts("class"), primary(build)!),
              order: (PRIORITY[key(primary(build)!)] ?? ABILITIES) as readonly Ability[],
            },
          })}
          onContinue={(method, scores) => advance({ step: "abilities", method, scores })}
        />
      );
    case "level":
      return (
        <LevelStep key={step.id} {...common} level={build.level}
          onContinue={(level) => advance({ step: "level", level })} />
      );
    case "multiclass":
      return (
        <MulticlassStep key={step.id} {...common} level={build.level}
          classes={build.classes.map((c) => ({ id: c.id, level: c.level }))}
          options={opts("class")}
          onContinue={(classes) => {
            const slots: Record<string, readonly (readonly number[])[]> = {};
            for (const k of classes) {
              const t = content.slotTableFor(k.id);
              if (t !== undefined) slots[k.id] = t;
            }
            advance({ step: "multiclass", classes, ...(Object.keys(slots).length === 0 ? {} : { slots }) });
          }} />
      );
    case "identity":
      return <IdentityStep key={step.id} {...common} onContinue={(identity) => advance({ step: "identity", identity })} />;
    case "review":
      return (
        <ReviewStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          build={build}
          onContinue={() => onDone?.()}
        />
      );
    case "mcskills": {
      const pools = groups("mcskills");
      return (
        <PickPerGroupStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          groups={pools} countLabel="Skills chosen"
          onContinue={(picked) => {
            // Into the same list the class and background skills land in.
            const gained = pools.flatMap((g) => [...(picked[g.id] ?? [])]);
            advance({ step: "skills", skills: [...new Set([...build.skills, ...gained])] });
          }}
        />
      );
    }
    case "skills": {
      const rows = opts("skills");
      /*
       * What the background and the ancestry already gave goes into the build
       * alongside what was picked. The rows were shown as held so a pick could
       * not be wasted on them — but only the picks were being recorded, so a
       * Sage's Arcana and History never reached the sheet and the character
       * rolled them untrained. V1: `new Set([...classSkills, ...background])`.
       */
      const held = rows.filter((o) => o.held !== undefined).map((o) => o.id);
      return (
        <PickManyStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          options={rows} detail={detail("skills")}
          limit={content.skillLimit({ klass: primary(build), background: build.background })} countLabel="Skills chosen"
          onContinue={(skills) => advance({ step: "skills", skills: [...new Set([...held, ...skills])] })}
        />
      );
    }
    case "heritage": {
      const pools = groups("heritage");
      return (
        <PickPerGroupStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          groups={pools} countLabel="Placed"
          onContinue={(picked) => {
            // Two points on one ability is legal, so the same id can appear
            // twice — count them rather than collecting a set.
            const abilities: Record<string, number> = {};
            for (const a of picked["abilities"] ?? []) abilities[a] = (abilities[a] ?? 0) + 1;
            const feat = picked["feat"]?.[0] ?? null;
            const named = feat === null ? null : nameOf(pools.find((g) => g.id === "feat")?.options ?? [], feat);
            advance({
              step: "heritage",
              heritage: { abilities, skills: [...(picked["skills"] ?? [])], feat: named },
              ...(named === null ? {} : { featEffects: { [named]: content.effectsOf?.(feat!) ?? {} } }),
            });
          }}
        />
      );
    }
    case "improvements": {
      const owed = build.classes.flatMap((c) =>
        asiLevels(c.id).filter((l) => l <= c.level)
          .map((l) => ({ id: `${c.id}-${String(l)}`, klass: nameOf(opts("class"), c.id), level: l })));
      return (
        <ImprovementsStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          owed={owed} scores={scoresOf(build)} feats={opts("feat")}
          value={build.improvements}
          onContinue={(improvements) => {
            /* What each feat does to the numbers, recorded with the choice —
               Resilient grants a save, and it is the reason anybody takes it. */
            const fx: Record<string, ReturnType<NonNullable<typeof content.effectsOf>>> = {};
            for (const i of improvements) {
              if (!("feat" in i)) continue;
              const name = i.name ?? i.feat;
              fx[name] = content.effectsOf?.(i.feat) ?? {};
            }
            advance({ step: "improvements", improvements, ...(Object.keys(fx).length === 0 ? {} : { featEffects: fx }) });
          }}
        />
      );
    }
    case "spells": {
      /* Cantrips and spells are separate pools with separate counts — a
         level-one bard chooses two cantrips AND four spells. Asking only for
         cantrips left them finishing creation knowing no spells. */
      const pools = groups("spells");
      return (
        <PickPerGroupStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          groups={pools} countLabel="Spells chosen"
          onContinue={(picked) => {
            const chosen = pools.flatMap((g) => (picked[g.id] ?? []).map(
              (id) => g.options.find((o) => o.id === id)?.name ?? id));
            advance({ step: "spells", spells: chosen });
          }}
        />
      );
    }
    case "style":
      return (
        <PickOneStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          step="style"
          options={opts("style")} value={build.style}
          onContinue={(chosen) =>
            advance({ step: "style", style: chosen }, nameOf(opts("style"), chosen))}
        />
      );
    case "weapons":
      return <WeaponStep key={step.id} {...common} step={step} groups={groups("weapons")} onChoose={advance} />;
    case "picks": {
      const pools = groups("picks");
      return (
        <PickPerGroupStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          groups={pools} countLabel="Answered"
          onContinue={(picked) => {
            /* The words, not the id — a sheet reading "careful-spell" is the
               id leaking through to a person. */
            const answers: Record<string, string> = {};
            for (const g of pools) {
              const id = picked[g.id]?.[0];
              if (id === undefined) continue;
              answers[g.id] = g.options.find((o) => o.id === id)?.name ?? id;
            }
            advance({ step: "picks", picks: answers });
          }}
        />
      );
    }
    case "proficiencies": {
      const pools = groups("proficiencies");
      return (
        <PickPerGroupStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          groups={pools} countLabel="Chosen"
          onContinue={(picked) => {
            // Languages and tools go back to their own lists: one screen asked
            // for both, and the sheet has two places to put them.
            const of = (want: boolean) =>
              pools.filter((g) => (g.id === "languages") === want)
                .flatMap((g) => [...(picked[g.id] ?? [])]);
            advance({ step: "proficiencies", languages: of(true), tools: of(false) });
          }}
        />
      );
    }
    case "equipment": {
      const lines = groups("equipment");
      return (
        <PickPerGroupStep
          key={step.id} {...common}
          title={step.title} question={step.question} sub={step.sub}
          groups={lines} countLabel="Lines answered"
          onContinue={(picked) => {
            /* The book's own words, not ids: "a martial weapon and a shield"
               is one line of an equipment list, and it is what a table reads
               out. The granted lines come along without being chosen. */
            const said = (id: string) =>
              lines.find((g) => g.id === id.split(":")[0])?.options.find((o) => o.id === id)?.name;
            const chosen = lines.flatMap((g) =>
              g.limit === 0 ? g.options.map((x) => x.name) : (picked[g.id] ?? []).map(said));
            const taken = chosen.filter((x): x is string => x !== undefined);
            // Resolved now, so the sheet never needs the compendium to say AC.
            const worn = content.wornIn?.(taken) ?? [];
            advance({ step: "equipment", equipment: taken, ...(worn.length === 0 ? {} : { worn }) });
          }}
        />
      );
    }
    default: {
      const id = step.id;
      const value =
        id === "ancestry" ? build.race : id === "subrace" ? build.subrace
        : id === "class" ? primary(build)
        : id === "subclass" ? (needsPath(build)?.subclass ?? null) : build.background;
      const grant = id === "subclass" ? content.grantFor?.(primary(build) ?? "") : undefined;
      return (
        <PickOneStep
          key={step.id} {...common}
          shape={id === "ancestry" || id === "subrace" ? "grid" : "list"}
          title={step.title} question={step.question}
          sub={grant === undefined ? step.sub : `This class calls it ${article(grant)} ${grant}.`}
          step={id}
          options={opts(id)} detail={detail(id)} value={value}
          onContinue={(chosen) => {
            const said = nameOf(opts(id), chosen);
            const picked = opts(id).find((o) => o.id === chosen);
            const grant = {
              ...(picked?.bonuses === undefined ? {} : { bonuses: picked.bonuses }),
              ...(picked?.speed === undefined ? {} : { speed: picked.speed }),
            };
            /* What the source hands over unasked, recorded with the choice —
               so the sheet can say what a character speaks without the
               compendium, and so changing it takes its grants with it. */
            const gives = content.grantOf?.(id, chosen);
            const spells = content.innateOf?.(id, chosen);
            const eyes = content.sensesOf?.(id, chosen);
            const g = {
              ...(gives === undefined ? {} : { grant: gives }),
              ...(spells === undefined ? {} : { innate: spells }),
              ...(eyes === undefined ? {} : { senses: eyes }),
            };
            if (id === "ancestry") advance({ step: "ancestry", race: chosen, ...grant, ...g }, said);
            else if (id === "subrace") advance({ step: "subrace", subrace: chosen, ...grant, ...g }, said);
            else if (id === "class") {
              // The slot table rides along, so the sheet can say what a caster
              // casts without holding the compendium open.
              const table = content.slotTableFor(chosen);
              const gold = content.wealthFor?.(chosen);
              advance({
                step: "class", klass: chosen, ...g,
                ...(table === undefined ? {} : { slots: table }),
                ...(gold === undefined ? {} : { wealth: gold }),
              }, said);
            }
            else if (id === "subclass") {
              const owed = needsPath(build);
              advance({ step: "subclass", subclass: chosen, ...(owed === undefined ? {} : { klass: owed.id }) }, said);
            }
            // The words the person saw, on every choice that showed them a
            // list — a sheet reading "sage" and "school-of-evocation" is the
            // id leaking through to a person.
            else advance({ step: "background", background: chosen, ...g }, said);
          }}
        />
      );
    }
  }
}

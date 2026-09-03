import { useState } from "react";
import { StepShell, Counter } from "../../ui/step/StepShell";
import { ChoiceList, CheckList, type Option } from "../../ui/step/Choices";
import { DetailCard, Stepper } from "../../ui/step/Controls";
import { Button, ButtonRow } from "../../ui/Button";
import { ABILITIES, ABILITY_NAME, modifier, signed, type Ability } from "../../rules/5e/abilities";
import { rulesFor } from "../../rules/5e/classes";
import { asksFor, defaultHp, type LevelTaken } from "./model";
import { scoresOf, type Build } from "../creation/model";
import { castsWith, slotsGained, learnedAt } from "../../rules/5e/casting";
import { multiclassBlock } from "../../rules/5e/multiclassing";
import s from "./LevelUp.module.css";

/**
 * One level, taken at the table.
 *
 * This is the same act as joining mid-campaign, and it emits the same events —
 * see progression.ts. A person levelling to five and a person walking in at
 * five end up with the same character, and that is asserted, not hoped.
 */
export function LevelUp({
  build, paths, questions, spellsFor, others = [], dieFor, slotsFor, onBack, onTake,
}: {
  build: Build;
  /** Paths this class offers, when the level asks for one. */
  paths?: (klass: string) => readonly Option[];
  /** Other questions this level opens — Metamagic at 3, a Pact Boon at 3. */
  questions?: (klass: string, level: number) => readonly { of: string; options: readonly Option[] }[];
  /** Spells this class could learn at this level. */
  spellsFor?: (klass: string, level: number) => readonly Option[];
  /** Classes they do not have yet, offered as a dip. */
  others?: readonly Option[];
  /** A dip rolls its NEW class's die, not the one they started with. */
  dieFor?: (klass: string) => number;
  slotsFor?: (klass: string) => readonly (readonly number[])[] | undefined;
  onBack: () => void;
  onTake: (t: LevelTaken) => void;
}) {
  const [klass, setKlass] = useState<string>(build.classes[0]?.id ?? "");
  /* Two POINTS, which may both land on the same ability. +2 Strength is a
     legal and common choice, and a list of distinct abilities cannot say it. */
  const [abilities, setAbilities] = useState<readonly Ability[]>([]);
  const [subclass, setSubclass] = useState<string | null>(null);
  /** Every other question this level opens — Metamagic, a Pact Boon. */
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({});
  const [learned, setLearned] = useState<readonly string[]>([]);

  const current = build.classes.find((c) => c.id === klass);
  const isNew = current === undefined && klass !== "";
  const nextLevel = (current?.level ?? 0) + 1;
  /*
   * The rule cuts both ways and people forget the first half: taking a level
   * in something new requires the minimums of the class you are LEAVING as
   * well as the one you are joining.
   */
  const blocked = isNew
    ? multiclassBlock({ from: build.classes, into: klass, scores: scoresOf(build) })
    : null;
  const asks = klass === "" ? [] : asksFor(klass, nextLevel);
  const wantsAsi = asks.some((g) => g.kind === "asi");
  const wantsPath = asks.some((g) => g.kind === "subclass");
  const options = wantsPath ? paths?.(klass) ?? [] : [];
  // A dip rolls its NEW class's die, not the one they started with.
  const die = klass === "" ? 0 : (isNew ? dieFor?.(klass) ?? rulesFor(klass).hitDie : rulesFor(klass).hitDie);
  const hp = klass === "" ? 0 : Math.floor(die / 2) + 1;
  const table = build.slots[klass] ?? (isNew ? slotsFor?.(klass) : undefined);
  const gainedSlots = klass === "" || !castsWith(klass, current?.subclass ?? null)
    ? []
    : slotsGained(table, current?.level ?? 0, nextLevel);
  // What the character actually gains. The die's average is not the answer:
  // Constitution is added at every level, and a screen that promises +6 while
  // the sheet grants +5 is a screen nobody trusts twice.
  /*
   * `scoresOf`, not `build.scores`. The assigned score is what the person
   * typed; the ancestry's bonus lands on top, and reading past it told a Human
   * wizard with Con 13 assigned and Con 14 held that they would gain +5 while
   * the sheet granted +6 — the exact failure this screen's own note warns
   * about, arriving the day ancestries started granting anything.
   */
  const held = scoresOf(build);
  const conMod = modifier(held.con);
  const gained = Math.max(1, hp + conMod);

  /* Adds a point rather than toggling one: two taps on Strength is +2, which
     the rules allow and a distinct-only toggle cannot express. A third tap
     starts over rather than doing nothing, because a dead button reads as a
     bug. */
  const add = (a: Ability) =>
    setAbilities((p) => (p.length >= 2 ? [a] : [...p, a]));

  const opening = klass === "" ? [] : (questions?.(klass, nextLevel) ?? []);
  const teaches = klass === "" ? { cantrips: 0, spells: 0 } : learnedAt(klass, current?.level ?? 0, nextLevel);
  const owedSpells = teaches.cantrips + teaches.spells;
  const offered = owedSpells === 0 ? [] : (spellsFor?.(klass, nextLevel) ?? []);

  const ready = klass !== "" && blocked === null
    && opening.every((q) => answers[q.of] !== undefined)
    && learned.length >= Math.min(owedSpells, offered.length)
    && (!wantsAsi || abilities.length === 2)
    && (!wantsPath || options.length === 0 || subclass !== null);

  const nameOf = (id: string) =>
    build.names["class"] !== undefined && id === build.classes[0]?.id
      ? build.names["class"]
      : others.find((o) => o.id === id)?.name ?? id;

  const take = () => {
    if (!ready) return;
    onTake({
      klass, classLevel: nextLevel, hp,
      ...(wantsAsi ? { asi: { abilities } } : {}),
      ...(isNew ? { die } : {}),
      ...(Object.keys(answers).length === 0
        ? {}
        : { picks: Object.fromEntries(Object.entries(answers).map(([of, v]) => [`${klass}:${of}`, v])) }),
      ...(learned.length === 0 ? {} : { learned: [...learned] }),
      ...(subclass === null
        ? {}
        : { subclass, subclassName: options.find((o) => o.id === subclass)?.name ?? subclass }),
    });
  };

  return (
    <StepShell
      title="Level up"
      question={`Level ${build.level + 1}`}
      sub="Which class gains the level?"
      index={0} total={1}
      onBack={onBack}
      counter={wantsAsi ? <Counter label="Ability points" have={abilities.length} need={2} /> : undefined}
      detail={
        klass === "" ? undefined : (
          <DetailCard
            label={`What ${klass} ${nextLevel} gives`}
            lead={
              conMod === 0
                ? `+${gained} hit points (average of a d${rulesFor(klass).hitDie})`
                : `+${gained} hit points — average of a d${rulesFor(klass).hitDie}, ${signed(conMod)} Constitution`
            }
            lines={[
              wantsAsi ? "An ability score improvement, or a feat." : "No improvement at this level.",
              wantsPath ? "A path to choose." : "No path at this level.",
              /* Reaching a new spell level is the largest thing that happens
                 to a caster, and this card used to say nothing about it — a
                 wizard reaching 3 was told only "+5 hit points". */
              ...gainedSlots.map((g) =>
                g.had === 0
                  ? `Level ${String(g.level)} spells — ${String(g.now)} slot${g.now === 1 ? "" : "s"}, new to you.`
                  : `Another level ${String(g.level)} slot, ${String(g.had)} → ${String(g.now)}.`),
            ]}
          />
        )
      }
      actions={
        <ButtonRow>
          <Button tone="gold" disabled={!ready} onClick={take}>Take the level</Button>
        </ButtonRow>
      }
    >
      <ChoiceList
        options={[
          ...build.classes.map((c) => ({
            id: c.id,
            // The words, not the id: this list read "wizard" in lower case.
            name: nameOf(c.id),
            role: `level ${c.level} → ${c.level + 1}`,
          })),
          /* Classes they do not have yet. Without these a character could
             never multiclass after creation at all. */
          ...others.map((o) => ({ ...o, role: "a new class", group: "Take a dip" })),
        ]}
        value={klass}
        onChange={(id) => { setKlass(id); setAbilities([]); setSubclass(null); }}
      />

      {opening.map((q) => (
        <div key={q.of} className={s.card} data-testid="question">
          <span className={s.label}>{q.of}</span>
          <ChoiceList
            options={q.options}
            value={answers[q.of] ?? null}
            onChange={(id) => setAnswers((p) => ({
              ...p, [q.of]: q.options.find((o) => o.id === id)?.name ?? id,
            }))}
          />
        </div>
      ))}

      {owedSpells > 0 && offered.length > 0 && (
        <div className={s.card} data-testid="learn">
          <span className={s.label}>
            {teaches.cantrips > 0 && `${teaches.cantrips} cantrip${teaches.cantrips === 1 ? "" : "s"}`}
            {teaches.cantrips > 0 && teaches.spells > 0 && " and "}
            {teaches.spells > 0 && `${teaches.spells} spell${teaches.spells === 1 ? "" : "s"}`}
          </span>
          <CheckList
            options={offered}
            values={[...learned]}
            onToggle={(id) => setLearned((p) =>
              p.includes(id) ? p.filter((x) => x !== id) : p.length >= owedSpells ? p : [...p, id])}
          />
        </div>
      )}

      {blocked !== null && (
        <p className={s.blocked} data-testid="blocked">{blocked}</p>
      )}

      {wantsAsi && (
        <div className={s.card}>
          <span className={s.label}>Two points — both may go on one</span>
          <div className={s.row}>
            {ABILITIES.map((a) => (
              <button
                key={a} type="button"
                className={`${s.chip} ${abilities.includes(a) ? s.on : ""}`}
                aria-pressed={abilities.includes(a)}
                onClick={() => add(a)}
              >
                {ABILITY_NAME[a]} {held[a]} {signed(modifier(held[a]))}
                {abilities.filter((x) => x === a).length > 1 && <span> +2</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {wantsPath && options.length > 0 && (
        <div className={s.card}>
          <span className={s.label}>Choose a path</span>
          <ChoiceList options={options} value={subclass} onChange={setSubclass} />
        </div>
      )}

      {/* Hit points are shown, not asked: the average is taken unless a table
          prefers to throw, and the app never throws. */}
      <Stepper name="Hit points gained" value={gained} modifier="" canRaise={false} canLower={false}
               onRaise={() => {}} onLower={() => {}} />
    </StepShell>
  );
}

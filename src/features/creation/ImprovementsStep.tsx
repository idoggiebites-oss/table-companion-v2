import { useState } from "react";
import { StepShell, Counter } from "../../ui/step/StepShell";
import { Segmented } from "../../ui/step/Controls";
import { CheckList, type Option } from "../../ui/step/Choices";
import { Button, ButtonRow } from "../../ui/Button";
import { ABILITIES, ABILITY_NAME, modifier, signed, type Ability, type Scores } from "../../rules/5e/abilities";
import type { Improvement } from "./scores";
import s from "./ImprovementsStep.module.css";

/** One improvement this character has already passed. */
export type Owed = { readonly id: string; readonly klass: string; readonly level: number };

/**
 * The improvements a character joining mid-campaign has already earned.
 *
 * A Fighter created at 8 has passed 4, 6 and 8. V1 hit this and fixed it —
 * its note is that the builder was *stating the points owed and giving
 * nowhere to spend them* — and V2 reintroduced it by not asking at all, so
 * such a character arrived with three unspent improvements and no sign of it.
 *
 * **Two points, and they may both land on the same ability.** The level-up
 * screen offers two distinct ones, which is not the rule: +2 Strength is a
 * legal and common choice. Tapping a chip twice does it, and the chip says so.
 */
export function ImprovementsStep({
  owed, scores, feats, value, onContinue, ...c
}: {
  title: string; question: string; sub?: string;
  index: number; total: number;
  stepKey?: string | undefined;
  direction?: "forward" | "back" | undefined;
  owed: readonly Owed[];
  scores: Scores;
  feats: readonly Option[];
  value?: readonly Improvement[];
  onBack?: () => void;
  onContinue: (improvements: readonly Improvement[]) => void;
}) {
  const [picked, setPicked] = useState<Readonly<Record<string, Improvement>>>(
    () => Object.fromEntries((value ?? []).map((v, i) => [owed[i]?.id ?? String(i), v])),
  );

  const add = (id: string, a: Ability) =>
    setPicked((p) => {
      const had = p[id];
      const list = had !== undefined && "abilities" in had ? had.abilities : [];
      // Two points. A third replaces the pair rather than being ignored —
      // silently doing nothing reads as a broken button.
      const next = list.length >= 2 ? [a] : [...list, a];
      return { ...p, [id]: { abilities: next } };
    });

  const takeFeat = (id: string, feat: string, name: string) =>
    setPicked((p) => ({ ...p, [id]: { feat, name } }));

  const done = owed.every((o) => {
    const p = picked[o.id];
    return p !== undefined && ("feat" in p || p.abilities.length === 2);
  });
  const have = owed.filter((o) => {
    const p = picked[o.id];
    return p !== undefined && ("feat" in p || p.abilities.length === 2);
  }).length;

  return (
    <StepShell
      stepKey={c.stepKey} direction={c.direction}
      title={c.title} question={c.question} index={c.index} total={c.total}
      {...(c.sub === undefined ? {} : { sub: c.sub })}
      {...(c.onBack === undefined ? {} : { onBack: c.onBack })}
      counter={<Counter label="Improvements spent" have={have} need={owed.length} />}
      actions={
        <ButtonRow>
          {c.onBack !== undefined && <Button onClick={c.onBack}>Back</Button>}
          <Button tone="gold" disabled={!done}
                  onClick={() => done && onContinue(owed.map((o) => picked[o.id]!))}>
            Continue
          </Button>
        </ButtonRow>
      }
    >
      {owed.map((o) => (
        <One key={o.id} owed={o} scores={scores} feats={feats}
             picked={picked[o.id]}
             onAbility={(a) => add(o.id, a)}
             onFeat={(id, name) => takeFeat(o.id, id, name)} />
      ))}
    </StepShell>
  );
}

function One({ owed, scores, feats, picked, onAbility, onFeat }: {
  owed: Owed; scores: Scores; feats: readonly Option[];
  picked: Improvement | undefined;
  onAbility: (a: Ability) => void;
  onFeat: (id: string, name: string) => void;
}) {
  const isFeat = picked !== undefined && "feat" in picked;
  const [mode, setMode] = useState<string>(isFeat ? "feat" : "abilities");
  const taken = picked !== undefined && "abilities" in picked ? picked.abilities : [];
  const count = (a: Ability) => taken.filter((x) => x === a).length;

  return (
    <div className={s.card} data-testid="improvement">
      <span className={s.label}>{owed.klass} level {owed.level}</span>
      <Segmented
        label="How to spend it"
        value={mode}
        onChange={setMode}
        options={[{ id: "abilities", label: "Two points" }, { id: "feat", label: "A feat" }]}
      />
      {mode === "abilities" ? (
        <div className={s.row}>
          {ABILITIES.map((a) => (
            <button key={a} type="button"
                    className={`${s.chip} ${count(a) > 0 ? s.on : ""}`}
                    aria-pressed={count(a) > 0}
                    onClick={() => onAbility(a)}>
              {ABILITY_NAME[a]} {scores[a]} {signed(modifier(scores[a]))}
              {/* Both points on one ability is legal, common, and has to be
                  visible or the second tap looks like it did nothing. */}
              {count(a) > 1 && <span className={s.twice}> +2</span>}
            </button>
          ))}
        </div>
      ) : (
        <CheckList
          options={feats}
          values={isFeat ? [(picked as { feat: string }).feat] : []}
          onToggle={(id) => onFeat(id, feats.find((f) => f.id === id)?.name ?? id)}
        />
      )}
    </div>
  );
}

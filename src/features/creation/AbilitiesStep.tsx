import { useState } from "react";
import { StepShell, Counter } from "../../ui/step/StepShell";
import { Segmented } from "../../ui/step/Controls";
import { NumberEntry, AbilitySlot } from "../../ui/step/Entry";
import { RollPad, Pool } from "./RollPool";
import { Recommended } from "./Recommended";
import { Button, ButtonRow } from "../../ui/Button";
import { ABILITIES, ABILITY_NAME, BLANK, modifier, signed, type Ability, type Scores } from "../../rules/5e/abilities";
import { methods, remaining, spent, costOf, POINT_BUDGET, POINT_MIN, POINT_MAX, STANDARD_ARRAY, type Method } from "../../rules/5e/pointbuy";

const LABEL: Record<Method, string> = {
  "point-buy": "Point Buy", "standard-array": "Standard Array", roll: "Roll", manual: "Manual",
};

/**
 * The ability step. Two of its four methods need the PHB tables, so a build
 * without them offers two segments rather than four with two greyed out.
 */
export function AbilitiesStep({
  index, total, stepKey, direction, hasNonSrd = true, recommended, onBack, onContinue,
}: {
  index: number;
  total: number;
  stepKey?: string | undefined;
  direction?: "forward" | "back" | undefined;
  hasNonSrd?: boolean;
  recommended?: { readonly klass: string; readonly order: readonly Ability[] };
  onBack?: () => void;
  onContinue: (method: Method, scores: Scores) => void;
}) {
  const available = methods(hasNonSrd);
  const [method, setMethod] = useState<Method>(available[0]!);
  const [scores, setScores] = useState<Scores>(BLANK);

  /**
   * Roll and Standard Array hand you six numbers and ask where they go; Point
   * Buy and Manual ask you to state each one. Two different questions, so two
   * different controls — V1 had this and the first build of V2 lost it.
   */
  const assigns = method === "roll" || method === "standard-array";
  const [pool, setPool] = useState<readonly number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [placed, setPlaced] = useState<Partial<Record<Ability, number>>>({});

  const changeMethod = (next: Method) => {
    setMethod(next);
    setScores(BLANK);
    setPlaced({});
    setPicked(null);
    setPool(next === "standard-array" ? [...STANDARD_ARRAY] : []);
  };

  /** A total thrown by a person, tapped in. Six of them make the pool. */
  const takeTotal = (v: number) => setPool((p) => [...p, v]);

  const tapAbility = (a: Ability) => {
    const held = placed[a];
    if (held !== undefined) {
      // Put it back rather than overwrite: the value is not lost, it is loose.
      setPlaced((p) => ({ ...p, [a]: undefined }));
      setPool((p) => [...p, held]);
      return;
    }
    if (picked === null) return;
    const value = pool[picked];
    if (value === undefined) return;
    setPlaced((p) => ({ ...p, [a]: value }));
    setPool((p) => p.filter((_, i) => i !== picked));
    setPicked(null);
  };

  const rolling = method === "roll" && pool.length + Object.values(placed).filter((v) => v !== undefined).length < 6;
  const allPlaced = ABILITIES.every((a) => placed[a] !== undefined);
  const finalScores: Scores = assigns
    ? (Object.fromEntries(ABILITIES.map((a) => [a, placed[a] ?? 8])) as unknown as Scores)
    : scores;

  const isBuy = method === "point-buy";
  const left = remaining(scores);

  /**
   * The rule lives here, not in the control. A typed number is checked against
   * the same table the budget is drawn from, and a value that cannot be
   * afforded is refused with a reason rather than quietly clamped.
   */
  const refuse = (a: Ability) => (next: number): string | null => {
    if (!isBuy) return null;
    const rest = spent({ ...scores, [a]: POINT_MIN });
    const total = rest + costOf(next);
    if (total > POINT_BUDGET) {
      return `That costs ${costOf(next)}; only ${POINT_BUDGET - rest} left for ${ABILITY_NAME[a]}.`;
    }
    return null;
  };

  const set = (a: Ability, next: number) => setScores((s) => ({ ...s, [a]: next }));

  const applyRecommended = () => {
    if (recommended === undefined) return;
    if (assigns) {
      // Deal the pool out in the class's own order of preference.
      const values = [...pool, ...ABILITIES.map((a) => placed[a]).filter((v): v is number => v !== undefined)]
        .sort((x, y) => y - x);
      if (values.length < 6) return;
      setPlaced(Object.fromEntries(recommended.order.map((a, i) => [a, values[i]!])));
      setPool([]);
      setPicked(null);
      return;
    }
    const next: Record<string, number> = { ...BLANK };
    const spread = [15, 14, 13, 12, 10, 8];
    recommended.order.forEach((a, i) => { next[a] = spread[i] ?? 8; });
    setScores(next as unknown as Scores);
  };

  return (
    <StepShell
      stepKey={stepKey} direction={direction}
      title="Ability Scores"
      question="Assign ability scores"
      sub="Choose how to generate your scores."
      index={index}
      total={total}
      {...(onBack === undefined ? {} : { onBack })}
      counter={
        isBuy ? <Counter label="Points remaining" have={left} need={POINT_BUDGET} />
        : assigns ? <Counter label="Scores placed" have={ABILITIES.filter((a) => placed[a] !== undefined).length} need={6} />
        : undefined
      }
      detail={
        recommended === undefined ? undefined : (
          <Recommended
            klass={recommended.klass}
            order={recommended.order}
            onApply={applyRecommended}
          />
        )
      }
      actions={
        <ButtonRow>
          {onBack !== undefined && <Button onClick={onBack}>Back</Button>}
          <Button tone="gold" disabled={assigns && !allPlaced}
                  onClick={() => onContinue(method, finalScores)}>
            Continue
          </Button>
        </ButtonRow>
      }
    >
      <Segmented
        label="How to generate scores"
        value={method}
        onChange={changeMethod}
        options={available.map((m) => ({ id: m, label: LABEL[m] }))}
      />
      {rolling && <RollPad left={6 - pool.length} onTap={takeTotal} />}
      {assigns && !rolling && <Pool pool={pool} picked={picked} onPick={setPicked} />}

      {assigns
        ? ABILITIES.map((a) => (
            <AbilitySlot
              key={a}
              name={ABILITY_NAME[a]}
              value={placed[a]}
              modifier={signed(modifier(placed[a] ?? 10))}
              onTap={() => tapAbility(a)}
            />
          ))
        : ABILITIES.map((a) => (
            <NumberEntry
              key={a}
              name={ABILITY_NAME[a]}
              value={scores[a]}
              modifier={signed(modifier(scores[a]))}
              min={isBuy ? POINT_MIN : 3}
              max={isBuy ? POINT_MAX : 20}
              refuse={refuse(a)}
              onChange={(next) => set(a, next)}
            />
          ))}
    </StepShell>
  );
}

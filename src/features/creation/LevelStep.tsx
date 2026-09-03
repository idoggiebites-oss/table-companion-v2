import { useState } from "react";
import { StepShell, Counter } from "../../ui/step/StepShell";
import { Stepper, DetailCard } from "../../ui/step/Controls";
import { ChoiceList, type Option } from "../../ui/step/Choices";
import { Button, ButtonRow } from "../../ui/Button";

const MAX = 20;

/**
 * Joining a campaign already in progress. Level one is the common answer and
 * costs one tap; a character walking in at seven is the case the app exists
 * for, and it must not be a different flow.
 */
export function LevelStep({
  index, total, stepKey, direction, level, onBack, onContinue,
}: {
  index: number; total: number; level: number;
  stepKey?: string | undefined;
  direction?: "forward" | "back" | undefined;
  onBack?: () => void; onContinue: (level: number) => void;
}) {
  const [n, setN] = useState(level);
  return (
    <StepShell
      stepKey={stepKey} direction={direction}
      title="Level" question="What level are you starting at?"
      sub="Level one unless the table is already underway."
      index={index} total={total}
      {...(onBack === undefined ? {} : { onBack })}
      detail={
        <DetailCard
          label="What this decides"
          lines={[
            n === 1 ? "Nothing yet — everything is chosen fresh." : `${n - 1} improvements already earned.`,
            n >= 2 ? "Levels can be split across more than one class." : "One class, one level.",
          ]}
        />
      }
      actions={
        <ButtonRow>
          {onBack !== undefined && <Button onClick={onBack}>Back</Button>}
          <Button tone="gold" onClick={() => onContinue(n)}>Continue</Button>
        </ButtonRow>
      }
    >
      <Stepper
        name="Character level" value={n} modifier=""
        canRaise={n < MAX} canLower={n > 1}
        onRaise={() => setN((v) => Math.min(MAX, v + 1))}
        onLower={() => setN((v) => Math.max(1, v - 1))}
      />
    </StepShell>
  );
}

/**
 * Where the levels went. Shown only above level one, because at level one
 * there is nothing to place.
 */
export function MulticlassStep({
  index, total, level, classes, options, onBack, onContinue,
}: {
  index: number; total: number; level: number;
  classes: readonly { id: string; level: number }[];
  options: readonly Option[];
  onBack?: () => void;
  onContinue: (classes: readonly { id: string; level: number }[]) => void;
}) {
  const [rows, setRows] = useState<readonly { id: string; level: number }[]>(
    classes.length > 0 ? classes : [],
  );
  const [adding, setAdding] = useState(false);

  const placed = rows.reduce((n, r) => n + r.level, 0);
  const nameOf = (id: string) => options.find((o) => o.id === id)?.name ?? id;

  const move = (id: string, by: 1 | -1) =>
    setRows((rs) =>
      rs
        .map((r) => (r.id === id ? { ...r, level: r.level + by } : r))
        .filter((r) => r.level > 0),
    );

  const add = (id: string) => {
    // A level for the new class comes out of the first one, so the total never
    // drifts from what the person already said.
    setRows((rs) => {
      if (rs.some((r) => r.id === id)) return rs;
      const first = rs[0];
      if (first === undefined || first.level < 2) return rs;
      return [{ ...first, level: first.level - 1 }, ...rs.slice(1), { id, level: 1 }];
    });
    setAdding(false);
  };

  return (
    <StepShell
      title="Classes" question="Where did those levels go?"
      sub="A character may have levels in more than one class."
      index={index} total={total}
      {...(onBack === undefined ? {} : { onBack })}
      counter={<Counter label="Levels placed" have={placed} need={level} />}
      actions={
        <ButtonRow>
          {onBack !== undefined && <Button onClick={onBack}>Back</Button>}
          <Button tone="gold" disabled={placed !== level}
                  onClick={() => placed === level && onContinue(rows)}>Continue</Button>
        </ButtonRow>
      }
    >
      {rows.map((r) => (
        <Stepper
          key={r.id}
          name={nameOf(r.id)} value={r.level} modifier=""
          canRaise={placed < level} canLower={r.level > 0}
          onRaise={() => move(r.id, 1)}
          onLower={() => move(r.id, -1)}
        />
      ))}
      <Button onClick={() => setAdding((v) => !v)}>{adding ? "Cancel" : "Add a class"}</Button>
      {adding && (
        <ChoiceList
          options={options.filter((o) => !rows.some((r) => r.id === o.id))}
          value={null}
          onChange={add}
        />
      )}
    </StepShell>
  );
}

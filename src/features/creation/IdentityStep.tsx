import { useState } from "react";
import { StepShell } from "../../ui/step/StepShell";
import { Button, ButtonRow } from "../../ui/Button";
import s from "./IdentityStep.module.css";

const PROMPTS: readonly string[] = [
  "Calm, observant, endlessly curious.",
  "Quick to laugh and slow to trust.",
  "Speaks little, and means all of it.",
  "Certain of the plan. Never of the reason.",
  "Kind in a way that costs them something.",
];

const FIELDS = [
  { id: "name", label: "Name" },
  { id: "pronouns", label: "Pronouns (optional)" },
] as const;

/**
 * "Inspire Me" is local. A table opens this on a phone in a basement with no
 * signal, and a button that needs a network is a button that fails in the room
 * it was built for. It offers a line to accept or ignore — it does not write
 * prose into a field on somebody's behalf.
 */
export function IdentityStep({
  index, total, stepKey, direction, onBack, onContinue,
}: {
  index: number; total: number;
  stepKey?: string | undefined;
  direction?: "forward" | "back" | undefined;
  onBack?: () => void;
  onContinue: (identity: Record<string, string>) => void;
}) {
  const [v, setV] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState(0);
  const set = (k: string, value: string) => setV((p) => ({ ...p, [k]: value }));

  return (
    <StepShell
      stepKey={stepKey} direction={direction}
      title="Identity"
      question="Who is your character?"
      sub="Bring your character to life."
      index={index}
      total={total}
      {...(onBack === undefined ? {} : { onBack })}
      actions={
        <ButtonRow>
          <Button onClick={() => { setPrompt((p) => (p + 1) % PROMPTS.length); }}>Inspire me</Button>
          <Button tone="gold" onClick={() => onContinue(v)}>Continue</Button>
        </ButtonRow>
      }
    >
      <div className={s.fields}>
        {FIELDS.map((f) => (
          <label key={f.id} className={s.field}>
            <span className={s.label}>{f.label}</span>
            <input className={s.input} value={v[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} />
          </label>
        ))}
        <div className={s.pair}>
          <label className={s.field}>
            <span className={s.label}>Age</span>
            <input className={s.input} inputMode="numeric" value={v["age"] ?? ""}
                   onChange={(e) => set("age", e.target.value)} />
          </label>
          <label className={s.field}>
            <span className={s.label}>Height</span>
            <input className={s.input} value={v["height"] ?? ""} onChange={(e) => set("height", e.target.value)} />
          </label>
        </div>
        <label className={s.field}>
          <span className={s.label}>Personality</span>
          <textarea className={s.area} data-testid="personality" value={v["personality"] ?? ""}
                    onChange={(e) => set("personality", e.target.value)} placeholder={PROMPTS[prompt]} />
        </label>
      </div>
    </StepShell>
  );
}

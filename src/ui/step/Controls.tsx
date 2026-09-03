import type { ReactNode } from "react";
import s from "./Controls.module.css";

/** Two to four segments. Never four with two greyed out — see CREATION.md. */
export function Segmented<T extends string>({
  options, value, onChange, label,
}: {
  options: readonly { readonly id: T; readonly label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className={s.segmented} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          className={`${s.segment} ${o.id === value ? s.on : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A value with a floor and a ceiling that the CONTROL enforces. Kept for the
 * places where a number is genuinely nudged rather than known — moving a level
 * from one class to another.
 */
export function Stepper({
  name, value, modifier, canRaise, canLower, onRaise, onLower,
}: {
  name: string;
  value: number;
  modifier: string;
  canRaise: boolean;
  canLower: boolean;
  onRaise: () => void;
  onLower: () => void;
}) {
  return (
    <div className={s.stepper}>
      <span className={s.name}>{name}</span>
      <span className={s.score}>{value}</span>
      <span className={s.mod}>{modifier}</span>
      <button type="button" className={s.bump} onClick={onLower} disabled={!canLower}
              aria-label={`Lower ${name}`}>−</button>
      <button type="button" className={s.bump} onClick={onRaise} disabled={!canRaise}
              aria-label={`Raise ${name}`}>+</button>
    </div>
  );
}

/**
 * What the current choice means. One slot, last in the scroll, on every step
 * that has something to say.
 */
export function DetailCard({ label, lead, lines, prose, onClose }: {
  label: string;
  lead?: ReactNode;
  lines?: readonly string[];
  /**
   * A way out, because the card is now asked for rather than automatic.
   *
   * It used to appear on selection and stay for the rest of the step, which
   * on a grid of ancestries meant a third of the screen was permanently spent
   * explaining a choice already made.
   */
  onClose?: () => void;
  /**
   * What the option actually SAYS, behind a control.
   *
   * The card listed names — "Darkvision, Fey Ancestry, Trance" — and there
   * was no way to find out what Trance is. Closed by default because the
   * names are the summary and the prose is the answer to a question somebody
   * chose to ask; a card that opens at full length on every tap is a card
   * nobody can compare two ancestries with.
   */
  prose?: ReactNode;
}) {
  return (
    <div className={s.detail} data-testid="detail">
      <div className={s.detailHead}>
        <span className={s.detailLabel}>{label}</span>
        {onClose !== undefined && (
          <button type="button" className={s.detailClose} onClick={onClose} aria-label="Close">×</button>
        )}
      </div>
      {lead !== undefined && <span className={s.lead}>{lead}</span>}
      {lines !== undefined && (
        <div className={s.lines}>
          {lines.map((l) => <span key={l} className={s.line}>{l}</span>)}
        </div>
      )}
      {prose}
    </div>
  );
}

/**
 * "What does this give you?" — V1's control, and its wording.
 *
 * A `<details>` rather than state: it is open or closed and nothing else
 * depends on which, the browser gives keyboard and screen-reader behaviour
 * for free, and the summary is a real affordance where a long press is none.
 */
export function Prose({ blocks, loading }: {
  blocks: readonly { readonly name: string; readonly text: string }[];
  loading?: boolean;
}) {
  if (loading === true) return <span className={s.line}>Reading…</span>;
  if (blocks.length === 0) return null;
  return (
    <details className={s.prose} data-testid="prose">
      <summary className={s.proseOpen}>What does this give you?</summary>
      <div className={s.proseBody}>
        {blocks.map((b) => (
          <p key={b.name} className={s.proseBlock}>
            {b.name !== "" && <b>{b.name}</b>} {b.text}
          </p>
        ))}
      </div>
    </details>
  );
}

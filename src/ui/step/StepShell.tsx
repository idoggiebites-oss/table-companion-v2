import type { ReactNode } from "react";
import { Shell } from "../Shell";
import s from "./StepShell.module.css";

/**
 * The band order, and it is the same on every step (CREATION.md):
 *
 *   header + progress          pinned
 *   ── question, choices, detail ──   scrolls
 *   counter + actions          pinned
 *
 * `detail` is last in the scroll rather than pinned: it only matters once a
 * choice is made, and pinning it costs ~90px on every step.
 */
export function StepShell({
  title, question, sub, index, total, onBack, onHelp,
  children, detail, counter, pinned, actions, arrived, below, stepKey, direction = "forward",
}: {
  title: string;
  question: string;
  sub?: string;
  index: number;
  total: number;
  onBack?: () => void;
  children: ReactNode;
  detail?: ReactNode;
  counter?: ReactNode;
  actions?: ReactNode;
  arrived?: ReactNode;
  onHelp?: () => void;
  /** Pinned under the action bar — the tab bar, as drawn on every step. */
  below?: ReactNode;
  /**
   * Shown above the counter rather than at the end of the scroll.
   *
   * The detail card explains the choice just made, and on a list of eighteen
   * skills the end of the scroll is eighteen rows away — by which point it is
   * explaining something the person has stopped looking at.
   */
  pinned?: ReactNode;
  /** Identity of the step, so a new one animates in. */
  stepKey?: string | undefined;
  /** Which way the flow just moved. */
  direction?: "forward" | "back" | undefined;
}) {
  return (
    <Shell
      title={title}
      lead={
        onBack ? (
          <button type="button" className={s.back} onClick={onBack} aria-label="Back">‹</button>
        ) : undefined
      }
      trail={onHelp === undefined ? undefined : (
        <button type="button" className={s.help} onClick={onHelp} aria-label="What is this step?">?</button>
      )}
      below={below}
      counter={
        pinned === undefined && counter === undefined ? undefined : (
          <>
            {pinned}
            {counter !== undefined && <span className={s.counterRow}>{counter}</span>}
          </>
        )
      }
      actions={actions}
      before={
        <div className={s.progress} role="progressbar" aria-valuenow={index + 1} aria-valuemax={total}
             aria-label={`Step ${index + 1} of ${total}`} data-testid="progress">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`${s.dot} ${i < index ? s.done : i === index ? s.here : ""}`} />
          ))}
        </div>
      }
    >
      {/* Keyed on the step, so each one is a new node that animates in. */}
      <div key={stepKey ?? question} className={s.enter} data-dir={direction} data-testid="step">
        <div className={s.intro}>
          <h2 className={s.question}>{question}</h2>
          {sub !== undefined && <p className={s.sub}>{sub}</p>}
        </div>
        {arrived}
        {children}
        {detail}
      </div>
    </Shell>
  );
}

/** `n / m` against a limit, pinned directly above the action bar. */
export function Counter({ label, have, need }: { label: string; have: number; need: number }) {
  return (
    <>
      <span>{label}</span>
      <span className={`${s.count} ${have > need ? s.over : ""}`} data-testid="counter">
        {have} / {need}
      </span>
    </>
  );
}

/** A step that has just become relevant says so. It does not appear silently. */
export function Arrived({ children }: { children: ReactNode }) {
  return (
    <div className={s.arrived} data-testid="arrived" role="status">
      {children}
    </div>
  );
}

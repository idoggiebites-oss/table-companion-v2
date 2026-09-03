import type { ReactNode } from "react";
import s from "./Button.module.css";

type Tone = "quiet" | "ink" | "gold";

/** Every tappable thing is at least 44px. That is enforced in tier 2, not here. */
export function Button({
  tone = "quiet",
  onClick,
  disabled = false,
  children,
}: {
  tone?: Tone;
  onClick?: () => void;
  /** A control that does nothing must look like it. Silence is not feedback. */
  disabled?: boolean;
  children: ReactNode;
}) {
  const cls = [s.btn, tone === "gold" ? s.gold : tone === "ink" ? s.ink : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}

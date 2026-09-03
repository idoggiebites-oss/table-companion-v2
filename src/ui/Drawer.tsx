import type { ReactNode } from "react";
import s from "./Drawer.module.css";

/**
 * Opens OVER the panel rather than extending it.
 *
 * This is the mechanism that keeps the sheet inside its height budget. V1's
 * sheet reached 2,588px — about 3.9 screens — because reference material was
 * stacked below the live values, so the way to learn you were poisoned was to
 * scroll past your boots.
 */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className={s.scrim}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={s.panel}>
        <div className={s.head}>
          <span className={s.title}>{title}</span>
          <button type="button" className={s.close} onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

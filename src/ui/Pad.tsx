import { useEffect, useState } from "react";
import s from "./Pad.module.css";

/**
 * Tap the number you threw.
 *
 * Ported from V1's roll pad, and for its reasons. A stepper is fine for a
 * budget you nudge and wrong for a number you already have: recording eleven
 * damage should be one tap, not eleven.
 *
 * Pinned to the bottom of the viewport rather than placed in the page —
 * anywhere in the document flow makes the distance between what you tapped and
 * where you answer depend on where you happened to be scrolled, which matters
 * when the target is twenty small buttons.
 *
 * The app never rolls. It names the die, holds the modifier, and does the
 * arithmetic; the number comes from a person throwing something.
 */
export type PadMode = "normal" | "advantage" | "disadvantage";

const MODE_LABEL: Record<PadMode, string> = {
  normal: "Normal",
  advantage: "Advantage",
  disadvantage: "Disadvantage",
};

export function Pad({
  title, faces, ask, modifier, modes = false, onClose, onPick,
}: {
  title: string;
  /** How many faces the die has, or how far the grid counts. */
  faces: number;
  ask?: string;
  /** Shown, never folded in — a printed total that disagrees with the table's
      own arithmetic is worse than a line to read. */
  modifier?: number;
  modes?: boolean;
  onClose: () => void;
  onPick: (values: readonly number[], mode: PadMode) => void;
}) {
  const [mode, setMode] = useState<PadMode>("normal");
  const [held, setHeld] = useState<number[]>([]);
  const need = modes && mode !== "normal" ? 2 : 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tap = (face: number) => {
    const next = [...held, face];
    if (next.length < need) { setHeld(next); return; }
    setHeld([]);
    onPick(next, mode);
  };

  const prompt =
    ask ?? (need === 1
      ? `Tap what you threw.`
      : held.length === 0 ? "Two dice. Tap the first." : "Tap the second.");

  return (
    <div className={s.scrim} role="dialog" aria-modal="true" aria-label={title}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.pad} data-testid="pad">
        <div className={s.head}>
          <span className={s.title}>
            {title}
            {modifier !== undefined && (
              <span className={s.mod}> {modifier < 0 ? modifier : `+${modifier}`}</span>
            )}
          </span>
          <button type="button" className={s.close} onClick={onClose} aria-label="Close pad">Close</button>
        </div>

        {modes && (
          <div className={s.modes}>
            {(["normal", "advantage", "disadvantage"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={m === mode}
                      className={`${s.mode} ${m === mode ? s.on : ""}`}
                      onClick={() => { setMode(m); setHeld([]); }}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        )}

        <p className={s.ask}>{prompt}</p>

        <div className={s.grid}>
          {Array.from({ length: faces }, (_, i) => i + 1).map((face) => (
            <button key={face} type="button" aria-label={`${face}`}
                    className={`${s.face} ${held.includes(face) ? s.held : ""}`}
                    onClick={() => tap(face)}>
              {face}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

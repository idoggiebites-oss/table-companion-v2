import type { Prompt } from "./prompts";
import s from "./WhatNow.module.css";

/**
 * What to do about it, under what happened.
 *
 * Named for what it shows rather than for its module — `Prompts.tsx` beside a
 * `prompts.ts` differ only in casing, which this filesystem cannot tell apart.
 * `LastTime` and `WhatNow` are the pair, which is also what they are.
 *
 * Each row is a fact and the screen that answers it, and pressing one GOES
 * there. Nothing here moves anybody on its own — VISION law 7's own rule, and
 * the reason these are buttons rather than a redirect: the app can say a level
 * is waiting, and it cannot decide that now is when you want to take it.
 */
export function WhatNow({ prompts, onGo }: {
  prompts: readonly Prompt[];
  onGo: (tab: string) => void;
}) {
  if (prompts.length === 0) return null;
  return (
    <ul className={s.list} aria-label="What to do about it" data-testid="prompts">
      {prompts.map((p) => (
        <li key={p.id}>
          <button type="button" className={s.row} onClick={() => onGo(p.go)}>
            <span className={s.text}>{p.text}</span>
            {/* Where it goes, said before it is pressed. A row that moved you
                somewhere unnamed is a row nobody presses twice. */}
            <span className={s.where}>{p.where}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

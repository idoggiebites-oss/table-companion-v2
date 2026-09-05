import { useState } from "react";
import type { Stack } from "../../rules/5e/items";
import s from "./Give.module.css";

/**
 * Handing something to somebody at the table.
 *
 * The whole of Arturo's "share items with other party members (potions, share
 * x amount, supplies, equipment)", and the reason it takes a QUANTITY rather
 * than moving the stack: five potions between two people is the common case
 * and "give them all of it" is the rare one.
 *
 * It is not a trade. Nothing comes back, nobody accepts, and there is no
 * pending state — at a table you hand somebody a rope and say so, and the app
 * that made that a two-step negotiation would be slower than the table.
 * `holdings.ts` records one move; undo takes it back like anything else.
 */
export function Give({ stack, party, onGive, onClose }: {
  stack: Stack;
  party: readonly { readonly id: string; readonly name: string }[];
  onGive: (to: string, qty: number) => void;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const most = Math.max(1, stack.qty);
  return (
    <div className={s.wrap} role="group" aria-label={`Give ${stack.name}`} data-testid="give">
      {stack.qty > 1 && (
        <span className={s.count}>
          <button type="button" className={s.step} aria-label="One fewer"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span className={s.n} data-testid="give-qty">{Math.min(qty, most)}</span>
          <button type="button" className={s.step} aria-label="One more"
                  onClick={() => setQty((q) => Math.min(most, q + 1))}>+</button>
        </span>
      )}
      {party.map((p) => (
        <button key={p.id} type="button" className={s.to} data-testid="give-to"
                onClick={() => { onGive(p.id, Math.min(qty, most)); onClose(); }}>
          {p.name}
        </button>
      ))}
      <button type="button" className={s.never} onClick={onClose}>Never mind</button>
    </div>
  );
}

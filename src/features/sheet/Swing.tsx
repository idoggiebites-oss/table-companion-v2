import { useState } from "react";
import type { ResolvedAttack } from "../../rules/5e/attack";
import type { Combatant } from "../dm/fight";
import s from "./Swing.module.css";

/**
 * Saying what you rolled.
 *
 * BOTH numbers at once, deliberately. Tables roll to-hit and damage together
 * — "eighteen to hit, seven damage" — and asking for the damage only after
 * the DM has confirmed would put a round trip in the middle of somebody's
 * turn. V1's reason, kept.
 *
 * The app does not roll and does not judge. It carries what the player says
 * to the person who decides, which is the only division that keeps the
 * disclosure ladder intact: a player who could apply their own damage would
 * learn a creature's armour class by trial.
 *
 * The to-hit box is pre-filled with the derived bonus rather than the total,
 * because the player is about to add their d20 to it and a box that already
 * contained a guess at the whole answer would be one they had to correct.
 */
export function Swing({ attack, targets, onClaim, onCancel }: {
  attack: ResolvedAttack;
  targets: readonly Combatant[];
  onClaim: (targetId: string, toHit: number, damage: number) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const [toHit, setToHit] = useState("");
  const [damage, setDamage] = useState("");

  const ready = toHit.trim() !== "" && damage.trim() !== "" && target !== "";

  return (
    <form
      className={s.wrap}
      aria-label={`Swing ${attack.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onClaim(target, Number(toHit), Number(damage));
      }}
    >
      <label className={s.field}>
        <span className={s.tag}>at</span>
        <select className={s.pick} value={target} aria-label="What you are swinging at"
                onChange={(e) => setTarget(e.target.value)}>
          {targets.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <label className={s.field}>
        <span className={s.tag}>to hit</span>
        <input className={s.num} type="number" inputMode="numeric" value={toHit}
               aria-label="What you rolled to hit, with your bonus"
               placeholder={String(attack.toHit)} onChange={(e) => setToHit(e.target.value)} />
      </label>

      <label className={s.field}>
        <span className={s.tag}>damage</span>
        <input className={s.num} type="number" inputMode="numeric" value={damage}
               aria-label="How much damage you rolled"
               placeholder={attack.damage} onChange={(e) => setDamage(e.target.value)} />
      </label>

      <span className={s.row}>
        <button type="submit" className={s.send} disabled={!ready}>Tell the DM</button>
        <button type="button" className={s.cancel} onClick={onCancel}>Never mind</button>
      </span>
    </form>
  );
}

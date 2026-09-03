import { useState } from "react";
import type { ResolvedAttack } from "../../rules/5e/attack";
import type { Combatant } from "../dm/fight";
import { stanceFor, describeReasons } from "../../rules/5e/stance";
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
export function Swing({ attack, targets, mine = [], onClaim, onCancel }: {
  attack: ResolvedAttack;
  targets: readonly Combatant[];
  /** The conditions on the person swinging — half of what decides the dice. */
  mine?: readonly string[];
  onClaim: (targetId: string, toHit: number, damage: number) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const [toHit, setToHit] = useState("");
  const [damage, setDamage] = useState("");

  const ready = toHit.trim() !== "" && damage.trim() !== "" && target !== "";

  /*
   * How to roll, and why — said at the moment the dice are about to be picked
   * up, which is the only moment it is worth saying. "Advantage: the goblin is
   * prone" teaches the rule while it is being used; "Advantage" alone teaches
   * nothing, and silence teaches the table to work it out slowly and often
   * wrong.
   */
  const at = targets.find((c) => c.id === target);
  const how = at === undefined ? null : stanceFor({
    attacker: { name: "you", conditions: mine },
    target: { name: at.name, conditions: at.conditions },
    range: attack.range ?? "Melee",
  });

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

      {how !== null && (
        <p className={s.how} data-testid="stance" data-stance={how.stance}>
          {describeReasons(how.stance, how.reasons)}
        </p>
      )}

      <span className={s.row}>
        <button type="submit" className={s.send} disabled={!ready}>Tell the DM</button>
        <button type="button" className={s.cancel} onClick={onCancel}>Never mind</button>
      </span>
    </form>
  );
}

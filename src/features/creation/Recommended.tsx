import { ABILITY_NAME, type Ability } from "../../rules/5e/abilities";
import s from "./Recommended.module.css";

/**
 * The class's usual spread, offered rather than applied.
 *
 * Three rings, as drawn — the abilities that matter most, in order. It is a
 * suggestion and it says so: a wizard who wants a great sword is making a
 * choice, not a mistake.
 */
export function Recommended({
  klass, order, onApply,
}: {
  klass: string;
  order: readonly Ability[];
  onApply: () => void;
}) {
  return (
    <div className={s.card} data-testid="detail">
      <span className={s.label}>Recommended for {klass}</span>
      <div className={s.three}>
        {order.slice(0, 3).map((a) => (
          <span key={a} className={s.one}>
            <span className={s.ring}>{ABILITY_NAME[a].slice(0, 3).toUpperCase()}</span>
            <span className={s.short}>{ABILITY_NAME[a]}</span>
          </span>
        ))}
      </div>
      <button type="button" className={s.apply} onClick={onApply}>Apply recommended</button>
    </div>
  );
}

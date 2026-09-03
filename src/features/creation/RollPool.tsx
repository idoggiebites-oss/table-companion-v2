import s from "./RollPool.module.css";

/**
 * Six numbers, and then where they go.
 *
 * Ported from V1. The app never rolls: a person throws 4d6, drops the lowest,
 * and taps each total — which is why the pad counts 3 to 18 rather than 1 to
 * 20. Once six are in, they become a pool, and assigning is two taps: a value,
 * then an ability.
 */
export function RollPad({ left, onTap }: { left: number; onTap: (value: number) => void }) {
  return (
    <div className={s.block}>
      <p className={s.ask}>
        Roll <strong>4d6</strong>, drop the lowest, and tap each total. {left} to go.
      </p>
      <div className={s.pad}>
        {Array.from({ length: 16 }, (_, i) => i + 3).map((v) => (
          <button key={v} type="button" className={s.face} aria-label={`Total ${v}`} onClick={() => onTap(v)}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Pool({
  pool, picked, onPick,
}: {
  pool: readonly number[];
  picked: number | null;
  onPick: (index: number | null) => void;
}) {
  if (pool.length === 0) return null;
  return (
    <div className={s.pool} data-testid="pool">
      {pool.map((v, i) => (
        <button
          key={`${v}-${i}`}
          type="button"
          className={`${s.chip} ${picked === i ? s.on : ""}`}
          aria-label={`Value ${v}`}
          aria-pressed={picked === i}
          onClick={() => onPick(picked === i ? null : i)}
        >
          {v}
        </button>
      ))}
      <span className={s.hint}>tap a value, then an ability</span>
    </div>
  );
}

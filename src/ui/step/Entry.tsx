import { useState } from "react";
import s from "./Entry.module.css";

/**
 * A number you already know, typed.
 *
 * Stepping to 15 is seven presses to reach a value the person had in mind
 * before they opened the screen. The constraint still holds — it is enforced
 * on what was typed, and a refusal says why rather than silently rewriting
 * the number.
 */
export function NumberEntry({
  name, does, value, modifier, min, max, refuse, onChange,
}: {
  name: string;
  /** What this score actually changes. See `ABILITY_DOES`. */
  does?: string;
  value: number;
  modifier: string;
  min: number;
  max: number;
  /** Returns why this value cannot be taken, or null if it can. */
  refuse: (next: number) => string | null;
  onChange: (next: number) => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);

  const settle = (raw: string) => {
    setTyped(null);
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) { setWhy(null); return; }
    if (n < min || n > max) { setWhy(`${name} must be between ${min} and ${max}.`); return; }
    const no = refuse(n);
    setWhy(no);
    if (no === null) onChange(n);
  };

  return (
    <div className={s.entry}>
      <span className={s.stack}>
        <span className={s.name}>{name}</span>
        {does !== undefined && <span className={s.does}>{does}</span>}
      </span>
      <input
        className={`${s.field} ${why === null ? "" : s.refused}`}
        inputMode="numeric"
        aria-label={name}
        maxLength={2}
        value={typed ?? String(value)}
        onChange={(e) => { setTyped(e.target.value.replace(/[^0-9]/g, "")); setWhy(null); }}
        onBlur={(e) => settle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      />
      <span className={s.mod}>{modifier}</span>
      {why !== null && <p className={s.why} role="alert">{why}</p>}
    </div>
  );
}

/**
 * An ability holding a value taken from a pool, or waiting for one.
 *
 * The whole row is the target: tap a value in the pool, then tap the ability.
 * Tapping a filled one sends its value back.
 */
export function AbilitySlot({
  name, does, value, modifier, onTap,
}: {
  name: string;
  does?: string;
  value: number | undefined;
  modifier: string;
  onTap: () => void;
}) {
  return (
    <button type="button" className={s.slot} onClick={onTap} aria-label={name}>
      <span className={s.stack}>
        <span className={s.name}>{name}</span>
        {does !== undefined && <span className={s.does}>{does}</span>}
      </span>
      <span className={`${s.box} ${value === undefined ? s.waiting : s.filled}`}>
        {value ?? "—"}
      </span>
      <span className={s.mod}>{value === undefined ? "" : modifier}</span>
    </button>
  );
}


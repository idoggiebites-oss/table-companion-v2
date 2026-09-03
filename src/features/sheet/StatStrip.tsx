import { signed } from "../../rules/5e/abilities";
import { proficiency } from "../../rules/5e/skills";
import { acFor, initiative } from "../../rules/5e/defence";
import { BLOODIED } from "../../rules/5e/vitals";
import { scoresOf, type Build } from "../creation/model";
import type { Vitals } from "./model";
import s from "./StatStrip.module.css";

/** What is true right now, in one strip: five numbers a table asks for. */
export function StatStrip({ build, vitals }: { build: Build; vitals: Vitals }) {
  const { health } = vitals;
  /*
   * The sum rides along as the cell's title. A capped Dexterity bonus is the
   * commonest reason a player's own arithmetic disagrees with the sheet, and
   * the strip has room for a number, not a sentence — Overview says it in
   * full.
   */
  const ac = acFor(build.worn, scoresOf(build));
  const pct = Math.round((health.hp / Math.max(1, health.max)) * 100);
  const tone = health.hp === 0 ? s.down : BLOODIED(health) ? s.bloodied : s.unharmed;

  return (
    <div className={s.strip} data-testid="vitals">
      <span className={s.cell}>
        <span className={s.label}>HP</span>
        <span className={`${s.value} ${health.hp === 0 ? s.hurt : ""}`}>
          {health.hp}<span className={s.of}> / {health.max}</span>
          {health.temp > 0 && <span className={s.of}> +{health.temp}</span>}
        </span>
        <span className={s.bar}><span className={`${s.fill} ${tone}`} style={{ width: `${pct}%` }} /></span>
      </span>
      <Cell label="AC" value={String(ac.value)} title={ac.from} />
      <Cell label="Initiative" value={signed(initiative(scoresOf(build)))} />
      <Cell label="Speed" value={`${build.speed} ft.`} />
      <Cell label="Prof bonus" value={signed(proficiency(build.level))} />
    </div>
  );
}

function Cell({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <span className={s.cell} {...(title === undefined ? {} : { title })}>
      <span className={s.label}>{label}</span>
      <span className={s.value}>{value}</span>
    </span>
  );
}

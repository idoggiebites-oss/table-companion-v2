import { LevelShield } from "../../ui/Icon";
import { maxHitPoints } from "../../rules/5e/vitals";
import { nextThreshold } from "../../rules/5e/progression";
import { portraitFor } from "./portraits";
import { STANDARD } from "./lineage";
import { primary, scoresOf, type Build } from "./model";
import s from "./Hero.module.css";

/** The character you are in the middle of, and what is true about them. */
export function Hero({ build, onOpen }: { build: Build; onOpen: () => void }) {
  // The rolls count here too, the same as everywhere else.
  const max = maxHitPoints(build.classes, scoresOf(build).con, build.hp);
  const next = nextThreshold(build.level);
  // The names the person saw, not the ids the rules join on.
  const lineage = build.names["subrace"];
  const ancestry = build.names["ancestry"];
  const klass = build.names["class"] ?? primary(build);
  const art = ancestry === undefined ? undefined : portraitFor(ancestry, lineage);
  /*
   * "Dragonborn (base) Dragonborn" — a lineage that IS the ancestry adds
   * nothing, and the compendium's own word for it is "(base)".
   */
  /* `(base)` is what characters built before the label became "Standard"
     carry, and their names were recorded at the time. Both still read as the
     plain one. */
  const plain = lineage === undefined || lineage === STANDARD
    || /\(base\)$/.test(lineage) || lineage === ancestry;
  const who = plain ? ancestry : `${lineage} ${ancestry}`;
  const kind = [who, klass].filter(Boolean).join(" • ");

  return (
    <button
      type="button"
      className={s.hero}
      onClick={onOpen}
      data-testid="hero"
      /* The card IS the way into the current character. Without a name it is
         a picture nobody can find by asking for it. */
      aria-label={`Open ${build.identity["name"] ?? "unnamed character"}`}
    >
      {art === undefined
        ? <span className={s.heroArt} />
        : <img className={s.heroArt} src={art} alt="" aria-hidden="true" />}
      <span className={s.heroBody}>
        <span className={s.heroTop}>
          <span className={s.heroWho}>
            <span className={s.heroName}>{build.identity["name"] ?? "Unnamed"}</span>
            <span className={s.heroKind}>{kind || "No ancestry yet"}</span>
          </span>
          <span className={s.heroLevel}>
            <span className={s.levelLabel}>LEVEL</span>
            <LevelShield level={build.level} size={38} />
          </span>
        </span>
        <span className={s.vitals}>
          <Vital label="HP" value={String(max)} of={`/ ${max}`} pct={100} tone={s.hp} />
          <span />
          {/*
            * What the next level COSTS, not a total nobody is counting.
            * This said "0 / 300" at every level — wrong twice over: no
            * experience is tracked anywhere, and 300 is the level-2
            * threshold, so a third-level character was told they were 300
            * from their next level when the answer is 2,700.
            */}
          {next === null
            ? <Vital label="Level" value="Max" of="" pct={100} tone={s.xp} />
            : <Vital label="Next level" value={next.at.toLocaleString()} of="XP" pct={0} tone={s.xp} />}
        </span>
      </span>
    </button>
  );
}

function Vital({ label, value, of, pct, tone }: {
  label: string; value: string; of: string; pct: number;
  /** A CSS-module class is `string | undefined` under strict lookups. */
  tone: string | undefined;
}) {
  return (
    <span className={s.vital}>
      <span className={s.vitalLabel}>{label}</span>
      <span className={s.vitalValue}>{value}<span className={s.of}> {of}</span></span>
      <span className={s.meter}><span className={`${s.fill} ${tone}`} style={{ width: `${pct}%` }} /></span>
    </span>
  );
}

import { LevelShield, Icon } from "../../ui/Icon";
import { portraitFor } from "../creation/portraits";
import { primary, type Build } from "../creation/model";
import { STANDARD } from "../creation/lineage";
import { nextThreshold } from "../../rules/5e/progression";
import s from "./Identity.module.css";

/** Who they are, before anything that can change during a session. */
export function Identity({ build, xp = 0 }: {
  build: Build;
  /** Experience held, seeded from the level they hold — see `dm/xp.ts`. */
  xp?: number;
}) {
  const next = nextThreshold(build.level);
  const ancestry = build.names["ancestry"];
  const lineage = build.names["subrace"];
  const klass = build.names["class"] ?? primary(build);
  /* The words the person saw. Reading the id put "Wizard (order-of-scribes)"
     on the sheet — the id leaking through to a person. */
  const path = build.names["subclass"] ?? build.classes[0]?.subclass;
  /* The third place this rule lives, with Hero and ReviewStep. `(base)` is
     what characters built before the label became "Standard" carry. */
  const plain = lineage === undefined || lineage === STANDARD
    || /\(base\)$/.test(lineage) || lineage === ancestry;
  const art = ancestry === undefined ? undefined : portraitFor(ancestry, lineage);

  const kind = [
    plain ? ancestry : `${lineage} ${ancestry}`,
    path == null ? klass : `${klass} (${path})`,
  ].filter(Boolean).join(" • ");

  return (
    <div className={s.card} data-testid="identity">
      {art === undefined
        ? <span className={s.portrait} />
        : <img className={s.portrait} src={art} alt="" aria-hidden="true" />}
      <span className={s.who}>
        <span className={s.name}>{build.identity["name"] ?? "Unnamed"}</span>
        <span className={s.kind}>{kind || "Not yet built"}</span>
        {build.identity["alignment"] !== undefined && (
          <span className={s.align}><Icon name="spark" size={14} />{build.identity["alignment"]}</span>
        )}
      </span>
      <span className={s.level}>
        <span className={s.levelLabel}>LEVEL</span>
        <LevelShield level={build.level} size={40} />
        {/*
          * The real number, and only where there is one.
          *
          * This was the literal string "0 / 300" — the exact bug `Hero.tsx`
          * documented fixing, sitting unfixed one screen over: 300 is the
          * LEVEL-2 threshold, so a fifth-level character was told they were
          * 300 from their next level when the answer is 14,000. Nothing was
          * tracking experience then. Task 62 changed that.
          *
          * A milestone table counts none of this, so a total nobody is
          * counting is not drawn at all.
          */}
        {next !== null && xp > 0 && (
          <>
            <span className={s.xpLabel}>XP</span>
            <span className={s.xp}>{xp.toLocaleString()} / {next.at.toLocaleString()}</span>
          </>
        )}
      </span>
    </div>
  );
}

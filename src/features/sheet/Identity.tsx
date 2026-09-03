import { LevelShield, Icon } from "../../ui/Icon";
import { portraitFor } from "../creation/portraits";
import { primary, type Build } from "../creation/model";
import { STANDARD } from "../creation/lineage";
import s from "./Identity.module.css";

/** Who they are, before anything that can change during a session. */
export function Identity({ build }: { build: Build }) {
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
        <span className={s.xpLabel}>XP</span>
        <span className={s.xp}>0 / 300</span>
      </span>
    </div>
  );
}

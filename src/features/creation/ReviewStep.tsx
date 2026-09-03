import { StepShell } from "../../ui/step/StepShell";
import { Button, ButtonRow } from "../../ui/Button";
import { ABILITIES, ABILITY_NAME, modifier, signed } from "../../rules/5e/abilities";
import { STANDARD } from "./lineage";
import { SKILLS } from "../../rules/5e/skills";
import { maxHitPoints } from "../../rules/5e/vitals";
import { acFor } from "../../rules/5e/defence";
import type { Build } from "./model";
import { scoresOf, featsOf } from "./scores";
import { languagesOf, toolsOf } from "./proficiency";
import s from "./ReviewStep.module.css";

/**
 * The last screen: everything chosen, and anything still open.
 *
 * V1 had this and V2 did not. V1's version was a `gaps` list drawing on
 * eleven sources that blocked Finish — necessary there, because its screens
 * could be answered out of order. V2's steps each refuse to continue until
 * they are answered, so a gap here is not "you skipped something"; it is
 * something the BOOK left open that the app could not close, which is a
 * different thing and is worth saying rather than blocking.
 *
 * So this confirms rather than gates. The one thing it will not do is claim a
 * number it did not derive.
 */
export function ReviewStep({ build, onContinue, ...c }: {
  title: string; question: string; sub?: string;
  index: number; total: number;
  stepKey?: string | undefined;
  direction?: "forward" | "back" | undefined;
  build: Build;
  onBack?: () => void;
  onContinue: () => void;
}) {
  const scores = scoresOf(build);
  const ac = acFor(build.worn, scores);
  const hp = maxHitPoints(build.classes, scores.con, build.hp);
  const said = (step: string, fallback: string) => build.names[step] ?? fallback;
  /* The same rule the sheet uses: a group with one lineage labels it "(base)",
     which is a data artefact and not a thing anybody calls themselves. */
  const ancestry = build.names["ancestry"];
  const lineage = build.names["subrace"];
  /* `(base)` is what characters built before the label became "Standard"
     carry, and their names were recorded at the time. Both still read as the
     plain one. */
  const plain = lineage === undefined || lineage === STANDARD
    || /\(base\)$/.test(lineage) || lineage === ancestry;
  const kind = plain ? ancestry ?? "No ancestry" : `${lineage} ${ancestry ?? ""}`.trim();

  const trained = SKILLS.filter((k) => build.skills.includes(k.id));
  const spoken = languagesOf(build);
  const used = toolsOf(build);
  const feats = featsOf(build);

  /* Not "you forgot something" — every step refuses to continue until it is
     answered. These are the things the book leaves open, or that this
     compendium could not state. */
  const open: string[] = [];
  if (build.equipment.length === 0) open.push("This class states no starting equipment.");
  if (build.classes.length === 0) open.push("No class chosen.");
  if (spoken.length === 0) open.push("No language recorded — the ancestry's trait did not state one.");

  return (
    <StepShell
      stepKey={c.stepKey} direction={c.direction}
      title={c.title} question={c.question} index={c.index} total={c.total}
      {...(c.sub === undefined ? {} : { sub: c.sub })}
      {...(c.onBack === undefined ? {} : { onBack: c.onBack })}
      actions={
        <ButtonRow>
          {c.onBack !== undefined && <Button onClick={c.onBack}>Back</Button>}
          <Button tone="gold" onClick={onContinue}>Finish</Button>
        </ButtonRow>
      }
    >
      <div className={s.card} data-testid="review">
        <span className={s.name}>{build.identity["name"] ?? "Unnamed"}</span>
        <span className={s.line}>
          {kind}
          {" · "}
          {build.classes.map((k) => `${said("class", k.id)} ${k.level}`).join(" / ")}
          {build.background === null ? "" : ` · ${said("background", build.background)}`}
        </span>

        <div className={s.scores}>
          {ABILITIES.map((a) => (
            <span key={a} className={s.score}>
              <span className={s.abbr}>{a.toUpperCase()}</span>
              <span className={s.num}>{scores[a]}</span>
              <span className={s.mod}>{signed(modifier(scores[a]))}</span>
            </span>
          ))}
        </div>

        <Row label="Hit points" value={String(hp)} />
        {/* The sum, not just the number — the same reason the sheet says it. */}
        <Row label="Armour class" value={`${String(ac.value)} — ${ac.from}`} />
        <Row label="Speed" value={`${String(build.speed - ac.speedPenalty)} ft.`} />
        {trained.length > 0 && <Row label="Skills" value={trained.map((k) => k.name).join(", ")} />}
        {build.style !== null && <Row label="Fighting style" value={said("style", build.style)} />}
        {feats.length > 0 && <Row label="Feats" value={feats.join(", ")} />}
        {spoken.length > 0 && <Row label="Languages" value={spoken.join(", ")} />}
        {used.length > 0 && <Row label="Tools" value={used.join(", ")} />}
        {build.equipment.length > 0 && (
          <Row label="Carried" value={[...build.equipment, ...build.weapons].join("; ")} />
        )}
        {/* What the class offers instead. Recorded rather than offered as a
            mode: swapping the kit for gold is a whole second flow, and saying
            the number beats pretending the choice does not exist. */}
        {build.wealth !== null && (
          <Row label="Or, instead of the kit"
               value={`roll ${build.wealth.replace(/x/i, " × ")} gold pieces`} />
        )}
      </div>

      {open.length > 0 && (
        <div className={s.card} data-testid="open">
          <span className={s.label}>Left open by the book</span>
          {open.map((o) => <span key={o} className={s.note}>{o}</span>)}
        </div>
      )}
    </StepShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <span className={s.row}>
      <span className={s.label}>{label}</span>
      <span className={s.value}>{value}</span>
    </span>
  );
}

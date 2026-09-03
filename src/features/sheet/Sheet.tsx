import { useState, type ReactNode } from "react";
import { Shell } from "../../ui/Shell";
import { Button, ButtonRow } from "../../ui/Button";
import { Drawer } from "../../ui/Drawer";
import { Pad } from "../../ui/Pad";
import { Crest } from "../../ui/Icon";
import { Segmented } from "../../ui/step/Controls";
import { CONDITIONS, conditionById } from "../../rules/5e/conditions";
import { SKILLS, proficiency } from "../../rules/5e/skills";
import { modifier, signed } from "../../rules/5e/abilities";
import type { Item } from "../../rules/5e/items";
import type { Choice } from "../creation/choices";
import { Identity } from "./Identity";
import { StatStrip } from "./StatStrip";
import { Overview } from "./Overview";
import { Inventory } from "./Inventory";
import { diceLeft, type Vital, type Vitals } from "./model";
import { waitingOn } from "./waiting";
import type { Build } from "../creation/model";
import { scoresOf } from "../creation/scores";
import s from "./Sheet.module.css";

type Tab = "overview" | "combat" | "inventory" | "notes";
type Asking = { kind: "damage" } | { kind: "heal" } | { kind: "hitdie"; die: number } | null;

/**
 * Ordered by the questions it raises (law 7), wearing the concept's clothes:
 * who they are, what is waiting, what you can do about it, what is true right
 * now, and only then what they are — which is the Overview tab.
 */
export function Sheet({
  build, vitals, name, onAct, onBack, onLevelUp, nav, features = [],
  catalogue = [], catalogueLoading = false, onChoose,
}: {
  build: Build;
  vitals: Vitals;
  name: string;
  onAct: (v: Vital) => void;
  onBack: () => void;
  /** The one navigation, computed by whoever knows the state. See `TabBar`. */
  nav?: ReactNode;
  /** The item catalogue, loaded by the screen above when this tab opens. */
  catalogue?: readonly Item[];
  catalogueLoading?: boolean;
  /** Equipping is an event like everything else. */
  onChoose?: (c: Choice) => void;
  /** Gained features, loaded per class by the screen above. */
  features?: readonly { readonly level: number; readonly names: readonly string[] }[];
  onLevelUp?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [conditions, setConditions] = useState(false);
  const [allSkills, setAllSkills] = useState(false);
  const [asking, setAsking] = useState<Asking>(null);
  const ask = asking;
  const { health } = vitals;

  /* One rule, two readers: the sheet says it, the tab that leads here dots. */
  const waiting = waitingOn(vitals);

  return (
    <Shell
      title={name}
      lead={<button type="button" className={s.icon} onClick={onBack} aria-label="Back">‹</button>}
      trail={<span className={s.icon} aria-hidden="true"><Crest size={26} /></span>}
      below={nav}
      actions={
        <ButtonRow>
          <Button onClick={() => onAct({ act: "rest", length: "short" })}>Short rest</Button>
          <Button onClick={() => onAct({ act: "rest", length: "long" })}>Long rest</Button>
          {onLevelUp !== undefined && <Button tone="gold" onClick={onLevelUp}>Level up</Button>}
        </ButtonRow>
      }
    >
      <Identity build={build} />

      {waiting.length > 0 && (
        <div className={s.waiting} data-testid="waiting">
          <span className={s.waitingLabel}>Waiting on you</span>
          {waiting.map((w) => <span key={w} className={s.note}>{w}</span>)}
          {health.dying && (
            <div className={s.row}>
              <button type="button" className={s.chip}
                      onClick={() => onAct({ act: "death", result: "success" })}>Save made</button>
              <button type="button" className={s.chip}
                      onClick={() => onAct({ act: "death", result: "failure" })}>Save failed</button>
            </div>
          )}
        </div>
      )}

      <div className={s.record} data-testid="actions">
        <div className={s.row}>
          <button type="button" className={s.chip} onClick={() => setAsking({ kind: "damage" })}>Damage</button>
          <button type="button" className={s.chip} onClick={() => setAsking({ kind: "heal" })}>Heal</button>
          <button type="button" className={s.chip} onClick={() => setConditions(true)}>Conditions…</button>
          {diceLeft(build, vitals).map((d) => (
            <button key={d.die} type="button" className={s.chip} disabled={d.left === 0}
                    onClick={() => setAsking({ kind: "hitdie", die: d.die })}>
              d{d.die} · {d.left}/{d.total}
            </button>
          ))}
        </div>
        {vitals.conditions.length > 0 && (
          <div className={s.row}>
            {vitals.conditions.map((c) => (
              <button key={c} type="button" className={`${s.chip} ${s.on}`}
                      onClick={() => onAct({ act: "condition", id: c, on: false })}>
                {conditionById(c)?.name ?? c}
              </button>
            ))}
          </div>
        )}
      </div>

      <StatStrip build={build} vitals={vitals} />

      <Segmented
        label="Sheet sections"
        value={tab}
        onChange={setTab}
        options={[
          { id: "overview" as const, label: "Overview" },
          { id: "combat" as const, label: "Combat" },
          { id: "inventory" as const, label: "Inventory" },
          { id: "notes" as const, label: "Notes" },
        ]}
      />

      {tab === "overview" && (
        <Overview build={build} features={features} onAllSkills={() => setAllSkills(true)} />
      )}
      {tab === "inventory" && (
        <Inventory build={build} catalogue={catalogue} loading={catalogueLoading}
                   {...(onChoose === undefined ? {} : { onAct: onChoose })} />
      )}
      {tab !== "overview" && tab !== "inventory" && (
        <p className={s.note} data-testid="soon">
          {tab === "combat" ? "Attacks and reactions arrive with the fight."
            : "Notes live in the log, so they survive a lost phone."}
        </p>
      )}

      {ask !== null && (
        <Pad
          title={ask.kind === "hitdie" ? `Hit die d${ask.die}` : ask.kind === "heal" ? "Healing" : "Damage"}
          faces={ask.kind === "hitdie" ? ask.die : 30}
          ask={ask.kind === "hitdie" ? "Tap what the die showed." : "Tap the number."}
          onClose={() => setAsking(null)}
          onPick={([n]) => {
            const value = n ?? 0;
            if (ask.kind === "damage") onAct({ act: "damage", n: value });
            else if (ask.kind === "heal") onAct({ act: "heal", n: value });
            else onAct({ act: "hitdie", die: ask.die, rolled: value });
            setAsking(null);
          }}
        />
      )}

      {allSkills && (
        <Drawer title="Skills" onClose={() => setAllSkills(false)}>
          {SKILLS.map((k) => {
            const trained = build.skills.includes(k.id);
            return (
              <span key={k.id} className={s.row}>
                <span className={s.note}>{k.name}{trained ? " · trained" : ""}</span>
                <span className={s.note}>
                  {signed(modifier(scoresOf(build)[k.ability]) + (trained ? proficiency(build.level) : 0))}
                </span>
              </span>
            );
          })}
        </Drawer>
      )}

      {conditions && (
        <Drawer title="Conditions" onClose={() => setConditions(false)}>
          {CONDITIONS.map((c) => {
            const on = vitals.conditions.includes(c.id);
            return (
              <button key={c.id} type="button" className={`${s.chip} ${on ? s.on : ""}`}
                      onClick={() => onAct({ act: "condition", id: c.id, on: !on })}>
                {c.name} — {c.effect}
              </button>
            );
          })}
        </Drawer>
      )}
    </Shell>
  );
}

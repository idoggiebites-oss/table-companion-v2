import { useState } from "react";
import { resolveAttack, attackFromWeapon, type Attack } from "../../rules/5e/attack";
import { proficiency } from "../../rules/5e/skills";
import { signed, type Scores } from "../../rules/5e/abilities";
import type { Item } from "../../rules/5e/items";
import type { Vital } from "./model";
import { visibleTo, type Fight, type Act as FightAct } from "../dm/fight";
import { Swing } from "./Swing";
import s from "./Attacks.module.css";

/**
 * What this character swings, and what it takes to hit with it.
 *
 * The number on screen is DERIVED at read time and never stored. That is the
 * whole reason this asks for the ability and for proficiency rather than for
 * the bonus: a "+7" typed in once stays +7 through the level-up that should
 * have made it +8, and nothing ever says so. V1 learned this and asks the same
 * two questions.
 *
 * Where V2 goes further than V1: it has the catalogue open, so an equipped
 * weapon can be offered already filled in — its dice, its damage type, and
 * whether it is finesse. The player still owns the answer, because proficiency
 * is a fact about the character and the app cannot see the whole of it: the
 * sheet has no class content loaded, and guessing from the class alone gets a
 * bard's simple weapons wrong.
 */
export function Attacks({ attacks, scores, level, catalogue, carried, onAct, fight, onFight, who, whoName }: {
  attacks: readonly Attack[];
  scores: Scores;
  level: number;
  catalogue: readonly Item[];
  /** Item ids the character is carrying — not only what is in hand. */
  carried: readonly string[];
  onAct: (a: Vital) => void;
  /** Present only while a fight is running — you swing AT something. */
  fight?: Fight;
  onFight?: (a: FightAct) => void;
  who?: string;
  whoName?: string;
}) {
  const [swinging, setSwinging] = useState<string | null>(null);

  /* Only what a player is allowed to see. A hidden creature is not a target,
     because knowing it is there is the thing the ladder is protecting. */
  const targets = (fight?.phase === "active" ? fight.combatants : [])
    .filter((c) => visibleTo(false, c) && c.source.kind === "creature");
  const [adding, setAdding] = useState(false);
  const prof = proficiency(level);

  /* Anything CARRIED that can be swung, not only what is in hand: a dagger in
     the pack is still a thing you attack with, and a sheet that refused to
     list it would be asking the player to re-equip before they can write down
     what they already own. */
  const offers = catalogue.filter(
    (i) => carried.includes(i.id)
      && (i.category ?? "").toLowerCase() === "weapon"
      && !attacks.some((a) => a.name === i.name),
  );

  return (
    <section className={s.wrap} aria-label="Attacks">
      {attacks.length === 0 && !adding && (
        <p className={s.empty} data-testid="no-attacks">
          Nothing yet. Add what you swing and the numbers follow your level.
        </p>
      )}

      <ul className={s.list} data-testid="attacks">
        {attacks.map((a) => {
          const r = resolveAttack(a, scores, prof);
          return (
            <li key={a.name} className={s.row} data-testid="attack">
              <span className={s.name}>{a.name}</span>
              {/* The column that stayed absent until something real backed it:
                  a fabricated +7 beside a real 1d8 is worse than no column. */}
              <span className={s.toHit} data-testid="to-hit">{signed(r.toHit)}</span>
              <span className={s.dmg}>{r.damage} {r.damageType}</span>
              <button type="button" className={s.prof} aria-pressed={a.proficient}
                      aria-label={`Proficient with ${a.name}`}
                      onClick={() => onAct({ act: "attack", attack: { ...a, proficient: !a.proficient } })}>
                {a.proficient ? "proficient" : "not proficient"}
              </button>
              {targets.length > 0 && (
                <button type="button" className={s.swing} aria-label={`Swing ${a.name}`}
                        onClick={() => setSwinging(swinging === a.name ? null : a.name)}>Swing</button>
              )}
              <button type="button" className={s.drop} aria-label={`Put down ${a.name}`}
                      onClick={() => onAct({ act: "unattack", name: a.name })}>×</button>
              {swinging === a.name && (
                <Swing attack={r} targets={targets} onCancel={() => setSwinging(null)}
                       onClaim={(targetId, toHit, damage) => {
                         onFight?.({ act: "claim", claim: {
                           id: `${who ?? ""}-${a.name}-${String(Date.now())}`,
                           who: who ?? "", whoName: whoName ?? "Someone",
                           targetId, weapon: a.name, toHit, damage, damageType: r.damageType,
                         } });
                         setSwinging(null);
                       }} />
              )}
            </li>
          );
        })}
      </ul>

      {adding && (
        <div className={s.offers} role="group" aria-label="Add an attack">
          {offers.length === 0 ? (
            <p className={s.empty}>No weapon in your pack. Anything you pick up will show here.</p>
          ) : offers.map((i) => (
            <button key={i.id} type="button" className={s.offer}
                    onClick={() => {
                      onAct({ act: "attack", attack: attackFromWeapon({
                        name: i.name,
                        ...(i.weaponRange === undefined ? {} : { range: i.weaponRange }),
                        damage: [i.damage, i.damageType].filter(Boolean).join(" "),
                        properties: i.properties ?? [],
                      }, true) });
                      setAdding(false);
                    }}>{i.name}</button>
          ))}
        </div>
      )}

      <button type="button" className={s.add} aria-expanded={adding}
              onClick={() => setAdding((v) => !v)}>
        {adding ? "Never mind" : "Add an attack"}
      </button>
    </section>
  );
}

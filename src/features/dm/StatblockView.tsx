import type { Statblock } from "./creatures";
import {
  ABILITIES, abilityMod, actionNumbers, isActionable, modifierList,
  sensesText, speedText, type Entry,
} from "./statblock";
import type { Option } from "../../content/legendary";
import s from "./StatblockView.module.css";

/**
 * Everything a creature can do, on the screen the DM cannot leave.
 *
 * **Nothing here rolls, and nothing here is a button.** V1 made an entry that
 * names dice tappable, and tapping routed into two flows V2 has not ported:
 * `savefrom`, which reads a DC out of the prose, and the swing walkthrough
 * that `stance.ts` names as missing. A button whose handler has nowhere to go
 * is exactly the defect this task exists to fix — `statblock()` was written
 * and never called — so the distinction V1 drew survives as *typography*
 * rather than as a control: an entry that names numbers prints them on their
 * own line, above the prose, where they can be read at arm's length. The tap
 * arrives with the flow it needs.
 *
 * The identity line comes from the caller because it lives in the index row,
 * not the detail file. The fight has the name and the AC on the combatant
 * already and does not load 141KB of index to caption one goblin.
 */
export function StatblockView({ block, head }: {
  readonly block: Statblock;
  /** "Large dragon · AC 19 (natural armor) · 195 hp" — whatever the caller knows. */
  readonly head?: string;
}) {
  const senses = sensesText(block.senses);
  const speed = speedText(block.speed);
  return (
    <div className={s.wrap} data-testid="statblock">
      <p className={s.line}>
        {[head, block.alignment].filter((x) => x !== undefined && x !== "").join(" · ")}
      </p>
      <div className={s.abilities}>
        {ABILITIES.map((a) => {
          const score = block.abilities[a];
          return score === undefined ? null : (
            <div key={a} className={s.ability}>
              <span className={s.abbr}>{a}</span>
              <span className={s.score}>{score}</span>
              <span className={s.mod}>{abilityMod(score)}</span>
            </div>
          );
        })}
      </div>
      <dl className={s.meta}>
        <Fact label="Hit dice" value={block.hitDice} />
        <Fact label="Speed" value={speed} />
        <Fact label="Saves" value={modifierList(block.saves)} />
        <Fact label="Skills" value={modifierList(block.skills)} />
        <Fact label="Immune" value={(block.immunities ?? []).join(", ")} />
        <Fact label="Senses" value={senses} />
        <Fact label="Languages" value={block.languages} />
      </dl>
      <Block title="Traits" entries={block.traits} />
      <Block title="Actions" entries={block.actions} />
      <Block title="Reactions" entries={block.reactions} />
      <Legendary options={block.legendary} />
      {block.lair !== null && (
        /* Its own block because it acts on its own initiative count, and a DM
           who has forgotten that is the reason the number is in the heading. */
        <section className={s.block}>
          <h4 className={s.head}>Lair actions · initiative {block.lair.at}</h4>
          <p className={s.desc}>{block.lair.text}</p>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (value === "") return null;
  return (
    <div className={s.fact}>
      <dt className={s.label}>{label}</dt>
      <dd className={s.value}>{value}</dd>
    </div>
  );
}

function Block({ title, entries }: { title: string; entries: readonly Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className={s.block}>
      <h4 className={s.head}>{title}</h4>
      {entries.map((e) => (
        <div className={s.entry} key={e.name}>
          <p className={s.name}>{e.name}</p>
          {/* The numbers first and alone. A DM reading "+14 to hit · 2d10+8
              piercing" off a line of its own is the whole point; buried in
              the sentence it is the thing they leave the fight to look up. */}
          {isActionable(e) && <p className={s.numbers}>{actionNumbers(e)}</p>}
          {/* The prose is never dropped in favour of the numbers, because the
              numbers are a SUMMARY. The build parse takes one damage clause,
              so an Adult Red Dragon's bite summarises as "2d10+8 piercing" and
              the "plus 7 (2d6) fire damage" rider lives only in the sentence
              below it. Same for reach, targets and riders on a save. */}
          {e.desc !== undefined && e.desc !== "" && <p className={s.desc}>{e.desc}</p>}
        </div>
      ))}
    </section>
  );
}

function Legendary({ options }: { options: readonly Option[] }) {
  if (options.length === 0) return null;
  return (
    <section className={s.block}>
      <h4 className={s.head}>Legendary actions</h4>
      {options.map((o) => (
        <div className={s.entry} key={o.name}>
          <p className={s.name}>
            {o.name}
            {/* The book prints "(Costs 2 Actions)" only on the ones that cost
                more, and so does this — a "costs 1" on every row is noise. */}
            {o.cost > 1 && <span className={s.cost}>costs {o.cost}</span>}
          </p>
          <p className={s.desc}>{o.desc}</p>
        </div>
      ))}
    </section>
  );
}

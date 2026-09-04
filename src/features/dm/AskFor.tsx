import { useState } from "react";
import { ABILITIES, ABILITY_NAME, type Ability } from "../../rules/5e/abilities";
import { SKILLS } from "../../rules/5e/skills";
import type { Ask } from "../room/ask";
import s from "./AskFor.module.css";

/**
 * "Everyone roll Perception."
 *
 * The DM's half of the seam `nudge.ts` has been waiting for. V1's `checks.ts`
 * is the model and its shape is the interesting part: an ask names a skill, a
 * number to beat, and WHO — because *"everyone roll Perception"* and *"Bree,
 * roll Perception"* are different moments and the second one is the one a
 * player misses when they are looking at the table instead of their phone.
 *
 * **Nobody is selected by default and that means everybody.** A DM who taps
 * nothing has asked the table, which is what they say most of the time — and
 * making them tick four names to do the common thing would be the app charging
 * for its own model.
 *
 * **The DC is optional, deliberately.** Announcing it tells the table how hard
 * something is before anybody commits, which is sometimes the point and
 * sometimes exactly not. The app does not decide which.
 */
export function AskFor({ party, onAsk, onClose }: {
  party: readonly { readonly id: string; readonly name: string }[];
  onAsk: (ask: Omit<Ask, "id">) => void;
  onClose: () => void;
}) {
  const [skill, setSkill] = useState<string>("perception");
  const [dc, setDc] = useState("");
  const [flavour, setFlavour] = useState("");
  const [who, setWho] = useState<readonly string[]>([]);

  /* A bare ability is a real ask — "roll a Strength save" names no skill. */
  const chosen = SKILLS.find((x) => x.id === skill);
  const ability: Ability = chosen?.ability ?? (skill as Ability);
  const name = chosen?.name ?? ABILITY_NAME[ability];
  const dcValue = Number(dc.trim());

  return (
    <section className={s.wrap} aria-label="Ask for a roll" data-testid="ask-for">
      <label className={s.field}>
        <span className={s.label}>What</span>
        <select className={s.select} value={skill} data-testid="ask-skill"
                onChange={(e) => setSkill(e.target.value)}>
          {SKILLS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          {ABILITIES.map((a) => (
            <option key={a} value={a}>{ABILITY_NAME[a]} (bare)</option>
          ))}
        </select>
      </label>

      <label className={s.field}>
        <span className={s.label}>Against</span>
        <input className={s.dc} type="number" inputMode="numeric" value={dc}
               placeholder="no DC" aria-label="Difficulty class, if you are saying it"
               data-testid="ask-dc" onChange={(e) => setDc(e.target.value)} />
      </label>

      <label className={s.field}>
        <span className={s.label}>Say</span>
        <input className={s.flavour} value={flavour} data-testid="ask-flavour"
               placeholder="You scan the ruins for hidden details."
               aria-label="What you are telling them"
               onChange={(e) => setFlavour(e.target.value)} />
      </label>

      {/* Nobody ticked is the whole table — said out loud rather than left to
          be discovered, because an empty selection reads as an unfinished form. */}
      <div className={s.who} role="group" aria-label="Who is rolling">
        {party.map((p) => {
          const on = who.includes(p.id);
          return (
            <button key={p.id} type="button" data-testid="ask-who"
                    className={on ? `${s.name} ${s.on}` : s.name} aria-pressed={on}
                    onClick={() => setWho(on ? who.filter((x) => x !== p.id) : [...who, p.id])}>
              {p.name}
            </button>
          );
        })}
      </div>
      <p className={s.everyone}>
        {who.length === 0 ? "Nobody picked — the whole table rolls." : `${who.length} picked.`}
      </p>

      <div className={s.actions}>
        <button type="button" className={s.ask} data-testid="ask-send"
                onClick={() => {
                  onAsk({
                    who, name, ability,
                    ...(chosen === undefined ? {} : { skill: chosen.id }),
                    ...(Number.isFinite(dcValue) && dc.trim() !== "" ? { dc: dcValue } : {}),
                    ...(flavour.trim() === "" ? {} : { flavour: flavour.trim() }),
                  });
                  onClose();
                }}>
          Ask
        </button>
        <button type="button" className={s.cancel} onClick={onClose}>Never mind</button>
      </div>
    </section>
  );
}

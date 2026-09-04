import { useState } from "react";
import { ABILITY_NAME, modifier, signed, type Scores } from "../../rules/5e/abilities";
import { SKILLS, proficiency } from "../../rules/5e/skills";
import type { Ask } from "./ask";
import s from "./RollRequest.module.css";

/**
 * The DM has asked you for a roll.
 *
 * Built to Arturo's mockup, with its own art: the crest, the ruins band, the
 * corner flourishes, the rule and the sparkles are cut from the sheet he
 * supplied and live in `public/art/roll`. Everything that holds TEXT is CSS —
 * the plaque, the input, the shield, the bonus boxes — because the mockup bakes
 * "14" into the shield and "Wisdom +1" into a box, and a number that cannot
 * change is a picture of an app rather than one.
 *
 * **It interrupts, and that is the point.** `nudge.ts` names three moments
 * worth a buzz and calls this the third; the other two already arrive as a
 * notification and this one is the DM waiting on YOU, mid-table, while
 * everybody looks over.
 *
 * **It does not roll.** The dice stay on the table — the modal names the
 * modifier and takes the total a person read off a physical die, which is the
 * same contract `claim` has kept since the fight screen was built.
 *
 * **Cancel is an answer.** It sends a pass rather than closing quietly: a DM
 * waiting on four names needs to know the difference between "no" and "not
 * yet", and a modal you can dismiss into silence gives them neither.
 */
export function RollRequest({ ask, scores, level, proficient, guidance, onAnswer, onPass }: {
  ask: Ask;
  scores: Scores;
  level: number;
  /** Whether this character is proficient in the skill being asked for. */
  proficient?: boolean;
  /** A d4 riding on it, as Guidance does. Shown, never added — it is a die. */
  guidance?: boolean;
  onAnswer: (total: number) => void;
  onPass: () => void;
}) {
  const [typed, setTyped] = useState("");
  const skill = SKILLS.find((x) => x.id === ask.skill);
  const abilityMod = modifier(scores[ask.ability]);
  const prof = proficient === true ? proficiency(level) : 0;
  const total = abilityMod + prof;
  const value = Number(typed.trim());
  const ready = typed.trim() !== "" && Number.isFinite(value);

  return (
    <div className={s.scrim} role="dialog" aria-modal="true"
         aria-label={`The DM is asking for ${ask.name}`} data-testid="roll-request">
      <div className={s.card}>
        <img className={s.crest} src="/art/roll/crest.webp" alt="" aria-hidden="true" />
        <img className={s.banner} src="/art/roll/banner.webp" alt="" aria-hidden="true" />
        <p className={s.eyebrow}>DM request</p>

        {/* The ruins sit behind the naming, fading into the parchment — the
            mockup's one piece of atmosphere, and the reason it reads as a
            moment rather than a form. */}
        <div className={s.scene}>
          {/* "Perception Check", then "Wisdom · ability check" underneath.
              The book's phrasing is Wisdom (Perception): the SKILL names the
              check and the ABILITY is what you roll. Saying "Wisdom Perception
              check" describes a thing that does not exist. */}
          <h2 className={s.title}>{ask.name} Check</h2>
          <p className={s.sub}>The DM is asking you to make a roll.</p>
          {ask.flavour !== undefined && ask.flavour !== "" && (
            <p className={s.flavour}>“{ask.flavour}”</p>
          )}
        </div>

        <img className={s.rule} src="/art/roll/divider.webp" alt="" aria-hidden="true" />

        <div className={s.facts}>
          {/* Dropped when the DM asked for a bare ability: the title already
              says "Wisdom Check", and repeating it underneath is the app
              filling a slot rather than telling anybody anything. */}
          {skill !== undefined && (
            <div className={s.ability}>
              <span className={s.abilityName}>{ABILITY_NAME[ask.ability]}</span>
              <span className={s.abilityKind}>ability check</span>
            </div>
          )}
          {/* Drawn only when the DM said one. A DC of "—" is a number the
              player would try to read. */}
          {ask.dc !== undefined && (
            <div className={s.dc}>
              <span className={s.dcLabel}>Difficulty class</span>
              {/* Two shields, one inside the other: `clip-path` clips a
                  border along with the box, so a single element loses its
                  outline exactly where the point is. The outer is the edge. */}
              <span className={s.dcShield}>
                <span className={s.dcFace} data-testid="dc">{ask.dc}</span>
              </span>
            </div>
          )}
        </div>

        <div className={s.panel}>
          <label className={s.enter} htmlFor="roll-total">Enter your roll total</label>
          <input
            id="roll-total" className={s.input} type="number" inputMode="numeric"
            value={typed} placeholder="e.g. 17" data-testid="roll-total"
            onChange={(e) => setTyped(e.target.value)}
          />
          <p className={s.hint}>Roll a physical die, then enter your total here.</p>

          <div className={s.bonuses}>
            <Bonus label={ABILITY_NAME[ask.ability]} value={signed(abilityMod)} />
            {prof > 0 && <Bonus label="Proficiency" value={signed(prof)} />}
            {guidance === true && <Bonus label="Guidance" value="+1d4" />}
            {/* Guidance is NOT summed in. It is a die somebody still has to
                throw, and a total that quietly included it would be a number
                this app invented. */}
            <Bonus label="Total bonus" value={signed(total)} strong />
          </div>
        </div>

        <button type="button" className={s.submit} disabled={!ready}
                data-testid="roll-submit"
                onClick={() => { onAnswer(value); }}>
          <img className={s.spark} src="/art/roll/spark.webp" alt="" aria-hidden="true" />
          Submit
          <img className={s.spark} src="/art/roll/spark.webp" alt="" aria-hidden="true" />
        </button>
        <button type="button" className={s.cancel} data-testid="roll-pass"
                onClick={onPass}>Cancel</button>

        <img className={`${s.corner} ${s.cornerL}`} src="/art/roll/corner.webp" alt="" aria-hidden="true" />
        <img className={`${s.corner} ${s.cornerR}`} src="/art/roll/corner.webp" alt="" aria-hidden="true" />
      </div>
    </div>
  );
}

function Bonus({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className={strong === true ? `${s.bonus} ${s.bonusStrong}` : s.bonus}>
      <span className={s.bonusLabel}>{label}</span>
      <span className={s.bonusValue}>{value}</span>
    </span>
  );
}

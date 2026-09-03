import { Icon } from "../../ui/Icon";
import { ABILITIES, ABILITY_NAME, modifier, signed } from "../../rules/5e/abilities";
import { SKILLS, proficiency } from "../../rules/5e/skills";

import { primary, scoresOf, featsOf, type Build } from "../creation/model";
import { languagesOf, toolsOf } from "../creation/proficiency";
import { innateAt } from "../../content/innate";
import { describeSenses } from "../../content/senses";
import { casterLevel } from "../../rules/5e/multiclassing";
import { slotsOf, pactOf, savesOf } from "../creation/scores";
import s from "./Overview.module.css";

/**
 * What am I — law 7's fourth band, and the whole of the concept's Overview.
 *
 * Everything here is derived from the build. Nothing is stored twice, so
 * nothing can disagree with the character it describes.
 */
export function Overview({ build, features = [], onAllSkills }: {
  build: Build;
  /** Gained features, already filtered to this character's own subclasses. */
  features?: readonly { readonly level: number; readonly names: readonly string[] }[];
  onAllSkills?: () => void;
}) {
  const prof = proficiency(build.level);
  const scores = scoresOf(build);
  // Class saves, plus the one Resilient grants — the reason anybody takes it.
  const saves = savesOf(build);

  /*
   * Highlights, as the concept says — not all eighteen.
   *
   * A character trained in everything makes this column longer than the rest
   * of the sheet put together: the worst case measured 2.03 screens against a
   * budget of 1.5. Six is what fits beside six saves, and the rest is a tap
   * away rather than a scroll.
   */
  const score = (k: (typeof SKILLS)[number]) =>
    modifier(scores[k.ability]) + (build.skills.includes(k.id) ? prof : 0);
  /* Granted plus chosen. `build.languages` alone is only what was picked, and
     a Human who was given Common would show as speaking one language. */
  const feats = featsOf(build);
  /* The compendium has carried a twenty-row slot table per class all along and
     nothing read it, so a wizard 3 held four first-level and two second-level
     slots and the sheet said nothing at all. */
  const casting = slotsOf(build);
  const pact = pactOf(build);
  const innate = innateAt(build.innate, build.level);
  /* How far they see in the dark, and what it costs a drow in daylight.
     314 of 605 ancestries say, and the sheet said none of it. */
  const sight = describeSenses(build.senses);
  const spoken = languagesOf(build);
  const used = toolsOf(build);
  const shown = [...SKILLS]
    .sort((a, b) => Number(build.skills.includes(b.id)) - Number(build.skills.includes(a.id)) || score(b) - score(a))
    .slice(0, 6);

  return (
    <>
      <div className={s.block} data-testid="abilities">
        <span className={s.label}>Ability scores</span>
        <div className={s.abilities}>
          {ABILITIES.map((a) => (
            <span key={a} className={s.ability}>
              <span className={s.abbr}>{a.toUpperCase()}</span>
              <span className={s.score}>{scores[a]}</span>
              <span className={s.mod}>{signed(modifier(scores[a]))}</span>
            </span>
          ))}
        </div>
      </div>

      <div className={s.block}>
        <div className={s.two}>
          <div className={s.col}>
            <span className={s.label}>Saving throws</span>
            {ABILITIES.map((a) => {
              const trained = saves.includes(a);
              return (
                <span key={a} className={s.row}>
                  <span className={s.rowName}>{ABILITY_NAME[a]}</span>
                  <span className={`${s.num} ${trained ? s.trained : ""}`}>
                    {signed(modifier(scores[a]) + (trained ? prof : 0))}
                  </span>
                </span>
              );
            })}
          </div>
          <div className={s.col}>
            <div className={s.head}>
              <span className={s.label}>Skills</span>
              {onAllSkills !== undefined && (
                <button type="button" className={s.add} onClick={onAllSkills}>All</button>
              )}
            </div>
            {shown.map((k) => {
              const trained = build.skills.includes(k.id);
              return (
                <span key={k.id} className={s.row}>
                  <span className={s.rowName}>{k.name}</span>
                  <span className={`${s.num} ${trained ? s.trained : ""}`}>
                    {signed(modifier(scores[k.ability]) + (trained ? prof : 0))}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {(casting.length > 0 || pact !== null) && (
        <div className={s.block} data-testid="slots">
          <div className={s.head}>
            <span className={s.label}>Spell slots</span>
          </div>
          {casting.length > 0 && (
            <span className={s.entry}>
              <span className={s.tile}><Icon name="spark" /></span>
              <span className={s.stack}>
                <span className={s.entryName}>
                  {casting.map((n, i) => `${String(n)} × level ${String(i + 1)}`).join(" · ")}
                </span>
                {build.classes.length > 1 && (
                  <span className={s.entryNote}>Combined, at caster level {casterLevel(
                    build.classes.map((c) => ({ id: c.id, level: c.level, subclass: c.subclass })),
                  )}</span>
                )}
              </span>
              <span />
            </span>
          )}
          {/* Pact magic is its own track, with its own table and its own short
              rest. It stacks alongside rather than into. */}
          {pact !== null && (
            <span className={s.entry}>
              <span className={s.tile}><Icon name="pact" /></span>
              <span className={s.stack}>
                <span className={s.entryName}>
                  {pact.count} × level {pact.level}
                </span>
                <span className={s.entryNote}>Pact magic — back on a short rest</span>
              </span>
              <span />
            </span>
          )}
        </div>
      )}

      {innate.length > 0 && (
        <div className={s.block} data-testid="innate">
          <div className={s.head}>
            <span className={s.label}>From your ancestry</span>
          </div>
          {innate.map((sp) => (
            <span key={`${sp.name}${String(sp.level)}`} className={s.entry}>
              <span className={s.tile}><Icon name="spark" /></span>
              <span className={s.stack}>
                <span className={s.entryName}>{sp.name}</span>
                <span className={s.entryNote}>{sp.from}</span>
              </span>
              <span />
            </span>
          ))}
        </div>
      )}

      {/* Only when there is something to say: a character with no tools and
          only Common does not need a block explaining that. */}
      {sight !== "" && (
        <div className={s.block} data-testid="senses">
          <div className={s.head}>
            <span className={s.label}>Senses</span>
          </div>
          <span className={s.entry}>
            <span className={s.tile}><Icon name="eye" /></span>
            <span className={s.stack}><span className={s.entryName}>{sight}</span></span>
            <span />
          </span>
        </div>
      )}

      {(spoken.length > 0 || used.length > 0 || build.style !== null) && (
        <div className={s.block} data-testid="proficiencies">
          <div className={s.head}>
            <span className={s.label}>Proficiencies</span>
          </div>
          {build.style !== null && (
            <span className={s.entry}>
              <span className={s.tile}><Icon name="spark" /></span>
              <span className={s.stack}>
                <span className={s.entryName}>{build.names["style"] ?? build.style}</span>
                <span className={s.entryNote}>Fighting style</span>
              </span>
              <span />
            </span>
          )}
          {spoken.length > 0 && (
            <span className={s.entry}>
              <span className={s.tile}><Icon name="book" /></span>
              <span className={s.stack}>
                <span className={s.entryName}>{spoken.join(", ")}</span>
                <span className={s.entryNote}>Languages</span>
              </span>
              <span />
            </span>
          )}
          {used.length > 0 && (
            <span className={s.entry}>
              <span className={s.tile}><Icon name="flask" /></span>
              <span className={s.stack}>
                <span className={s.entryName}>{used.join(", ")}</span>
                <span className={s.entryNote}>Tools</span>
              </span>
              <span />
            </span>
          )}
        </div>
      )}

      <div className={s.block} data-testid="features">
        <span className={s.label}>Features &amp; resources</span>
        {/*
          * What the class actually gave them, level by level. A ranger's class
          * table carries 372 feature names by level 8, of which 22 are theirs —
          * so this is filtered by the options they took, not printed whole.
          */}
        {features.map((row) => (
          <span key={row.level} className={s.entry}>
            <span className={s.tile}><Icon name="book" /></span>
            <span className={s.stack}>
              <span className={s.entryName}>{row.names.join(", ")}</span>
              <span className={s.entryNote}>Level {row.level}</span>
            </span>
            <span />
          </span>
        ))}
        {features.length === 0 && feats.length === 0 ? (
          <span className={s.empty}>Nothing taken yet — feats arrive with an improvement.</span>
        ) : (
          feats.map((f: string) => (
            <span key={f} className={s.entry}>
              <span className={s.tile}><Icon name="spark" /></span>
              <span className={s.stack}><span className={s.entryName}>{f}</span></span>
              <span />
            </span>
          ))
        )}
      </div>
    </>
  );
}

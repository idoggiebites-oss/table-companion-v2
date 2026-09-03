import { Shell } from "../../ui/Shell";
import { creatureCount, rawXp, type Encounter } from "./encounter";
import type { ReactNode } from "react";
import s from "./Prep.module.css";

/**
 * What the DM has ready, before anybody sits down.
 *
 * Laid out from Arturo's mockup: a session rail, a centre column of what is
 * prepared, and cards carrying a thumbnail, a name, two chips and a meta line.
 * The palette needed no translation — the mockup was drawn against these same
 * tokens.
 *
 * Three things in that mockup are deliberately NOT here, and each absence is a
 * decision rather than an oversight:
 *
 *   - **The outline lists only what exists.** The mockup shows Quests, Loot,
 *     Random Tables, References and Locations; none are built. `tabs.ts` holds
 *     the rule this follows — *what is not built is not drawn* — because a row
 *     reading "Quests 2" that goes nowhere is a promise the app cannot keep.
 *   - **Scenes are a drawer, not a running order.** The mockup numbers them
 *     1-5 with drag handles. V1 refuses that: *"deliberately not a map and not
 *     a sequence… a table goes where it goes."* Reversible if the running
 *     order turns out to be what a real session wants.
 *   - **No readiness percentage or checklist.** A good idea, and a NEW one —
 *     nothing in V1 frames prep as a completion metric. It wants to be a
 *     decision of its own rather than arriving inside a port.
 */
export function Prep({ encounters, nav, onStage, onForget, onNew }: {
  encounters: readonly Encounter[];
  nav?: ReactNode;
  onStage: (e: Encounter) => void;
  onForget: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <Shell title="Prep" below={nav}>
      <div className={s.split}>
        <aside className={s.rail} aria-label="This session">
          <h2 className={s.railHead}>Session outline</h2>
          <ul className={s.outline}>
            {/* Only what is built. Scenes and NPCs join as they land. */}
            <li className={s.line}>
              <span>Encounters</span>
              <span className={s.count}>{encounters.length}</span>
            </li>
          </ul>
        </aside>

        <section className={s.main} aria-label="Encounters">
          <div className={s.head}>
            <h2 className={s.title}>Encounters</h2>
            <button type="button" className={s.new} onClick={onNew}>
              Keep what is staged
            </button>
          </div>

          {encounters.length === 0 ? (
            <p className={s.empty} data-testid="prep-empty">
              Nothing kept yet. Stage a fight, then keep it here to put the same
              one on the table again next week.
            </p>
          ) : (
            <ul className={s.list} data-testid="encounters">
              {encounters.map((e) => (
                <li key={e.id} className={s.card} data-testid="encounter-card">
                  <span className={s.cardHead}>
                    <span className={s.name}>{e.name}</span>
                    {/*
                      * Creatures and experience, and NO difficulty band. The
                      * bands are Dungeon Master's Guide content rather than
                      * SRD — see `rules/5e/non-srd.ts`, the one file that
                      * would have to go before this could be shared. The
                      * arithmetic works without one, which is V1's point.
                      *
                      * The experience is RAW. Any multiplier a table applies
                      * estimates danger and is never earned; getting that
                      * backwards roughly doubles a party's progression.
                      */}
                    <span className={s.meta}>
                      {creatureCount(e)} creature{creatureCount(e) === 1 ? "" : "s"}
                      {e.place === "" ? "" : ` · ${e.place}`}
                      {" · "}{rawXp(e)} XP
                    </span>
                  </span>
                  <span className={s.actions}>
                    <button type="button" className={s.stage}
                            aria-label={`Put ${e.name} on the table`}
                            onClick={() => onStage(e)}>To the table</button>
                    <button type="button" className={s.forget}
                            aria-label={`Forget ${e.name}`}
                            onClick={() => onForget(e.id)}>×</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}

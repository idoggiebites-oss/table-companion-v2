import { DmShell } from "./DmShell";
import { creatureCount, rawXp, type Encounter } from "./encounter";
import { Scenes } from "./Scenes";
import type { Scene } from "./scene";
import { Npcs } from "./Npcs";
import type { Npc } from "./npc";
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
 *     Places joined it the day places existed; People joined it the day NPCs
 *     did.
 *   - **Scenes are a drawer, not a running order.** The mockup numbers them
 *     1-5 with drag handles. V1 refuses that: *"deliberately not a map and not
 *     a sequence… a table goes where it goes."* Built as the drawer, on that
 *     reasoning; reversible if a real session says otherwise.
 *   - **No readiness percentage or checklist.** A good idea, and a NEW one —
 *     nothing in V1 frames prep as a completion metric. It wants to be a
 *     decision of its own rather than arriving inside a port.
 */
export function Prep({
  encounters, scenes, npcs, nav, onStage, onForget, onNew,
  onPrepare, onForgetScene, onOpenScene, onSaveNpc, onForgetNpc,
}: {
  encounters: readonly Encounter[];
  scenes: readonly Scene[];
  npcs: readonly Npc[];
  nav?: ReactNode;
  onStage: (e: Encounter) => void;
  onForget: (id: string) => void;
  onNew: () => void;
  onPrepare: (s: Scene) => void;
  onForgetScene: (id: string) => void;
  onOpenScene: (s: Scene) => void;
  onSaveNpc: (n: Npc) => void;
  onForgetNpc: (id: string) => void;
}) {
  return (
    <DmShell
      title="Prep"
      below={nav}
      rail={
        <>
          <h2 className={s.railHead}>Session outline</h2>
          <ul className={s.outline}>
            {/* Only what is built, and in the order the column below reads.
                An outline that indexes a screen in a different order from the
                screen is a table of contents you have to translate. */}
            <li className={s.line}>
              <span>Encounters</span>
              <span className={s.count}>{encounters.length}</span>
            </li>
            <li className={s.line}>
              <span>Places</span>
              <span className={s.count}>{scenes.length}</span>
            </li>
            <li className={s.line}>
              <span>People</span>
              <span className={s.count}>{npcs.length}</span>
            </li>
          </ul>
        </>
      }
    >
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

          {/*
            * Places below encounters, because a place is assembled FROM one:
            * you keep the three ghouls, then say which cellar they are in. The
            * order on screen is the order of the work.
            */}
          <Scenes
            scenes={scenes} encounters={encounters}
            onPrepare={onPrepare} onForget={onForgetScene} onOpen={onOpenScene}
          />

          {/*
            * People last: neither an encounter nor a place depends on one,
            * and the party will meet most of these outside a fight entirely.
            */}
        <Npcs npcs={npcs} onSave={onSaveNpc} onForget={onForgetNpc} />
      </section>
    </DmShell>
  );
}

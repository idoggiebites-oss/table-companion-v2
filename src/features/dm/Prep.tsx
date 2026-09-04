import { useState } from "react";
import { DmShell } from "./DmShell";
import { creatureCount, rawXp, type Encounter } from "./encounter";
import { EncounterEditor } from "./EncounterEditor";
import { Scenes } from "./Scenes";
import type { Scene } from "./scene";
import { Npcs } from "./Npcs";
import type { Npc } from "./npc";
import { SessionRail } from "./SessionRail";
import { HowReady } from "./HowReady";
import { Outline, type Section } from "./Outline";
import { QuickCreate } from "./QuickCreate";
import { Overview } from "./Overview";
import type { Prepared } from "./session";
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
/** The heading each section gives the middle column. */
const SECTION_LABEL: Readonly<Record<Section, string>> = {
  overview: "Overview", encounters: "Encounters", places: "Places", people: "People",
};

export function Prep({
  session, encounters, scenes, npcs, partyLevels, nav, onStage, onForget, onNew,
  onSaveEncounter, onSendEncounter,
  onSaveSession, onForgetSession,
  onPrepare, onForgetScene, onOpenScene, onSaveNpc, onForgetNpc,
}: {
  /** The session being planned, or none started yet — see `SessionRail`. */
  session: Prepared | null;
  encounters: readonly Encounter[];
  scenes: readonly Scene[];
  npcs: readonly Npc[];
  /** From `charactersIn(events)` — the gauge reads the party, never a typed-in number. */
  partyLevels: readonly number[];
  nav?: ReactNode;
  onSaveSession: (session: Prepared) => void;
  onForgetSession: (id: string) => void;
  onStage: (e: Encounter) => void;
  onForget: (id: string) => void;
  onNew: () => void;
  onSaveEncounter: (e: Encounter) => void;
  /** Save it and put it straight on the table — see `PrepScreen`'s `send`. */
  onSendEncounter: (e: Encounter) => void;
  onPrepare: (s: Scene) => void;
  onForgetScene: (id: string) => void;
  onOpenScene: (s: Scene) => void;
  onSaveNpc: (n: Npc) => void;
  onForgetNpc: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  /*
   * The rail navigates and the middle column shows ONE section — the
   * structural half of the mockup, and the half a prose description of it
   * lost. Prep was a stack of everything at once, which is what a workspace
   * exists to stop.
   */
  const [at, setAt] = useState<Section>("overview");
  const go = (to: Section) => { setAt(to); if (to === "encounters") setEditing(true); };

  return (
    <DmShell
      title="Prep"
      below={nav}
      rail={
        <>
          {/*
            * The mockup's hero image would sit between these two. Skipped —
            * image storage is Task 35 — and with no placeholder box, for the
            * same reason the outline below omits unbuilt rows: an empty frame
            * reads as broken rather than as "not yet".
            */}
          <SessionRail session={session} onSave={onSaveSession} onForget={onForgetSession} />

          <HowReady
            session={session}
            have={{ encounters: encounters.length, places: scenes.length, people: npcs.length }}
            {...(session === null ? {} : {
              onToggle: (id, done) => {
                onSaveSession({
                  ...session,
                  checklist: session.checklist.map((c) => (c.id === id ? { ...c, done } : c)),
                });
              },
            })}
          />

          <Outline
            current={at}
            counts={{
              encounters: encounters.length, places: scenes.length, people: npcs.length,
            }}
            onGo={setAt}
          />

          <QuickCreate onCreate={go} />
        </>
      }
    >
      <section className={s.main} aria-label={SECTION_LABEL[at]}>
        {at === "overview" && (
          <Overview session={session} onSave={onSaveSession} />
        )}

        {at === "encounters" && (
          <>
            <div className={s.head}>
              <h2 className={s.title}>Encounters</h2>
              <span className={s.actions}>
                <button type="button" className={s.new} onClick={() => setEditing((v) => !v)}>
                  {editing ? "Hide" : "Build one"}
                </button>
                {/* Beside "Build one", not replacing it: keeping what the DM
                    already assembled on the table is a different act from
                    planning one cold, days before anybody sits down. */}
                <button type="button" className={s.new} onClick={onNew}>
                  Keep what is staged
                </button>
              </span>
            </div>

            {editing && (
              <EncounterEditor
                partyLevels={partyLevels}
                onSave={onSaveEncounter}
                onSend={onSendEncounter}
                onClose={() => setEditing(false)}
              />
            )}

            {encounters.length === 0 ? (
              <p className={s.empty} data-testid="prep-empty">
                Nothing kept yet. Build one, or stage a fight and keep it here to
                put the same one on the table again next week.
              </p>
            ) : (
              <ul className={s.list} data-testid="encounters">
                {encounters.map((e) => (
                  <li key={e.id} className={s.card} data-testid="encounter-card">
                    <span className={s.cardHead}>
                      <span className={s.name}>{e.name}</span>
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
          </>
        )}

        {at === "places" && (
          <Scenes
            scenes={scenes} encounters={encounters}
            onPrepare={onPrepare} onForget={onForgetScene} onOpen={onOpenScene}
          />
        )}

        {at === "people" && (
          <Npcs npcs={npcs} onSave={onSaveNpc} onForget={onForgetNpc} />
        )}
      </section>
    </DmShell>
  );
}

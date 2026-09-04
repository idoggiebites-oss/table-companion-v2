import { Prep } from "./Prep";
import { prepFrom, keepFrom, PREP, type Encounter } from "./encounter";
import { blankScene, scenesFrom, openActs, SCENE, type Scene } from "./scene";
import { peopleFrom, NPC } from "./npc";
import { sessionsFrom, SESSION, type Prepared } from "./session";
import { FIGHT, type Fight } from "./fight";
import { charactersIn } from "../creation/log";
import type { Event } from "../../core/types";
import type { ReactNode } from "react";

/**
 * The prep tab, wired to the log.
 *
 * Split out of `App.tsx` at the component budget, and the budget found a real
 * seam: this is four features' worth of handlers — encounters, places, people,
 * and the one press that opens one — and none of them is App's business. App
 * is a router; what a place does when you open it is prep's own rule.
 */
export function PrepScreen({ events, fight, nav, record, onOpened }: {
  events: readonly Event[];
  fight: Fight;
  nav?: ReactNode;
  record: (kind: string, data: Record<string, unknown>) => void;
  /** Opening a place moves the DM to the fight, so App still owns the move. */
  onOpened: (sceneId: string) => void;
}) {
  /**
   * One press: the room live for everybody, the encounter staged, and — on
   * the screen it moves to — the note in front of the DM. The ordering guard
   * lives in `openActs`, which is where a test can hold it.
   */
  const open = (sc: Scene) => {
    const e = prepFrom(events).encounters.find((x) => x.id === sc.encounter);
    for (const a of openActs(sc, e, (i) => `${sc.id}-${String(i)}-${String(Date.now())}`)) {
      record(FIGHT, a as unknown as Record<string, unknown>);
    }
    onOpened(sc.id);
  };

  /**
   * Save it, then put it on the table.
   *
   * The encounter object goes straight to `openActs` rather than being looked
   * up by id the way `open` does. That is not a shortcut: `record` appends to
   * the log and the fold behind `events` has not run yet when this line
   * executes, so a lookup would miss the encounter that was saved a
   * microsecond earlier and stage an empty fight. Passing the object is the
   * only version of this that is correct on the first press.
   */
  const send = (e: Encounter) => {
    const sc = { ...blankScene(`st${Date.now().toString(36)}`), encounter: e.id };
    for (const a of openActs(sc, e, (i) => `${e.id}-${String(i)}-${String(Date.now())}`)) {
      record(FIGHT, a as unknown as Record<string, unknown>);
    }
    onOpened(sc.id);
  };

  /*
   * A table plans one session at a time even though the log can hold many —
   * `save` always appends past an edit, so the LAST one is whichever session
   * was most recently touched, with no separate "current session" concept to
   * keep in sync.
   */
  const sessions = sessionsFrom(events).sessions;
  const session: Prepared | null = sessions.length > 0 ? sessions[sessions.length - 1]! : null;

  /* The difficulty gauge's party, from the characters this device already
     knows about — never typed in. Empty means no band, which `totalsFor`
     already handles as the honest answer for a party that does not exist yet. */
  const partyLevels = charactersIn(events).map(
    ({ build }) => build.classes.reduce((n, c) => n + c.level, 0),
  );

  return (
    <Prep
      session={session}
      onSendEncounter={send}
      onSaveSession={(sn) => record(SESSION, { act: "save", session: sn } as unknown as Record<string, unknown>)}
      onForgetSession={(id) => record(SESSION, { act: "forget", id })}
      encounters={prepFrom(events).encounters}
      scenes={scenesFrom(events).scenes}
      npcs={peopleFrom(events).npcs}
      partyLevels={partyLevels}
      onSaveEncounter={(e: Encounter) =>
        record(PREP, { act: "keep", encounter: e } as unknown as Record<string, unknown>)}
      nav={nav}
      onPrepare={(sc) => record(SCENE, { act: "prepare", scene: sc } as unknown as Record<string, unknown>)}
      onForgetScene={(id) => record(SCENE, { act: "forget", id })}
      onOpenScene={open}
      onSaveNpc={(person) => record(NPC, { act: "save", npc: person } as unknown as Record<string, unknown>)}
      onForgetNpc={(id) => record(NPC, { act: "forget", id })}
      onStage={(e) => {
        /* An encounter with no place is a place with nothing said about the
           room — the same one press, so it is the same code path. */
        open({ ...blankScene(`st${Date.now().toString(36)}`), encounter: e.id });
      }}
      onForget={(id) => record(PREP, { act: "forget", id })}
      onNew={() => {
        const kept = keepFrom(fight.combatants, `enc${Math.random().toString(36).slice(2, 8)}`);
        if (kept !== null) record(PREP, { act: "keep", encounter: kept } as unknown as Record<string, unknown>);
      }}
    />
  );
}

import { useRef, useState } from "react";
import { Shell } from "./Shell";
import { Button, ButtonRow } from "./Button";
import { LogView } from "./LogView";
import { logFor, mayRevert } from "../features/room/visibility";
import { useFeatures } from "../features/progression/useFeatures";
import { useCatalogue } from "../features/sheet/useCatalogue";
import { useLog } from "./useLog";
import { live } from "../core/log";
import { Creation } from "../features/creation/Creation";
import { CHOICE } from "../features/creation/model";
import type { Choice } from "../features/creation/choices";
import { asking } from "../features/creation/facts";
import { adopt } from "../features/creation/transfer";
import { Hub } from "../features/creation/Hub";
import { RoomBar } from "../features/room/RoomBar";
import { Sheet } from "../features/sheet/Sheet";
import { buildFrom, charactersIn } from "../features/creation/log";
import { characterOf } from "../features/creation/choices";
import { vitalsFrom, VITAL, type Vital } from "../features/sheet/model";
import { LevelUp } from "../features/progression/LevelUp";
import { TAKE, type LevelTaken } from "../features/progression/model";
import { useCreationContent } from "../features/creation/useContent";
import { useTheme } from "./useTheme";
import { TabBar } from "./TabBar";
import { tabsFor, currentOf } from "./tabs";
import { useSeat } from "../features/room/useSeat";
import { Party } from "../features/dm/Party";
import { Staging } from "../features/dm/Staging";
import { Fight as PlayerFight } from "../features/room/Fight";
import { scoresOf } from "../features/creation/scores";
import { BLANK } from "../rules/5e/abilities";
import { fightFrom, FIGHT, type Act } from "../features/dm/fight";
import { SeatControl } from "../features/room/SeatControl";
import { membersIn } from "../features/dm/members";
import { waitingOn } from "../features/sheet/waiting";

/**
 * Slice 1 has one screen and it is a debug view: append, undo, reload.
 * Everything a feature will later do goes through exactly this path.
 */
export function App({ dbName }: { dbName?: string }) {
  const [room, setRoom] = useState<string | undefined>(undefined);
  const { showing: theme, flip } = useTheme();
  const { events, add, record, pushMany, undo, reset, clock, link, ready } = useLog(dbName, room);
  const [mode, setMode] = useState<"hub" | "log" | "create" | "sheet" | "levelup" | "party" | "fight">("hub");
  const [character, setCharacter] = useState<string>("");
  const [onlyGames, setOnlyGames] = useState(true);
  // The spellbook is fetched when somebody is building, not on arrival.
  /* The spellbook is 1.2MB of the 1.5MB a device pulls, so it waits — but the
     level-up needs it too, not only creation: a bard reaching 2 learns a spell. */
  const { content, rows, hidden } = useCreationContent(onlyGames, mode === "create" || mode === "levelup");
  /* Hooks cannot live inside a branch, and both the sheet and the level-up
     want this. One class file is ~6KB, fetched only for the classes held. */
  const current = buildFrom(events, character);
  const features = useFeatures(current);
  /* 10,760 items, 225KB gzipped — fetched when somebody opens their pack and
     not on the way to a fight. */
  const gear = useCatalogue(mode === "sheet");


  const newId = () => `c${Math.random().toString(36).slice(2, 8)}`;

  /*
   * The one navigation, computed here because this is where the state is.
   *
   * V1's rules, minus the seat: a tab appears only when it has something on
   * it, it carries a dot when something is owed, and the tab shown is checked
   * against the set that exists — undo the only character while its sheet is
   * open and the Sheet tab goes with it, so the bar must not be left pointing
   * at nothing.
   */
  const roster = charactersIn(events);
  const { seat, sit, claim, mine } = useSeat(roster.map((r) => r.id));
  const dm = seat.kind === "dm";
  const vitals = current === undefined ? null : vitalsFrom(events, character, current);
  const fight = fightFrom(events);
  const tabs = tabsFor({
    dm,
    waiting: vitals !== null && waitingOn(vitals).length > 0,
    owed: dm && membersIn(events).some((m) => m.waiting.length > 0),
    fighting: fight.phase === "active",
  });
  const go = (id: string) => {
    const to = currentOf(id, tabs);
    setMode(to === "log" ? "log" : to === "sheet" ? "sheet"
      : to === "party" ? "party" : to === "fight" ? "fight" : "hub");
    /* A player's sheet is the character they are SITTING in — the seat is what
       decides whose sheet this is, not whichever one was opened last. */
    if (to === "sheet") {
      const who = seat.kind === "player" ? seat.character : roster[0]?.id;
      if (who !== undefined) setCharacter(who);
    }
  };
  const nav = (at: string) => (
    <TabBar tabs={tabs} current={currentOf(at, tabs)} onGo={go} />
  );

  /*
   * Leaving creation without finishing puts back what walking in changed.
   *
   * Backing out after choosing an ancestry left "Unnamed · Elf · HP 0/0" on
   * the hub, offering a sheet for a character with no class — because every
   * answer is an event and any event tagged with a character IS a character.
   *
   * Scoped to what THIS visit appended, not to everything the character has:
   * re-opening a finished character and stepping back out must undo the
   * edits just made and nothing else. That also means no completion marker is
   * needed to tell a cancelled character from a real one.
   *
   * Undo, not delete — skip-markers, the same as everywhere else, so the log
   * still says what happened.
   */
  const entered = useRef<Set<string> | null>(null);
  const enter = () => { entered.current = new Set(events.map((e) => e.id)); };
  const abandon = () => {
    const was = entered.current;
    entered.current = null;
    if (was === null) return;
    for (const e of live(events)) {
      if (characterOf(e) === character && !was.has(e.id)) undo(e.id);
    }
  };

  if (mode === "create") {
    return (
      <Creation
        events={events}
        character={character}
        content={content}
        onChoose={(c: Choice) =>
          record(CHOICE, { ...(c as unknown as Record<string, unknown>), character })
        }
        onDone={() => {
          entered.current = null;
          /*
           * Making a character claims it, and sits in it. V1's rule, and the
           * reason a fresh device defaulting to the DM is safe: that default
           * is right when the device is alone in the house and wrong the
           * moment it joins somebody else's room. Without this, finishing a
           * character left the device still standing behind the screen,
           * looking at a party of one and no sheet.
           */
          claim(character);
          setMode("hub");
        }}
        onExit={() => { abandon(); setMode("hub"); }}
      />
    );
  }

  if (mode === "levelup") {
    const build = current;
    return (
      <LevelUp
        build={build}
        paths={(k) => content.optionsFor("subclass", { ...asking(build), klass: k })}
        /* Classes they do not have yet. Without these a character could never
           multiclass after creation — the list was their own classes only. */
        others={content.optionsFor("class", asking(build))
          .filter((o) => !build.classes.some((c) => c.id === o.id))}
        dieFor={(k) => content.hitDieFor?.(k) ?? 8}
        questions={(k, level) => content.questionsAt?.(k, level) ?? []}
        spellsFor={(k, level) => content.spellsAt?.(k, level, build.names["subclass"] ?? build.classes.find((c) => c.id === k)?.subclass ?? null) ?? []}
        slotsFor={(k) => content.slotTableFor(k)}
        onBack={() => setMode("sheet")}
        onTake={(t: LevelTaken) => {
          record(TAKE, { ...(t as unknown as Record<string, unknown>), character });
          setMode("sheet");
        }}
      />
    );
  }

  if (mode === "sheet") {
    const build = current;
    return (
      <Sheet
        build={build}
        features={features}
        catalogue={gear.items}
        catalogueLoading={gear.loading}
        onChoose={(c) => record(CHOICE, { ...(c as unknown as Record<string, unknown>), character })}
        vitals={vitalsFrom(events, character, build)}
        name={build.identity["name"] ?? "Unnamed"}
        onAct={(v: Vital) => record(VITAL, { ...(v as unknown as Record<string, unknown>), character })}
        onBack={() => setMode("hub")}
        nav={nav("sheet")}
        onLevelUp={() => setMode("levelup")}
      />
    );
  }

  if (mode === "fight") {
    /*
     * One bar, contents by seat — V1's rule. The DM's fight is the table being
     * assembled and run; a player's is their own two-state view of it. Same
     * tab, different room, because they are not doing the same job.
     */
    const act = (a: Act) => record(FIGHT, a as unknown as Record<string, unknown>);
    if (dm) return <Staging fight={fight} party={membersIn(events)} nav={nav("fight")} onAct={act} />;
    const build = current;
    return (
      <PlayerFight
        state={fight}
        me={character}
        attacks={build === null ? [] : vitalsFrom(events, character, build).attacks}
        scores={build === null ? BLANK : scoresOf(build)}
        level={build?.level ?? 1}
        nav={nav("fight")}
        onAct={act}
      />
    );
  }

  if (mode === "party") {
    return (
      <Party
        events={events}
        nav={nav("party")}
        /* Sitting in them is how the DM acts for them at all — `controls` is
           about the seat, not about authority (see `room/seat.ts`). */
        onOpen={(id) => { claim(id); setCharacter(id); setMode("sheet"); }}
      />
    );
  }

  if (mode === "hub") {
    return (
      <Hub
        room={<RoomBar room={room} link={link} onJoin={setRoom} onLeave={() => setRoom(undefined)} />}
        events={events}
        onNew={() => { setCharacter(newId()); enter(); setMode("create"); }}
        onOpen={(id) => { setCharacter(id); setMode("sheet"); }}
        onEdit={(id) => { setCharacter(id); enter(); setMode("create"); }}
        onImport={(imported) => pushMany(adopt(imported, clock, newId()))}
        onLog={() => setMode("log")}
        nav={nav("characters")}
        who={
          <SeatControl
            seat={seat} mine={mine} all={roster.map((r) => r.id)}
            nameOf={(id) => roster.find((r) => r.id === id)?.build.identity["name"] ?? "Unnamed"}
            onSit={sit}
          />
        }
        theme={theme}
        onTheme={flip}
      />
    );
  }

  return (
    <Shell
      title="The log"
      counter={
        <>
          <span>{live(events).length} live</span>
          <span>{rows === 0 ? "SRD only" : `${rows} from the compendium`}</span>
        </>
      }
      actions={
        <ButtonRow>
          <Button onClick={flip}>Theme</Button>
          <Button onClick={() => void reset()}>Clear</Button>
          {hidden > 0 && (
            <Button onClick={() => setOnlyGames((v) => !v)}>
              {onlyGames ? `Show ${hidden} more` : "The game's own"}
            </Button>
          )}
          <Button onClick={() => setMode("hub")}>Characters</Button>
          <Button tone="gold" onClick={() => add("tick")}>
            Append
          </Button>
        </ButtonRow>
      }
    >
      {ready ? (
        /*
         * The log READS differently per person, though every device replays the
         * same events — that is what makes undo work across a table. A player
         * was being shown the DM's prep here, which undid the disclosure ladder
         * from behind: the fight screen can hide a creature as carefully as it
         * likes while this tab names it.
         */
        <LogView events={logFor(events, dm)} onUndo={undo}
                 mayUndo={(e) => mayRevert(e, dm, clock.device)} />
      ) : (
        <p data-testid="loading">Opening the log…</p>
      )}
    </Shell>
  );
}

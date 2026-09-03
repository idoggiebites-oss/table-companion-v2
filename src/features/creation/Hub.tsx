import { useRef, useState, type ReactNode } from "react";
import { Shell } from "../../ui/Shell";
import { Icon, Crest } from "../../ui/Icon";
import { CHOICE, type Build } from "./model";
import { charactersIn, buildFrom } from "./log";
import type { CharacterId } from "./choices";
import { toSheet, fromSheet, adopt } from "./transfer";
import { Hero } from "./Hero";
import { Activity } from "./Activity";
import type { Event } from "../../core/types";
import s from "./Hub.module.css";

/**
 * The way in, as drawn: who you are, the character you are in the middle of,
 * what you can do about it, and what has happened lately.
 */
export function Hub({
  events, room, onNew, onOpen, onEdit, onImport, onLog, nav, who, theme, onTheme,
}: {
  events: readonly Event[];
  room?: ReactNode;
  onNew: () => void;
  onOpen: (id: CharacterId) => void;
  onEdit: (id: CharacterId) => void;
  onImport: (events: readonly Event[]) => void;
  onLog: () => void;
  /** The one navigation, computed by whoever knows the state. See `TabBar`. */
  nav?: ReactNode;
  /** "I am" — the seat control, built where the seat lives. */
  who?: ReactNode;
  /** What the screen is showing, so the control can name what it will do. */
  theme?: "light" | "dark";
  onTheme?: () => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const characters = charactersIn(events);
  const current = characters[0];
  const build = current === undefined ? undefined : buildFrom(events, current.id);

  const takeFile = async (f: File) => {
    setError(null);
    try {
      onImport(fromSheet(JSON.parse(await f.text())));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be read.");
    }
  };

  const save = (id: CharacterId, b: Build) => {
    const sheet = toSheet(events.filter((e) => e.kind !== CHOICE || e.data["character"] === id));
    const url = URL.createObjectURL(new Blob([JSON.stringify(sheet, null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(b.identity["name"] ?? "character").replace(/\W+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell title="Characters" below={nav}>
      <div className={s.crown}>
        {/* Was a dead pill reading PLAYER. It is V1's "I am" now. */}
        {who}
        <span className={s.crest}><Crest /></span>
        <span className={s.tools}>
          {/* Named for what it DOES next, not for what is on screen: a
              control called "Dark" beside a dark screen reads as a state. */}
          <button type="button" className={s.tool} onClick={onTheme}
                  aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}>
            <Icon name="spark" />
          </button>
          <button type="button" className={s.tool} aria-label="Menu"><Icon name="book" /></button>
        </span>
      </div>

      {/*
        * The hub's own section row lived here: Create, Combat, Equip, Book,
        * Log. Four of the five went nowhere, and each duplicated something
        * already on the screen — Create was the tile below it, Book was the
        * Library tab, and Combat and Equip are a CHARACTER's sections, which
        * the sheet already carries as Combat and Inventory. Only Log worked,
        * and Log is a place, so it is a tab now. 55px, and a whole second
        * navigation, for one working control.
        */}
      {room}

      {build !== undefined && current !== undefined && (
        <div data-testid="character">
          <Hero build={build} onOpen={() => onOpen(current.id)} />
        </div>
      )}

      <div className={s.tiles}>
        {/*
          * Two tiles once anybody exists, because they are two different
          * things and one of them was unreachable. The tile used to become
          * "Continue creation" the moment a character existed, and with it
          * went the only way to make a SECOND one — which a table needs, and
          * which the party screen needs before it can hold a party.
          *
          * Continue is still its own tile: leaving the flow cancels what the
          * visit wrote, but closing the app mid-question does not, so a
          * half-answered character can still be sitting there.
          */}
        <Tile icon="spark" name="Guided creation" note="Step by step, one question at a time."
              onGo={onNew} />
        {build !== undefined && current !== undefined && (
          <Tile icon="staff" name="Continue creation" note={`Pick ${build.identity["name"] ?? "them"} back up where you stopped.`}
                onGo={() => onEdit(current.id)} />
        )}
        {/* "Open character sheet" was a tile here, under a Hero card that
            already opens the sheet when tapped — and now under a Sheet tab
            that is on screen at all times. Three doors into one room. The
            character's own card is the one that reads as the character. */}
        {/* "Enter combat" was a tile here that went to the LOG. It was drawn
            before the thing behind it existed, which is the one rule this
            plan does not bend, and it sat there through three reviews. The
            fight is a real screen now and it is a tab on the DM's bar, where
            the seat decides who is offered it. */}
        <Tile icon="flask" name="Import character" note="From a file this app wrote."
              onGo={() => file.current?.click()} />
      </div>

      <input ref={file} type="file" accept="application/json" hidden aria-label="Character file"
             onChange={(e) => { const f = e.target.files?.[0]; if (f) void takeFile(f); e.target.value = ""; }} />
      {error !== null && <p role="alert">{error}</p>}

      <Activity events={events} onAll={onLog} />

      {characters.length > 0 && (
        <div data-testid="characters">
          {characters.map(({ id }) => {
            const b = buildFrom(events, id);
            return (
              <div key={id} data-testid="roster-row">
                <button type="button" onClick={() => onOpen(id)}
                        aria-label={`Open ${b.identity["name"] ?? "unnamed character"}`}>
                  {b.identity["name"] ?? "Unnamed"}
                </button>
                <button type="button" onClick={() => save(id, b)}
                        aria-label={`Export ${b.identity["name"] ?? "unnamed character"}`}>Export</button>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

export { adopt };

function Tile({ icon, name, note, onGo, disabled = false }: {
  icon: Parameters<typeof Icon>[0]["name"];
  name: string;
  note: string;
  onGo: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={s.tile} onClick={onGo} disabled={disabled}>
      <span className={s.tileIcon}><Icon name={icon} /></span>
      <span className={s.tileName}>{name}</span>
      <span className={s.chev}>›</span>
      <span className={s.tileNote}>{note}</span>
    </button>
  );
}

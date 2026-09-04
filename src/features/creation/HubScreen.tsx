import { Hub } from "./Hub";
import { RoomBar } from "../room/RoomBar";
import { PushToggle } from "../room/PushToggle";
import { dmKeyFor } from "../room/useSeat";
import { adopt } from "./transfer";
import type { Clock } from "../../core/log";
import type { SyncState } from "../../core/sync";
import type { Event } from "../../core/types";
import type { ReactNode } from "react";

/**
 * The hub, assembled.
 *
 * Split out of `App.tsx` at its budget, along the same seam `PrepScreen` and
 * `LogScreen` were: App is a router, and wiring together a room bar, a push
 * toggle, an importer and four ways into a character is not routing. It was
 * there because that is where it was first written.
 */
export function HubScreen({
  events, theme, mine, clock, link, room, nav, who,
  onRoom, onTheme, onSay, onPushMany, onGo, newId,
}: {
  events: readonly Event[];
  theme: "light" | "dark";
  /** Characters this device sits in — who a push subscription is for. */
  mine: readonly string[];
  clock: Clock;
  link: SyncState;
  room: string | undefined;
  nav?: ReactNode;
  who?: ReactNode;
  onRoom: (room: string | undefined) => void;
  onTheme: () => void;
  onSay: (message: Record<string, unknown>) => void;
  onPushMany: (events: readonly Event[]) => void;
  /** Where to, and whose — App still owns the mode, because App is the router. */
  onGo: (to: "create" | "sheet" | "log", id?: string) => void;
  /** New character ids come from App, which owns what "a new one" means. */
  newId: () => string;
}) {
  return (
    <Hub
      room={
        <RoomBar
          dmKey={room === undefined ? null : dmKeyFor(room)}
          room={room} link={link} onJoin={onRoom}
          onLeave={() => onRoom(undefined)}
        />
      }
      events={events}
      onNew={() => onGo("create", newId())}
      onOpen={(id) => onGo("sheet", id)}
      onEdit={(id) => onGo("create", id)}
      onImport={(imported) => onPushMany(adopt(imported, clock, newId()))}
      onLog={() => onGo("log")}
      nav={nav}
      who={who}
      theme={theme}
      onTheme={onTheme}
      push={
        <PushToggle
          characters={mine}
          onSubscribe={(sub) => onSay({ kind: "subscribe", sub, characters: mine })}
          onUnsubscribe={(endpoint) => onSay({ kind: "unsubscribe", endpoint })}
        />
      }
    />
  );
}

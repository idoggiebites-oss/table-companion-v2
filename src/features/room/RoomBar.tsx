import { useState } from "react";
import { roomCode, isRoomCode, type SyncState } from "../../core/sync";
import s from "./RoomBar.module.css";

const SAYS: Record<SyncState, string> = {
  live: "Everyone sees this",
  connecting: "Finding the table…",
  offline: "Offline — it will catch up",
};

/**
 * One table, one code, read out loud.
 *
 * The state is said in words rather than shown as a dot: offline is not an
 * error at a table in a cellar, it is a thing that resolves itself, and a red
 * dot says the opposite.
 */
export function RoomBar({
  room, link, dmKey, onJoin, onLeave,
}: {
  room: string | undefined;
  link: SyncState;
  /**
   * The key that seats another device as a DM, shown only to a device that
   * already is one.
   *
   * It has to be readable somewhere or it cannot be shared, and sharing is the
   * whole point: a laptop and a tablet at one table, or a DM whose phone died
   * in week nine. Beside the room code because they are read out in the same
   * breath, and never for a player, who does not have it to show.
   */
  dmKey?: string | null;
  onJoin: (code: string) => void;
  onLeave: () => void;
}) {
  const [typed, setTyped] = useState("");

  if (room !== undefined) {
    return (
      <div className={s.bar} data-testid="room">
        <span className={s.label}>Room</span>
        <span className={s.code} data-testid="room-code">{room}</span>
        <span className={`${s.state} ${s[link]}`} data-testid="link">{SAYS[link]}</span>
        {dmKey !== undefined && dmKey !== null && (
          <span className={s.key} data-testid="dm-key">
            <span className={s.label}>DM key</span> {dmKey}
          </span>
        )}
        <button type="button" className={s.btn} onClick={onLeave}>Leave</button>
      </div>
    );
  }

  return (
    <div className={s.bar} data-testid="room">
      <span className={s.label}>Room</span>
      <button type="button" className={s.btn} onClick={() => onJoin(roomCode())}>Start one</button>
      <input
        className={s.input}
        aria-label="Room code"
        value={typed}
        maxLength={6}
        onChange={(e) => setTyped(e.target.value.toUpperCase())}
      />
      <button type="button" className={s.btn} disabled={!isRoomCode(typed)} onClick={() => onJoin(typed)}>
        Join
      </button>
    </div>
  );
}

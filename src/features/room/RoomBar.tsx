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
  room, link, onJoin, onLeave,
}: {
  room: string | undefined;
  link: SyncState;
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

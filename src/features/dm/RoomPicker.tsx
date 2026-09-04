import {
  isOpenGround, LIGHTS, OPEN_GROUND, TERRAIN, type Room,
} from "../../rules/5e/terrain";
import s from "./RoomPicker.module.css";

/**
 * The DM saying what the room is like.
 *
 * Everything else about a roll the app works out for itself. This is the one
 * thing it cannot see and will not guess: where the fight is happening. So the
 * DM says it once, in a breath, and every turn afterwards carries it — the
 * attack says why it is harder, and the table can read what it is standing in.
 *
 * One control used in two places, which is why it is its own file: preparing a
 * place and changing the room mid-fight are the same six choices, and V1 wrote
 * them out twice.
 */
export function RoomPicker({ room, onChange, prefix = "" }: {
  room: Room;
  onChange: (next: Room) => void;
  /** Distinguishes the prepared room from the live one for a screen reader. */
  prefix?: string;
}) {
  const label = (t: string) => (prefix === "" ? t : `${prefix} ${t.toLowerCase()}`);
  const toggle = (t: Room["terrain"][number]) =>
    onChange({
      ...room,
      terrain: room.terrain.includes(t)
        ? room.terrain.filter((x) => x !== t)
        : [...room.terrain, t],
    });

  return (
    <div className={s.wrap}>
      <span className={s.label}>Light</span>
      <div className={s.seg}>
        {LIGHTS.map((l) => (
          <button
            key={l.id} type="button"
            className={room.light === l.id ? `${s.pick} ${s.on}` : s.pick}
            aria-pressed={room.light === l.id}
            aria-label={label(`Light ${l.name}`)}
            onClick={() => onChange({ ...room, light: l.id })}
          >
            {l.name}
          </button>
        ))}
      </div>

      <span className={s.label}>And the ground</span>
      <div className={s.rows}>
        {TERRAIN.map((t) => {
          const on = room.terrain.includes(t.id);
          return (
            <button
              key={t.id} type="button"
              className={on ? `${s.row} ${s.on}` : s.row}
              aria-pressed={on}
              aria-label={label(t.name)}
              onClick={() => toggle(t.id)}
            >
              <span className={s.nm}>{t.name}</span>
              {/* What the DM is choosing, in the words they would use. The
                  rule is worth teaching at the moment it is picked. */}
              <span className={s.what}>{t.what}</span>
            </button>
          );
        })}
      </div>

      {!isOpenGround(room) && (
        <button
          type="button" className={s.clear}
          aria-label={label("Clear the room")}
          onClick={() => onChange(OPEN_GROUND)}
        >
          Open ground again
        </button>
      )}
    </div>
  );
}

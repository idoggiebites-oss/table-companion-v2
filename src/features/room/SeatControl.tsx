import { DM, seatable, type Seat } from "./seat";
import s from "./SeatControl.module.css";

/**
 * "I am" — which seat this device is sitting in.
 *
 * V1's control, and V1's ergonomics deliberately kept: one control, instant,
 * no confirmation and no announcement. Jumping into a seat is something a DM
 * does mid-sentence while somebody waits, and a dialog in front of it would
 * cost more than it protects (DM.md law 4 — this prevents accidents, not
 * attacks).
 *
 * A native `select` because it is a phone control that a phone already knows
 * how to open, and because the label has to be readable to a screen reader
 * without inventing a listbox.
 */
export function SeatControl({ seat, mine, all, nameOf, onSit }: {
  seat: Seat;
  mine: readonly string[];
  all: readonly string[];
  nameOf: (id: string) => string;
  onSit: (seat: Seat) => void;
}) {
  const offered = seatable(seat, mine, all);
  /* Nothing to choose between: a device with no characters is the DM and the
     control would be a dropdown with one entry. */
  if (offered.length === 0) {
    return <span className={s.only} data-testid="seat">The DM</span>;
  }
  return (
    <label className={s.wrap}>
      <span className={s.lead}>I am</span>
      <select
        className={s.pick}
        data-testid="seat"
        aria-label="Which seat this device is in"
        value={seat.kind === "dm" ? "dm" : `pc:${seat.character}`}
        onChange={(e) => {
          const v = e.target.value;
          onSit(v === "dm" ? DM : { kind: "player", character: v.slice(3) });
        }}
      >
        <option value="dm">The DM</option>
        {offered.map((id) => (
          <option key={id} value={`pc:${id}`}>{nameOf(id)}</option>
        ))}
      </select>
    </label>
  );
}

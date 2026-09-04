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
export function SeatControl({ seat, mine, all, nameOf, onSit, mayBeDm = true, onClaimDm }: {
  seat: Seat;
  mine: readonly string[];
  all: readonly string[];
  nameOf: (id: string) => string;
  onSit: (seat: Seat) => void;
  /**
   * Whether this device holds the room's DM key.
   *
   * Solo, or before joining, this is true and nothing changes — a device on
   * its own kitchen table is its own DM. In somebody else's room it is false
   * until the key is presented, because every disclosure rule in this app is
   * enforced by seat: `visibility.ts` filters the log by it, the fight hides
   * creatures by it, `PREP_KINDS` hides prep by it. All of that was
   * honour-system while "The DM" sat in a dropdown for anyone.
   */
  mayBeDm?: boolean;
  /** Ask the room whether this key is the one. */
  onClaimDm?: (key: string) => void;
}) {
  const offered = seatable(seat, mine, all);

  /*
   * In somebody's room, with no key and no character of your own.
   *
   * This is a real state and it had no name: a phone that has just joined,
   * before its player has made anybody. It must not say "The DM", which is
   * what the old one-entry branch did — that is the exact accident this task
   * exists to stop.
   */
  if (!mayBeDm && offered.length === 0) {
    return (
      <span className={s.wrap}>
        <span className={s.only} data-testid="seat">Watching</span>
        {onClaimDm !== undefined && <ClaimDm onClaim={onClaimDm} />}
      </span>
    );
  }

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
        {/* Absent, not disabled, when this device has no key: a greyed-out
            "The DM" invites somebody to wonder what they are missing, and the
            answer is on the other side of a conversation with the DM anyway. */}
        {mayBeDm && <option value="dm">The DM</option>}
        {offered.map((id) => (
          <option key={id} value={`pc:${id}`}>{nameOf(id)}</option>
        ))}
      </select>
      {!mayBeDm && onClaimDm !== undefined && <ClaimDm onClaim={onClaimDm} />}
    </label>
  );
}

/**
 * A prompt, deliberately.
 *
 * This happens once per device per campaign. A permanent field beside the seat
 * would be a control that is wrong on every screen it appears on afterwards,
 * and the key is something a person is told out loud rather than something
 * they keep to hand.
 */
function ClaimDm({ onClaim }: { onClaim: (key: string) => void }) {
  return (
    <button
      type="button" className={s.claim} data-testid="claim-dm"
      onClick={() => {
        const key = window.prompt("The DM's key for this room");
        if (key !== null && key.trim() !== "") onClaim(key.trim());
      }}
    >
      I am the DM
    </button>
  );
}

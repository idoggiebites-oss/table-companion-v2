import { describe, it, expect } from "vitest";
import { seatIn, DM, type Seat } from "./seat";

/*
 * The eviction rule, stated where it can be read without a hook harness.
 * `useSeat` applies exactly this before `seatIn`.
 */
const allowed = (seat: Seat, exists: readonly string[], mayBeDm: boolean): Seat => {
  const corrected = seatIn(seat, exists);
  return corrected.kind === "dm" && !mayBeDm
    ? { kind: "player", character: exists[0] ?? "" }
    : corrected;
};

describe("a seat this device may not hold", () => {
  it("leaves the DM seat when the room says no", () => {
    /*
     * Hiding "The DM" from the picker is not enough: `useSeat` defaults every
     * fresh device to the DM, so a phone that has never been in a room arrives
     * in somebody else\'s already sitting there.
     */
    expect(allowed(DM, ["kira"], false)).toEqual({ kind: "player", character: "kira" });
  });

  it("keeps it when the device holds the key", () => {
    expect(allowed(DM, ["kira"], true)).toEqual(DM);
  });

  it("keeps it when there is no room at all", () => {
    /* Solo: a device on its own kitchen table is its own DM, which is what
       this hook has always defaulted to. */
    expect(allowed(DM, [], true)).toEqual(DM);
  });

  it("lands on nobody when it has no character to fall back to", () => {
    /* A phone that has just joined, before its player has made anybody.
       `SeatControl` draws this as "Watching" rather than "The DM". */
    expect(allowed(DM, [], false)).toEqual({ kind: "player", character: "" });
  });

  it("is applied AFTER the gone-character correction, not before", () => {
    /*
     * `seatIn` falls back to the DM for a player seat pointing at nobody. Doing
     * these the other way round put a keyless device straight back into the
     * seat it had just been moved out of — which is the bug this order fixes.
     */
    const ghost: Seat = { kind: "player", character: "deleted" };
    expect(allowed(ghost, [], false)).toEqual({ kind: "player", character: "" });
  });

  it("never moves a player who was already seated", () => {
    const kira: Seat = { kind: "player", character: "kira" };
    expect(allowed(kira, ["kira"], false)).toEqual(kira);
  });
});

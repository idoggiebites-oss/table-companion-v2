/**
 * Which seat this device is sitting in.
 *
 * Device-local, and deliberately NOT in the log (ARCHITECTURE.md): a seat is a
 * property of a device, not of the campaign — two people sharing a tablet swap
 * seats without that being a fact everybody else replays.
 *
 * The device also remembers WHICH characters are its own. V1 learned this the
 * hard way: without it the seat control listed the whole party and any player
 * could sit in anyone else's character, reading their sheet and spending their
 * resources. A device claims a character by making one, or by choosing once
 * when it joins a room that already has them.
 *
 * V1's own words on how far that goes, and they still hold:
 *
 *   > This is not a permission: the DM can still seat anyone, and nothing
 *   > stops a determined person clearing storage. It stops the accident,
 *   > which is the thing that actually happens at a table.
 *
 * DM.md law 4: permissions here prevent accidents, not attacks. Nothing checks
 * whether somebody else is currently holding a character — knowing that would
 * take a whole third kind of state (presence), and it was weighed and not
 * built. Two people reaching for the same character is a thing a table settles
 * by speaking.
 */
export type Seat =
  | { readonly kind: "dm" }
  | { readonly kind: "player"; readonly character: string };

export const DM: Seat = { kind: "dm" };

/** Whether this seat acts for that character. */
export const controls = (seat: Seat, character: string): boolean =>
  seat.kind === "player" && seat.character === character;

/**
 * What this device may sit in.
 *
 * The DM is offered everyone — V1's behaviour, kept deliberately: jumping into
 * a seat is one control, instant, with no confirmation and no announcement.
 * Everyone else is offered what this device claimed, PLUS wherever it is
 * already sitting: a DM who took a character from their own list has not
 * claimed it, and dropping it would strand the control on a value it cannot
 * show.
 */
export function seatable(
  seat: Seat,
  mine: readonly string[],
  all: readonly string[],
): readonly string[] {
  if (seat.kind === "dm") return all;
  return all.filter((id) => mine.includes(id) || seat.character === id);
}

/**
 * The seat this device should actually be in, given what exists.
 *
 * A character can go away — undone, or never finished — and a seat pointing at
 * one that is gone is a device with no sheet and no way back. The same shape
 * as `currentOf` for tabs, and for the same reason.
 */
export function seatIn(seat: Seat, all: readonly string[]): Seat {
  if (seat.kind === "dm") return seat;
  return all.includes(seat.character) ? seat : DM;
}

/** How the seat reads on the control that changes it. */
export const seatLabel = (seat: Seat, nameOf: (id: string) => string): string =>
  seat.kind === "dm" ? "The DM" : nameOf(seat.character);

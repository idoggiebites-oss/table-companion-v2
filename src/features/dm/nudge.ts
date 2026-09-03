import { orderOf, activeOf, type Fight } from "./fight";

/**
 * The moments a phone should buzz.
 *
 * A table companion that needs watching is one that gets put face-down. Most
 * of a session a player's phone is in their pocket and should stay there — but
 * some moments cost the table real time when they are missed, and all of them
 * are **somebody being waited for**.
 *
 * Nothing else nudges. Not damage, not a fight ending, not somebody else's
 * turn — *a notification that arrives when nothing is being asked of you
 * teaches people to swipe them away without reading, and then the one that
 * mattered goes with it.*
 *
 * V1 names three: your turn has come round, initiative is being rolled and
 * yours is not in, and the DM has asked YOU for a roll. The third needs the
 * claim seam to run the other way and is not built; the first two are here.
 *
 * Worked out on the device that APPENDS the event rather than in the room
 * server, which holds a log and has never had to understand it. That device is
 * awake by definition: it is the DM pressing Next turn or calling for
 * initiative.
 */
export type Nudge = {
  /** The character whose device should buzz. */
  readonly to: string;
  readonly title: string;
  readonly body: string;
};

/** Whose go it has just become, if it is a player's. */
export function onTurn(fight: Fight): Nudge | null {
  const at = activeOf(fight);
  if (at === null || at.source.kind !== "character") return null;
  return {
    to: at.source.character,
    title: "Your turn",
    body: `Round ${String(fight.round)} — everyone is waiting on you.`,
  };
}

/**
 * Everyone who has not rolled yet, once the table has started rolling.
 *
 * Only players: a creature's initiative is the DM's to enter and nobody is
 * waiting on a phone for it.
 */
export function onRolling(fight: Fight): readonly Nudge[] {
  if (fight.phase !== "rolling") return [];
  return orderOf(fight)
    .filter((c) => c.initiative === null && c.source.kind === "character")
    .map((c) => ({
      to: c.source.kind === "character" ? c.source.character : "",
      title: "Roll for initiative",
      body: "The table is waiting on your roll.",
    }));
}

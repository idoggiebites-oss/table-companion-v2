import { orderOf, activeOf, type Fight } from "./fight";
import { addressees, type Ask } from "../room/ask";

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
 * yours is not in, and the DM has asked YOU for a roll. All three are here now
 * — the third waited on the claim seam running the other way, which `ask.ts`
 * built.
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
 * Everyone the DM has just asked for a roll.
 *
 * The sharpest of the three, and the one V1 could not build: the other two are
 * the table waiting on you in a fight, and this is the DM waiting on you at any
 * moment at all — mid-conversation, phone in a pocket, everybody looking over.
 *
 * The ask's own words, not a generic line. "The DM wants a roll" tells you to
 * open the app; "Perception — DC 14" tells you what is about to happen, which
 * is the difference between a notification worth reading and one worth
 * swiping away.
 */
export function onAsked(ask: Ask, party: readonly string[]): readonly Nudge[] {
  const what = `${ask.name} ${ask.kind === "save" ? "saving throw" : "check"}`;
  return addressees(ask, party).map((to) => ({
    to,
    title: "The DM is asking for a roll",
    body: ask.dc === undefined ? what : `${what} — DC ${String(ask.dc)}`,
  }));
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

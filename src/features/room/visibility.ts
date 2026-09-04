import type { Event, DeviceId } from "../../core/types";
import { FIGHT } from "../dm/fight";
import { PREP } from "../dm/encounter";
import { SCENE } from "../dm/scene";
import { NPC } from "../dm/npc";
import { SESSION } from "../dm/session";

/**
 * What a player's log is allowed to say.
 *
 * The log is the same on every device — that is what makes undo work across
 * the table — but "everyone replays the same events" was quietly taken to mean
 * "everyone reads the same events". A player's screen was printing the DM's
 * prep: the creature waiting in the next room, every point of damage a monster
 * had quietly taken, every change to what the table is allowed to know.
 *
 * **That undoes the disclosure ladder from behind.** The fight screen can hide
 * a creature as carefully as it likes while the Log tab two taps away names it.
 *
 * V1's rule, ported: **the rule is about the AUDIENCE, not the actor.** A thing
 * the table would see happen is public; a thing the DM did alone is not. Damage
 * a player dealt is public because they rolled it out loud; a creature quietly
 * losing hit points is not.
 *
 * By KIND, never by reading the ladder at render time. A filter that asked
 * "is this creature hidden *now*" would answer differently after the DM slid
 * the rung up — so an event a player was never meant to see would appear
 * retroactively, and replaying the log on a fresh device would disagree with
 * the device that was there. The audience of an event is fixed when it
 * happens.
 */

/** The acts on a fight event that happen behind the screen. */
export const BEHIND_THE_SCREEN = new Set([
  /* Putting a creature on the table is preparation, not narration — and the
     name alone is the whole of what `hidden` is protecting. */
  "stage",
  "unstage",
  /* The ladder itself. A player reading "the dragon is now vague" has been
     told there is a dragon. */
  "disclose",
  /* A creature quietly losing hit points. The damage a PLAYER dealt is public
     — that is the claim, and they rolled it out loud — but the DM applying
     four to something in the dark is not. */
  "hurt",
  /* Same reasoning: a condition on a creature the player may not know exists. */
  "condition",
]);

/**
 * The acts the table watches happen. Listed rather than inferred, so adding a
 * new act is a decision about its audience instead of a silent default —
 * defaulting to public is how the leak happened the first time.
 */
const AT_THE_TABLE = new Set([
  "roll",     // "roll for initiative" is said out loud
  "begin",
  /* Setting the room live IS public, and the distinction is the whole of the
     rule: the table can see that it is dark and the floor is rubble. What they
     may not see is the DM preparing that place an hour earlier. */
  "room",
  "advance",  // whose turn it is, is the whole table's business
  "claim",    // the player rolled and announced it
  "verdict",  // the DM said "that hits" out loud
  "clear",
]);

/**
 * Kinds that are prep from end to end, whatever act they carry.
 *
 * The fight is one kind whose acts split by audience, so it is filtered act by
 * act. These do not split: **every** act on them happens behind the screen an
 * hour before anybody sits down, and there is no such thing as a public one.
 *
 * They are named because the default above is public, and that default was
 * quietly wrong for keeping an encounter: V1 puts `encounterSaved` behind the
 * screen and V2's log printed it to the table. A player who reads that the DM
 * just prepared something has been told what is coming — and for a scene, whose
 * one line is "the cellar · dark · a note", they have been told rather more.
 * Fixed here rather than per feature, so an NPC needs only join the set: V1
 * puts `npcSaved`/`npcDeleted` behind the screen for the same reason — a
 * shopkeeper the DM just wrote down is prep, not something the table watched
 * happen, whichever of the two acts on it fires.
 *
 * A prepared session joins for the same reason as a scene: the plan for
 * tonight — its opening recap, its goals, its checklist — is written before
 * the table sits down, and none of it is something the table has watched
 * happen. It is also not `recap.ts`'s `Session`, which is derived from the
 * log rather than an event on it and so never appears here at all.
 */
const PREP_KINDS = new Set<string>([PREP, SCENE, NPC, SESSION]);

const actOf = (e: Event): string | null =>
  e.kind === FIGHT ? String((e.data as Record<string, unknown>)["act"] ?? "") : null;

/**
 * Whether this event happened behind the DM's screen.
 *
 * A WHITELIST, deliberately: only the acts the table watches happen are
 * public, and anything else is not. An act named in neither set is private,
 * because a new fight act is far likelier to be prep than narration and the
 * failure that matters is the one that shows too much. `BEHIND_THE_SCREEN`
 * therefore documents what is known-private rather than deciding it — a test
 * holds the two in agreement so the list cannot rot into a comment.
 *
 * Non-fight events are public by default: a character's own choices, levels
 * and hit points are things the table watches happen. `PREP_KINDS` is the
 * exception, and it had to be — see below.
 */
export function isDmOnly(e: Event): boolean {
  if (PREP_KINDS.has(e.kind)) return true;
  const act = actOf(e);
  if (act === null) return false;
  return !AT_THE_TABLE.has(act);
}

/** What this seat may read. The DM holds the table together and sees all. */
export const visibleInLog = (e: Event, dm: boolean): boolean => dm || !isDmOnly(e);

export const logFor = (events: readonly Event[], dm: boolean): readonly Event[] =>
  dm ? events : events.filter((e) => visibleInLog(e, dm));

/**
 * Who may take something back.
 *
 * The DM may undo anything, because they are the one holding the table
 * together; a player may undo what they did themselves. Undoing somebody
 * else's action is a conversation, not a button.
 *
 * "Themselves" is this DEVICE, which is the closest honest reading here: the
 * log records which device authored an event, not which person, and a device
 * is what a player has in their hand.
 */
export const mayRevert = (e: Event, dm: boolean, device: DeviceId): boolean =>
  dm || e.by === device;

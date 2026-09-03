/**
 * Who may change what.
 *
 * **This is NOT a security boundary.** Everyone holding a room code is a
 * person at the table, and the log is trusted among them — someone who wanted
 * to forge an event could. What this prevents is accidents and confusion: the
 * wrong sheet edited, two people applying the same hit, a player quietly
 * topping up their own hit points without anyone seeing.
 *
 * V1's default is deliberate and is kept: **the DM applies damage and healing
 * to anyone.** Waiting for a player to find the right field mid-combat is
 * slower than the DM typing it while narrating, and speed is the point. That
 * is only acceptable because every change is attributed and reversible — the
 * log records which device did it, and undo is an append rather than a
 * deletion, so nothing here happens quietly.
 *
 * The seat is device-local and never in the log, so these answers are about
 * what a screen should OFFER, not about what the log will accept.
 */

export type TableRules = {
  /** When false, only a character's own player may change their sheet. */
  readonly dmMayEditCharacters: boolean;
};

export const DEFAULT_RULES: TableRules = { dmMayEditCharacters: true };

/**
 * A player may change their own sheet and nobody else's; the DM may change
 * anyone's, unless the table has turned that off.
 *
 * `seated` is the character this device is sitting in, or null for the DM.
 */
export function mayEditCharacter(
  seated: string | null,
  character: string,
  rules: TableRules = DEFAULT_RULES,
): boolean {
  if (seated !== null) return seated === character;
  return rules.dmMayEditCharacters;
}

/**
 * Creatures are the DM's, always.
 *
 * A player rolls damage and says what they got; the DM applies it. That is the
 * claim seam, and it is the same division that keeps the disclosure ladder
 * intact — a player who could apply their own damage would learn a creature's
 * armour class by trial.
 */
export const mayEditCreature = (seated: string | null): boolean => seated === null;

import type { Combatant, Fight } from "./fight";
import { orderOf } from "./turnorder";

/**
 * What a creature has spent this turn, and what it has left this round.
 *
 * V1's `combat.ts` holds this and V2 did not, and V1 says plainly what the
 * absence costs: before it existed, *"a DM running six goblins tracked 'has
 * that one used its bonus action' in their head, six times, every round."*
 * Players have had an economy since the beginning; creatures had nothing.
 *
 * **Everything here is spent per TURN except legendary actions, which are per
 * ROUND.** That is the rule and it is the one people get backwards: legendary
 * actions come back at the start of the creature's own turn, so between one of
 * its turns and the next the count only goes down — across everybody else's
 * turns, which is exactly when they are taken.
 *
 * The translation from V1: it holds a `Combat` struct and `advance` mutates
 * these maps in place. V2 folds from an append-only log, so a reset cannot be
 * an assignment — `openingAt` is a pure function of the fight and the turn
 * being opened, and `fight.ts` applies it inside the `advance` case.
 */

export const ECONOMY = ["action", "bonus", "reaction"] as const;
export type EconomyKind = (typeof ECONOMY)[number];
export type Economy = Readonly<Record<EconomyKind, boolean>>;

export const FRESH: Economy = { action: false, bonus: false, reaction: false };

/** What this one has spent this turn. Nothing recorded is nothing spent. */
export const spentBy = (f: Fight, id: string): Economy => f.spent[id] ?? FRESH;

/**
 * A reaction is the exception that proves the per-turn rule.
 *
 * It is spent on somebody ELSE's turn and comes back when yours opens, which
 * is why it lives in the same map as the action rather than in a special case:
 * `openingAt` clears the whole entry, and that is the correct behaviour for
 * all three.
 */
export const hasReaction = (f: Fight, id: string): boolean => !spentBy(f, id).reaction;

/** Legendary actions used this round. */
export const legendaryUsed = (f: Fight, id: string): number => f.legendarySpent[id] ?? 0;

/**
 * Whose turn is opening, given the turn index the fight is moving to.
 *
 * Not `activeOf`: this runs DURING `advance`, before the new turn is stored,
 * so it has to be asked about a position rather than about the fight's own
 * idea of where it is.
 */
export const openingAt = (f: Fight, turn: number): Combatant | undefined =>
  orderOf(f)[turn];

/**
 * The maps as they stand once that creature's turn opens.
 *
 * Its action, bonus action and reaction all come back, and so do its legendary
 * actions — *at the start of its turn*, which is the half of the rule that
 * makes them a threat on everybody else's. Returned rather than assigned so
 * the reducer stays a fold.
 */
export function openingTurn(f: Fight, turn: number): Pick<Fight, "spent" | "legendarySpent"> {
  const opening = openingAt(f, turn);
  if (opening === undefined) return { spent: f.spent, legendarySpent: f.legendarySpent };
  const spent = { ...f.spent };
  const legendarySpent = { ...f.legendarySpent };
  delete spent[opening.id];
  delete legendarySpent[opening.id];
  return { spent, legendarySpent };
}

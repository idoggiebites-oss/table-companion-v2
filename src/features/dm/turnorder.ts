import type { Combatant, Fight, Act } from "./fight";

/**
 * Who is up, and who is next.
 *
 * Split out of `fight.ts` when that file passed its budget, and the seam was
 * already there: everything here answers "in what order", and nothing here
 * changes anything. `fight.ts` re-exports the three a caller wants.
 */

/**
 * Higher initiative first; anyone who has not rolled last; ties by the order
 * the DM staged them.
 *
 * Ported from V1's `sortOrder`, including its reason: the tie-break consults
 * only the staged order, so the same fight resolves the same way on every
 * device. A sort that reached for anything device-local would desynchronise
 * the table.
 *
 * Not-yet-rolled sorts LAST rather than as a zero, so a half-rolled order
 * still reads correctly while the table waits.
 */
export function orderOf(f: Fight): readonly Combatant[] {
  return f.combatants
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ai = a.c.initiative;
      const bi = b.c.initiative;
      if (ai === null && bi === null) return a.i - b.i;
      if (ai === null) return 1;
      if (bi === null) return -1;
      return bi - ai || a.i - b.i;
    })
    .map(({ c }) => c);
}

/** Who the table is still waiting on. */
export const awaiting = (f: Fight): readonly Combatant[] =>
  f.combatants.filter((c) => c.initiative === null);

/** Whose go it is, or null before the fight runs. */
export function activeOf(f: Fight): Combatant | null {
  if (f.phase !== "active") return null;
  return orderOf(f)[f.turn] ?? null;
}

/**
 * Acts that can change the ORDER, and so can move whose go it is.
 *
 * Staging and unstaging change who is in it; rolling changes where somebody
 * sits. Everything else — damage, conditions, claims, the room — leaves the
 * order alone.
 */
export const REORDERS = new Set<Act["act"]>(["stage", "unstage", "roll"]);

/**
 * The same combatant is still up after the order underneath them changes.
 *
 * `turn` is an index into a DERIVED order, and this file used to argue that
 * was the better half of the trade: *"the order is not [real information],
 * because it is a function of the initiative values every device already has.
 * V1 stored both and had to re-anchor the pointer whenever the roster
 * changed."* V1's re-anchoring was not overhead. It was the correctness.
 *
 * Measured, on this code, before the fix: Aria on 20 and Bram on 5, Bram up.
 * A goblin arrives and rolls 15, so the order becomes Aria, goblin, Bram —
 * and `turn` still says 1, which is now the goblin. **Bram's turn is silently
 * taken from him and never comes back.** A DM can do this from the staging
 * screen today, mid-fight, which is exactly when reinforcements arrive.
 *
 * So the pointer is re-anchored by id, which is V1's `joinCombat` in the
 * shape a fold can hold. Nothing is stored that was not stored before.
 */
export function keepingTurn(before: Fight, after: Fight): Fight {
  if (before.phase !== "active") return after;
  const was = orderOf(before)[before.turn];
  if (was === undefined) return after;
  const at = orderOf(after).findIndex((c) => c.id === was.id);
  /* Taken off the table on their own go: that turn is over, and whoever slid
     into the empty slot is up. Clamped, because they may have been last. */
  const turn = at === -1
    ? Math.min(before.turn, Math.max(0, after.combatants.length - 1))
    : at;
  return turn === after.turn ? after : { ...after, turn };
}

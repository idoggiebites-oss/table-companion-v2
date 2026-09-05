import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import type { Stack } from "../../rules/5e/items";

export const HOLD = "party.hold";

/**
 * Moving a thing from one holder to another, and the coins that go with it.
 *
 * **One mechanism, three of Arturo's lines.** A player giving another player
 * half their potions, a DM handing out a reward or taking a stolen ring back,
 * and buying something in a shop are the same event with different ends —
 * building them separately would have been three ways to be wrong about the
 * same arithmetic.
 *
 * Additive over `carried.ts` rather than inside it. `stacksOf` derives what a
 * character owns from the doors creation opened — its class's equipment lines,
 * the weapons that settled a category, what the pack contained — and that is a
 * true statement about how they STARTED. What happens afterwards is a
 * different fact, so it folds on top rather than editing history.
 *
 * Coins are copper, always. V1's reason, and it is the one that bites: "the
 * moment a purse is a decimal, a 5 sp item bought with a gold piece comes back
 * as 0.4999999 gp and a session of trading ends in numbers nobody can
 * reconcile."
 */
export type HoldAct =
  /** Coins added or taken. Negative takes. */
  | { readonly act: "coins"; readonly who: string; readonly copper: number }
  /**
   * A stack moved. `from` absent is the DM conjuring it — loot, a reward, a
   * thing the party found — and `to` absent is it leaving the table.
   */
  | {
      readonly act: "move";
      readonly from?: string;
      readonly to?: string;
      readonly itemId: string;
      readonly name: string;
      readonly qty: number;
    };

export type Holdings = {
  /** Copper held, by character. */
  readonly purse: Readonly<Record<string, number>>;
  /** What has changed hands since creation, by character then item. */
  readonly moved: Readonly<Record<string, Readonly<Record<string, Stack>>>>;
};

export const NOTHING_HELD: Holdings = { purse: {}, moved: {} };

const asAct = (e: Event): HoldAct | null =>
  e.kind === HOLD ? (e.data as unknown as HoldAct) : null;

const shift = (
  moved: Holdings["moved"],
  who: string | undefined,
  itemId: string,
  name: string,
  by: number,
): Holdings["moved"] => {
  if (who === undefined) return moved;
  const mine = moved[who] ?? {};
  const had = mine[itemId]?.qty ?? 0;
  return { ...moved, [who]: { ...mine, [itemId]: { itemId, name, qty: had + by } } };
};

function reduce(h: Holdings, e: Event): Holdings {
  const a = asAct(e);
  if (a === null) return h;
  if (a.act === "coins") {
    /* Never below nothing: a purse cannot be overdrawn, and a DM taking more
       than somebody has means they have nothing, not that they owe. */
    const now = Math.max(0, (h.purse[a.who] ?? 0) + a.copper);
    return { ...h, purse: { ...h.purse, [a.who]: now } };
  }
  const out = shift(h.moved, a.from, a.itemId, a.name, -a.qty);
  return { ...h, moved: shift(out, a.to, a.itemId, a.name, a.qty) };
}

export const holdingsFrom = (events: readonly Event[]): Holdings =>
  fold(events, reduce, NOTHING_HELD);

/** What this character's purse holds, in copper. */
export const purseOf = (h: Holdings, who: string): number => h.purse[who] ?? 0;

/**
 * What creation gave them, plus everything that has changed hands since.
 *
 * A stack that reaches zero is gone rather than shown as "0 × rope" — and one
 * that goes NEGATIVE is gone too: a character can give away a rope creation
 * never recorded, and the honest answer is that they have none, not −1.
 */
export function heldBy(
  h: Holdings, who: string, base: readonly Stack[],
): readonly Stack[] {
  const deltas = h.moved[who] ?? {};
  const byId = new Map<string, Stack>();
  for (const s of base) byId.set(s.itemId, s);
  for (const [id, d] of Object.entries(deltas)) {
    const had = byId.get(id);
    byId.set(id, { itemId: id, name: had?.name ?? d.name, qty: (had?.qty ?? 0) + d.qty });
  }
  return [...byId.values()].filter((s) => s.qty > 0);
}

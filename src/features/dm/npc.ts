import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import { formatPrice } from "../../rules/5e/money";

export const NPC = "npc.act";

/**
 * The people in the world, as opposed to the things fighting the party.
 *
 * An NPC is not a statblock. Most of the ones a campaign accumulates never
 * roll anything — a shopkeeper, a harbourmaster, the contact who knows a guy —
 * and forcing them through a creature form would mean inventing an armour
 * class for a man who sells rope. So the record is notes-first, with stats as
 * an optional afterthought for the ones where it turns out to matter, because
 * it always eventually matters for one of them. Nothing here builds a stats
 * editor either — V1's own `Npcs.tsx` never exposed one, `stats` is written by
 * nothing today, and a field with no writer is not this task's to invent one
 * for.
 *
 * Inventory hangs off a `trader` flag rather than existing on every NPC, for
 * the same reason: a stock list on a record that will never sell anything is
 * a field that has to be skipped every time the form is opened.
 *
 * Prices are per-NPC, not per-item. The point of a trader is that this one
 * charges more, and a stock list that could only quote one fixed price would
 * make every shop in the campaign identical.
 *
 * Ported from V1's `domain/npc.ts`. What did NOT come with it: V1 picked
 * stock off the SRD/homebrew catalogue (`Shop.tsx`, `useCatalogue`) and let a
 * player buy from it, moving coin between a party purse and this NPC — V2
 * models no party purse yet, and the acceptance criteria ask for the trader
 * flag and its data, not a purchase flow. A trader's stock here is typed in
 * by hand: name, price, quantity. Smaller than wiring the whole compendium
 * into this form, and still the thing an NPC actually needs — a shelf the DM
 * can describe.
 */
export type StockEntry = {
  readonly itemId: string;
  readonly name: string;
  /** Copper. The DM's to set — a shop charges what it charges, not the SRD. */
  readonly price: number;
  /** How many are for sale. Negative means an unlimited supply. */
  readonly qty: number;
};

export type NpcStats = {
  readonly ac?: number;
  readonly hp?: number;
  readonly notes?: string;
};

export type Npc = {
  readonly id: string;
  readonly name: string;
  /** "Shopkeeper", "Harbourmaster" — what they are to the party. */
  readonly role: string;
  readonly trader: boolean;
  readonly notes: string;
  readonly stats?: NpcStats;
  readonly stock: readonly StockEntry[];
};

export const blankNpc = (id: string): Npc =>
  ({ id, name: "", role: "", trader: false, notes: "", stock: [] });

/** Ready enough to keep: a name is the only thing an NPC truly needs. */
export const isNamed = (npc: Npc): boolean => npc.name.trim().length > 0;

export const UNLIMITED = -1;

export const isUnlimited = (entry: StockEntry): boolean => entry.qty < 0;
export const inStock = (entry: StockEntry): boolean => isUnlimited(entry) || entry.qty > 0;

/** "12 gp · 3 left", or just the price when the supply is endless. */
export function describeStock(entry: StockEntry): string {
  const price = formatPrice(entry.price);
  return isUnlimited(entry) ? price : `${price} · ${String(entry.qty)} left`;
}

/**
 * Selling one down. An unlimited entry never runs out.
 *
 * Ported as a pure function only. V1's `itemBought` called this from
 * `Shop.tsx` in the same breath as moving coin out of a party purse — this
 * module has no purse to move it from, so it stops at the arithmetic and
 * leaves "when does one sell" to whatever eventually models buying.
 */
export function sellOne(stock: readonly StockEntry[], itemId: string): StockEntry[] {
  return stock.flatMap((e) => {
    if (e.itemId !== itemId || isUnlimited(e)) return [e];
    return e.qty <= 1 ? [] : [{ ...e, qty: e.qty - 1 }];
  });
}

/**
 * A stable key for a hand-typed stock entry, so adding "Rope" a second time
 * updates the one row instead of doubling the shelf — the same reason V1's
 * catalogue items dedup by `itemId`, just derived from a name instead of a
 * compendium id.
 */
export function stockId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || `item-${Date.now().toString(36)}`;
}

export type People = { readonly npcs: readonly Npc[] };
export const NOBODY: People = { npcs: [] };

export type NpcAct =
  | { readonly act: "save"; readonly npc: Npc }
  | { readonly act: "forget"; readonly id: string };

const asAct = (e: Event): NpcAct | null =>
  e.kind === NPC ? (e.data as unknown as NpcAct) : null;

function reduce(p: People, e: Event): People {
  const a = asAct(e);
  if (a === null) return p;
  switch (a.act) {
    case "save":
      /* Same id replaces, exactly as a kept encounter does: editing an NPC is
         not acquiring a second one. */
      return { npcs: [...p.npcs.filter((x) => x.id !== a.npc.id), a.npc] };
    case "forget":
      return { npcs: p.npcs.filter((x) => x.id !== a.id) };
  }
}

export const peopleFrom = (events: readonly Event[]): People => fold(events, reduce, NOBODY);

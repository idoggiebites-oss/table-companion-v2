/**
 * Money, for the one place V2 needs to talk about it: an NPC's asking price.
 *
 * Held as an integer number of copper pieces, always — ported from V1's
 * `domain/money.ts`. Gold is a display unit, not a storage unit: the moment a
 * price is a decimal, a 5 sp item quoted against a gold piece comes back as
 * 0.4999999 and a session of trading ends in numbers nobody can reconcile.
 * Integers make the arithmetic exact.
 *
 * V1's file also carried `formatCoins`, `canAfford` and `splitCoins` — a
 * party's purse, shown and checked against a price. V2 has no party purse to
 * check a price against (see `features/dm/npc.ts`), so only what an NPC's
 * price tag and its entry field need comes with it: `formatPrice` to show a
 * price, `parseCoins` to read one back from what the DM types.
 */

/** How much copper each coin is worth. */
export const COPPER_PER = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
} as const;

export type Coin = keyof typeof COPPER_PER;

export function toCopper(amount: number, unit: Coin): number {
  return Math.round(amount * COPPER_PER[unit]);
}

/**
 * The short form for a price tag, where a second unit is noise: 1500 cp reads
 * "15 gp" and 1550 reads "15.5 gp". Rounds toward the shown unit rather than
 * inventing precision.
 */
/** Units a purse is SHOWN in, largest first. Not the units it accepts. */
const SHOWN: readonly Coin[] = ["gp", "sp", "cp"];

/**
 * A purse, broken into the coins somebody would actually hand over.
 *
 * Electrum and platinum convert on the way in and are never shown: neither is
 * on a price list anyone uses, and a purse that turns the 10 gp you were just
 * handed into "1 pp" starts a rules argument in the middle of a shop.
 */
export function splitCoins(copper: number): Partial<Record<Coin, number>> {
  let left = Math.max(0, Math.trunc(copper));
  const out: Partial<Record<Coin, number>> = {};
  for (const coin of SHOWN) {
    const n = Math.floor(left / COPPER_PER[coin]);
    if (n > 0) out[coin] = n;
    left -= n * COPPER_PER[coin];
  }
  return out;
}

/** "15 gp", "1 gp 5 sp", "0 cp" — never an empty string. */
export function formatCoins(copper: number): string {
  if (copper <= 0) return "0 cp";
  const parts = splitCoins(copper);
  return SHOWN.filter((c) => parts[c] !== undefined).map((c) => `${String(parts[c])} ${c}`).join(" ");
}

export function formatPrice(copper: number): string {
  if (copper <= 0) return "—";
  if (copper >= COPPER_PER.gp) {
    const gp = copper / COPPER_PER.gp;
    return `${Number.isInteger(gp) ? gp : gp.toFixed(1)} gp`;
  }
  if (copper >= COPPER_PER.sp) {
    const sp = copper / COPPER_PER.sp;
    return `${Number.isInteger(sp) ? sp : sp.toFixed(1)} sp`;
  }
  return `${copper} cp`;
}

/**
 * Parses what someone types into a coin field: "15", "15gp", "5 sp", "2 GP".
 * A bare number is gold, because that is what everyone means.
 */
export function parseCoins(input: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(pp|gp|ep|sp|cp)?\s*$/i.exec(input);
  if (!m) return null;
  const unit = (m[2]?.toLowerCase() ?? "gp") as Coin;
  return toCopper(Number(m[1]), unit);
}

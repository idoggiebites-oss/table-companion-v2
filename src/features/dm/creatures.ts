import { loadLayer, type Fetcher } from "../../content/load";
import type { CreatureEntry } from "../../content/schema";
import type { Option, Lair } from "../../content/legendary";

/**
 * The bestiary, as the DM side reads it.
 *
 * Two fetches with very different costs, which is why they are two:
 *
 *   - **The index**, 6,633 rows and 141KB gzipped, is the searchable list. It
 *     is pulled when somebody opens the staging screen and not before — the
 *     same policy the spell and item indexes have, and the reason the service
 *     worker precaches neither.
 *   - **One statblock at a time**, 1KB at the median and 3KB at the largest.
 *     As a single chunk the blocks come to 2.3MB gzipped, so a DM staging
 *     three goblins would have paid for all six thousand.
 *
 * The legendary options and the lair are already resolved: `compile-content`
 * runs the parser, so what arrives here is the three things a dragon can do
 * rather than the eleven entries the book prints.
 */
export type Statblock = {
  readonly id: string;
  readonly abilities: Readonly<Record<string, number>>;
  readonly speed: Readonly<Record<string, string>>;
  readonly hitDice: string;
  readonly senses: string;
  readonly languages: string;
  readonly acNote: string;
  readonly alignment: string;
  readonly xp: number;
  readonly saves: unknown;
  readonly skills: unknown;
  readonly immunities: unknown;
  readonly traits: readonly { name: string; desc?: string }[];
  readonly actions: readonly { name: string; desc?: string }[];
  readonly reactions: readonly { name: string; desc?: string }[];
  readonly legendary: readonly Option[];
  readonly lair: Lair | null;
};

export const bestiary = (fetcher?: Fetcher): Promise<CreatureEntry[]> =>
  loadLayer<CreatureEntry>("content/index/creature.json", fetcher);

/** One statblock. Absent is normal — an SRD-only build ships none of these. */
export async function statblock(id: string, fetcher: Fetcher = fetch): Promise<Statblock | null> {
  try {
    const res = await fetcher(`content/detail/creature/${id}.json`);
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return typeof json === "object" && json !== null ? (json as Statblock) : null;
  } catch {
    return null;
  }
}

/**
 * What a staging list shows about a creature before it is opened.
 *
 * "CR 14 · Huge dragon · AC 19 · 195 hp", and the two facts that change how a
 * DM runs it: whether it acts between turns, and whether its lair does.
 */
export const describe = (c: CreatureEntry): string =>
  [`CR ${crName(c.cr)}`, [SIZE[c.size] ?? c.size, c.type].filter(Boolean).join(" "),
   `AC ${String(c.ac)}`, `${String(c.hp)} hp`].filter(Boolean).join(" · ");

/** The book writes an eighth as 1/8, and so should a list. */
export function crName(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

const SIZE: Record<string, string> = {
  T: "Tiny", S: "Small", M: "Medium", L: "Large", H: "Huge", G: "Gargantuan",
};

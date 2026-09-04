import { loadLayer, type Fetcher } from "../../content/load";
import type { CreatureEntry } from "../../content/schema";
import type { Option, Lair } from "../../content/legendary";
import { contentUrl } from "../../content/base";
import type { Entry } from "./statblock";

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
/*
 * The detail file, as it is actually shaped on disk.
 *
 * Several of these were declared `unknown` or `string` and are neither. The
 * view reads every one of them, so a wrong type here is a wrong line at the
 * table: `senses` is `{notes}` on 666 of 900 sampled creatures and a bare
 * string on the rest, `saves` and `skills` are modifier maps or null, and
 * `immunities` is a list or null. Nothing carries resistances, vulnerabilities
 * or condition immunities — V1's type had all three and the corpus has none,
 * so they are absent here rather than optional-and-never-set.
 *
 * The identity half — name, size, type, AC, hit points, CR — is in the index
 * row, not here, which is why the view takes both.
 */
export type Statblock = {
  readonly id: string;
  readonly abilities: Readonly<Record<string, number>>;
  readonly speed: Readonly<Record<string, string>>;
  readonly hitDice: string;
  readonly senses: string | { readonly notes?: string };
  readonly languages: string;
  readonly acNote: string;
  readonly alignment: string;
  readonly xp: number;
  readonly saves: Readonly<Record<string, number>> | null;
  readonly skills: Readonly<Record<string, number>> | null;
  readonly immunities: readonly string[] | null;
  readonly traits: readonly Entry[];
  readonly actions: readonly Entry[];
  readonly reactions: readonly Entry[];
  readonly legendary: readonly Option[];
  readonly lair: Lair | null;
};

export const bestiary = (fetcher?: Fetcher): Promise<CreatureEntry[]> =>
  loadLayer<CreatureEntry>(contentUrl("index/creature.json"), fetcher);

/** One statblock. Absent is normal — an SRD-only build ships none of these. */
export async function statblock(id: string, fetcher: Fetcher = fetch): Promise<Statblock | null> {
  try {
    const res = await fetcher(contentUrl(`detail/creature/${id}.json`));
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

/**
 * What kind of thing a creature is, with the subtype dropped.
 *
 * Ported from V1's `domain/creature.ts`: the compendium ships 6,633 monsters
 * under 416 distinct `type` strings — "humanoid (any race)", "fiend (demon)",
 * "humanoid (elf)" — because the files keep the subtype inside the type. That
 * is 416 piles, which is a second search rather than a filter. The rulebook
 * has fourteen, and normalising to them is what turns the list into one a DM
 * can scan before opening the search box.
 *
 * V1 also bands CR into "is this a fair fight" buckets (fodder/standard/
 * deadly/legendary) as a filter alongside a raw ceiling. Not ported: this
 * task names only the ceiling and the kind, and a numeric max already answers
 * the same question the bands do — a second control that says it again is not
 * a decision, it is a duplicate.
 */
export const CREATURE_KINDS = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental",
  "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead",
] as const;

export type CreatureKind = (typeof CREATURE_KINDS)[number];

/** Unrecognised returns null rather than forcing a homebrew type into a pile it is not in. */
export function creatureKind(type: string): CreatureKind | null {
  const head = type.split("(")[0]!.trim().toLowerCase();
  return (CREATURE_KINDS as readonly string[]).includes(head) ? (head as CreatureKind) : null;
}

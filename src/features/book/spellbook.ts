import { loadLayer, loadList, type Fetcher } from "../../content/load";
import type { SpellEntry } from "../../content/schema";
import { contentUrl } from "../../content/base";

/**
 * The spell lookup, as either seat reads it.
 *
 * V1's whole argument, in `SpellLookup.tsx`'s own words: *"A player casts Hold
 * Person, the table looks at the DM — who had the whole bestiary and not one
 * spell."* `Bestiary.tsx` fixed the DM's half of that; this is the other half,
 * and — Task 48's change from Task 47 — it is reachable by BOTH seats. See
 * `BookScreen.tsx` for the seam that keeps the bestiary itself DM-only while
 * this joins the player's bar too.
 *
 * Two fetches, and they do NOT share a shape the way the bestiary's index and
 * statblocks do:
 *
 *   - **The index**, `SpellEntry[]`, 3,443 rows and 1.2MB raw. Level, school,
 *     the classes that grant it, and `isFeature` (see `schema.ts`) — enough to
 *     search and to draw a closed row. Pulled when the Book screen opens, not
 *     before, same policy as the bestiary's.
 *   - **The prose** is NOT split per spell the way statblocks are split per
 *     creature. `compile-content.ts` writes `detail/spell.json` as one 3.9MB
 *     list holding all 3,443 entries' full text — there is no per-spell file
 *     to ask for, and splitting it is out of this task's scope. So it is
 *     fetched ONCE, lazily, the first time anybody opens a spell, and the
 *     component holds the resulting array rather than asking again per row —
 *     see `SpellLookup.tsx`'s own comment on exactly where that happens.
 *     Reading the SECOND spell then costs nothing further; reading zero costs
 *     nothing at all, which is the whole reason this is lazy in the first
 *     place.
 */
export type SpellDetail = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly school: string;
  readonly time: string;
  readonly range: string;
  readonly components: string;
  readonly duration: string;
  readonly classes: readonly string[];
  readonly text: string;
  readonly ritual: boolean;
  readonly concentration: boolean;
};

export const spellIndex = (fetcher?: Fetcher): Promise<SpellEntry[]> =>
  loadLayer<SpellEntry>(contentUrl("index/spell.json"), fetcher);

/** The whole 3.9MB list. See this file's header for why it is one fetch, not 3,443. */
export const spellDetails = (fetcher?: Fetcher): Promise<SpellDetail[]> =>
  loadList<SpellDetail>(contentUrl("detail/spell.json"), fetcher);

/** "cantrip", "3rd level" — the book's own words, not "level 3". */
export function levelLabel(level: number): string {
  if (level === 0) return "cantrip";
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${String(level)}${suffix} level`;
}

/**
 * What a closed row shows: the two facts the INDEX carries, not the detail
 * chunk — `time`/`range`/`duration` live only in the 3.9MB list, so a row that
 * has not been opened yet cannot show them without paying for all 3,443.
 *
 * A `isFeature` entry gets its own line rather than "cantrip · evocation":
 * the name already says what it is — "Invocation: Agonizing Blast" — and most
 * carry no real school (`content/spells.ts`'s `isClassFeature` uses exactly
 * that absence to detect them), so repeating an empty or misleading school
 * under the name would be noise, not information.
 */
export const describe = (sp: SpellEntry): string =>
  sp.isFeature ? "class feature" : [levelLabel(sp.level), sp.school].filter(Boolean).join(" · ");

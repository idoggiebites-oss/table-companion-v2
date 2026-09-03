import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import type { Disclosure } from "./fight";

export const PREP = "prep.act";

/**
 * An encounter: a roster kept, to be put on the table later.
 *
 * Staging already assembles a fight; nothing kept one, so a DM who wanted the
 * same three goblins next week rebuilt them. This is the keeping.
 *
 * Ported from V1's `encounter.ts`. Its arithmetic is the part worth
 * automating: summing across instances is what nobody enjoys and what nobody
 * gets wrong twice.
 */

/** One group in an encounter — three goblins are one entry with a count. */
export type Entry = {
  readonly statblock: string;
  readonly name: string;
  readonly count: number;
  readonly max: number;
  readonly ac: number;
  /** Challenge rating, already a number: 0.125 rather than "1/8". */
  readonly cr: number;
  /** What players see when this group reaches initiative. */
  readonly disclosure: Disclosure;
};

export type Encounter = {
  readonly id: string;
  readonly name: string;
  /** Where it happens, in the DM's own words. "Forest Road". */
  readonly place: string;
  readonly entries: readonly Entry[];
};

export type Prep = { readonly encounters: readonly Encounter[] };
export const NO_PREP: Prep = { encounters: [] };

export type PrepAct =
  | { readonly act: "keep"; readonly encounter: Encounter }
  | { readonly act: "forget"; readonly id: string };

const asAct = (e: Event): PrepAct | null =>
  e.kind === PREP ? (e.data as unknown as PrepAct) : null;

function reduce(p: Prep, e: Event): Prep {
  const a = asAct(e);
  if (a === null) return p;
  switch (a.act) {
    case "keep":
      /* Same id replaces: editing an encounter is not acquiring a second. */
      return { encounters: [
        ...p.encounters.filter((x) => x.id !== a.encounter.id), a.encounter,
      ] };
    case "forget":
      return { encounters: p.encounters.filter((x) => x.id !== a.id) };
  }
}

export const prepFrom = (events: readonly Event[]): Prep => fold(events, reduce, NO_PREP);

/** How many creatures are actually on the table. */
export const creatureCount = (e: Encounter): number =>
  e.entries.reduce((n, x) => n + x.count, 0);

/**
 * The experience the party earns.
 *
 * **RAW, always.** V1's warning, kept: any multiplier a table applies is for
 * estimating how dangerous a fight will be and is never earned — getting that
 * backwards roughly doubles a party's progression over a campaign.
 */
export const rawXp = (e: Encounter): number =>
  e.entries.reduce((n, x) => n + xpForCr(x.cr) * x.count, 0);

/**
 * The SRD's experience-by-challenge table.
 *
 * In the rules themselves rather than the Dungeon Master's Guide, which is why
 * it can live here. The difficulty BANDS are DMG content and do not — see
 * `rules/5e/non-srd.ts`, the one file that would have to go before this could
 * be shared, and the reason totals are shown without a band.
 */
const XP_BY_CR: Readonly<Record<string, number>> = {
  "0": 10, "0.125": 25, "0.25": 50, "0.5": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900,
  "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000,
  "14": 11500, "15": 13000, "16": 15000, "17": 18000, "18": 20000, "19": 22000,
  "20": 25000, "21": 33000, "22": 41000, "23": 50000, "24": 62000,
  "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000,
};

/** Unknown challenge ratings are worth nothing rather than a guess. */
export const xpForCr = (cr: number): number => XP_BY_CR[String(cr)] ?? 0;

/**
 * The acts that put one on the table.
 *
 * A kept encounter becomes staged creatures — N of a statblock are N rows,
 * never one row with a count, because a count cannot say that one of them is
 * nearly down. Fresh: nothing carries over from the last time it ran.
 */
export function staging(e: Encounter, id: (n: number) => string) {
  const out: { statblock: string; name: string; max: number; ac: number; disclosure: Disclosure }[] = [];
  let n = 0;
  for (const entry of e.entries) {
    for (let i = 0; i < entry.count; i++) {
      out.push({
        statblock: entry.statblock, name: entry.name,
        max: entry.max, ac: entry.ac, disclosure: entry.disclosure,
      });
      n++;
    }
  }
  return out.map((x, i) => ({ ...x, id: id(i) }));
}

import { fold } from "../../core/fold";
import type { Room } from "../../rules/5e/terrain";
import type { Band } from "../../rules/5e/encounter";
import type { Event } from "../../core/types";
import type { Act, Combatant, Disclosure } from "./fight";

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

/**
 * What kind of scene this is.
 *
 * A prepared encounter is not always a fight — the mockup's own list has a
 * "Prison Cells / Social · Exploration" row with no creatures in it, and a DM
 * who can only prepare combat has to keep the other two thirds of the night
 * somewhere else.
 */
export const ENCOUNTER_KINDS = ["combat", "social", "exploration"] as const;
export type EncounterKind = (typeof ENCOUNTER_KINDS)[number];

export type Encounter = {
  readonly id: string;
  readonly name: string;
  /** Where it happens, in the DM's own words. "Forest Road". */
  readonly place: string;
  readonly entries: readonly Entry[];
  readonly kind?: EncounterKind;
  /**
   * What the room is like when this one starts.
   *
   * On the encounter and not only on the place, because the mockup puts
   * Environment in the encounter editor and because it is true: the same
   * cellar is a different fight in the dark. `openActs` prefers this over the
   * place's when it has been set — see the precedence note there.
   */
  readonly room?: Room;
  /** What the party is trying to do. "Survive the ambush." */
  readonly objective?: string;
  /** What the DM tells themselves about it, in a line. */
  readonly summary?: string;
  /** What it is worth, in the DM's own words rather than a coin model. */
  readonly rewards?: string;
  /** Anything else. "Yazuk retreats when reduced below half." */
  readonly notes?: string;
  /**
   * The DM disagreeing with the gauge.
   *
   * `rules/5e/encounter.ts` computes a band from the party's own levels, and
   * it is right about the arithmetic and blind to everything else: a party at
   * half hit points, reinforcements two rooms away, a bridge that collapses.
   * So the computed band is what shows unless this is set, and this is never
   * written by the app. Advice, not enforcement — the same shape as
   * `Recommended.tsx`.
   */
  readonly difficulty?: Band;
};

/** A fresh encounter, before anything has been added to it. */
export const blankEncounter = (id: string): Encounter => ({ id, name: "", place: "", entries: [] });

/** Ready enough to keep — the same bar `scene.ts` and `session.ts` hold their own drafts to. */
export const isNamed = (e: Encounter): boolean => e.name.trim().length > 0;

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
 * Building one from nothing — the arithmetic the builder leans on so it
 * never touches `entries` directly.
 *
 * Three goblins added one at a time are one group with count 3, not three
 * groups of one: `addEntry` merges by statblock, because a DM tapping the
 * same result twice means "another of those", not "a second identical row".
 */
export function addEntry(e: Encounter, entry: Entry): Encounter {
  const existing = e.entries.find((x) => x.statblock === entry.statblock);
  return {
    ...e,
    entries: existing
      ? e.entries.map((x) => x.statblock === entry.statblock ? { ...x, count: x.count + entry.count } : x)
      : [...e.entries, entry],
  };
}

/** Zero is "remove it" rather than a group that sits there reading 0. */
export function setCount(e: Encounter, statblock: string, count: number): Encounter {
  return { ...e, entries: e.entries
    .map((x) => x.statblock === statblock ? { ...x, count } : x)
    .filter((x) => x.count > 0) };
}

/** Per-group, same as a staged creature's — see `fight.ts`'s `disclose` act. */
export function setDisclosure(e: Encounter, statblock: string, disclosure: Disclosure): Encounter {
  return { ...e, entries: e.entries.map((x) => x.statblock === statblock ? { ...x, disclosure } : x) };
}

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

/**
 * The acts that put an encounter's creatures on the table — and nothing else.
 *
 * Split out of `openActs` because Arturo's distinction turns on exactly this
 * list: *"an Encounter should be something the DM prepped for. A Creature
 * Group can be an on-the-fly cluster for an impromptu battle or addition to an
 * established encounter."*
 *
 * The two are not different records. They are the same entries with a
 * different **verb**: an encounter REPLACES what is on the table (`openActs`
 * clears first and sets the room), a group JOINS it (`joinActs` does neither).
 * Modelling a second stored kind would have been a record nobody asked to
 * save — a group is over when the fight is.
 *
 * V1 reached the same place from the other side and called it `joinCombat`.
 */
export const joinActs = (
  entries: readonly Entry[], id: (n: number) => string,
): readonly Act[] =>
  staging({ ...blankEncounter("join"), entries }, id).map((row) => ({
    act: "stage", id: row.id, name: row.name, disclosure: row.disclosure,
    source: { kind: "creature", statblock: row.statblock, max: row.max, ac: row.ac },
  }));

/**
 * What is on the table now, as something worth keeping.
 *
 * The DM has already assembled it; asking them to build the same thing again
 * in a second form would be asking twice for the same thing. Null when there
 * is nothing but characters out there — a saved encounter of the party is not
 * an encounter.
 *
 * Named for what is IN it rather than for how many: "2 creatures" told the DM
 * nothing they could not already see, and repeated the line underneath it.
 */
export function keepFrom(
  combatants: readonly Combatant[],
  id: string,
): Encounter | null {
  const entries: Entry[] = [];
  for (const c of combatants) {
    if (c.source.kind !== "creature") continue;
    entries.push({
      statblock: c.source.statblock,
      /* The fight numbers duplicates — "Goblin 2" — and an encounter counts
         them instead, so the suffix comes back off. */
      name: c.name.replace(/ \d+$/, ""),
      count: 1,
      max: c.source.max, ac: c.source.ac, cr: c.source.cr ?? 0,
      disclosure: c.disclosure,
    });
  }
  if (entries.length === 0) return null;
  const kinds = [...new Set(entries.map((x) => x.name))];
  const name = kinds.length === 1
    ? `${kinds[0]!}${entries.length > 1 ? ` \u00d7${String(entries.length)}` : ""}`
    : `${kinds[0]!} and ${String(kinds.length - 1)} more`;
  return { id, name, place: "", entries };
}

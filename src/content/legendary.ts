/**
 * What a big creature does between everybody else's turns.
 *
 * V1's module, ported whole, and its reason for existing is DM.md principle 6:
 * legendary actions are the most-forgotten thing on a statblock. Three a
 * round, spent after somebody ELSE's turn, back at the start of the creature's
 * own — a DM running a dragon holds all of that while also holding the
 * fiction, and the usual outcome is that the dragon never uses them at all.
 * **702 of the 6,633 creatures in this compendium have them.**
 *
 * A lair action is the same shape one layer out: it belongs to the PLACE, it
 * fires on initiative count 20, and it is not any creature's turn — which is
 * why it lives on the fight rather than on a combatant. 160 creatures have one.
 *
 * All of it is read out of the statblock's own words, which are near
 * boilerplate. The block mixes the actions themselves with pages of lair
 * description and regional effects, so most of the work here is telling those
 * apart: an Adult Black Dragon lists ELEVEN entries under `legendary`, of
 * which three are things it can do.
 */

/** One line of a statblock: a name and the words under it. */
export type Entry = { readonly name: string; readonly desc?: string };

export type Option = {
  readonly name: string;
  readonly desc: string;
  /** Most cost one. "(Costs 2 Actions)" is printed on the ones that do not. */
  readonly cost: number;
};

/*
 * The entry that states the budget rather than being a thing to do. Some books
 * put it in the heading — "Legendary Actions (3/Turn)" — and some put the whole
 * sentence in the text: "The dragon can take 3 legendary actions". Either way
 * it is a header, and offering it as something to tap would spend a legendary
 * action on reading the rules.
 */
function budgetIn(a: Entry): number | null {
  const m = /(\d+)\s*\/\s*turn/i.exec(a.name)
    ?? /(\d+)\s*(?:legendary\s*)?actions?\s*per\s*turn/i.exec(a.name)
    ?? /can take (\d+) legendary actions?/i.exec(a.name)
    ?? /can take (\d+) legendary actions?/i.exec(a.desc ?? "");
  return m === null ? null : Number(m[1]);
}

/**
 * How many it gets each round.
 *
 * Three is the common case — 493 of the 702 — but 42 get two, 55 get four, and
 * one gets seven, so it is read and never assumed.
 *
 * **When a block has real options and states no budget at all, it is three.**
 * 41 creatures are printed that way, and returning zero for them means a
 * Vampire Warlock with three legendary actions listed can never take one:
 * `mayTake` refuses everything at a budget of zero. V1 returns zero here and
 * those creatures are quietly inert. A creature with nothing to do still gets
 * zero, which is what stops a vehicle inheriting a budget.
 */
export function budget(entries: readonly Entry[] | undefined): number {
  for (const a of entries ?? []) {
    const n = budgetIn(a);
    if (n !== null) return n;
  }
  return options(entries).length > 0 ? 3 : 0;
}

/*
 * Prose about the lair or the region rather than things the creature can do.
 * The compendium files these under `legendary` beside the real options, and a
 * DM tapping "Black Dragon Treasures" expecting a tail attack is the app
 * wasting their turn.
 */
const NOT_AN_ACTION = /lair|regional|treasure|^legendary actions?\b|^additional\b/i;

/*
 * A vehicle's `legendary` block holds the SHIP, not its legendary actions: a
 * Battle Balloon lists "Hull", "Control: Helm" and "Control: Balloon", each
 * opening with its own armour class and hit points. Two creatures in the
 * corpus are printed this way and they put ten components into the DM's list
 * of things to tap. A component is not a thing the creature does.
 */
const isComponent = (a: Entry): boolean => /^\s*armor class:/i.test(a.desc ?? "");

/** The things it can actually do, with what each costs. */
export function options(entries: readonly Entry[] | undefined): readonly Option[] {
  const out: Option[] = [];
  for (const a of entries ?? []) {
    if (NOT_AN_ACTION.test(a.name)) continue;
    if (isComponent(a)) continue;
    if (budgetIn(a) !== null) continue;
    /* "(Costs 2 Actions)" is the common printing; some books write just
       "(3 Actions)". Both mean the same, and a missed one is a dragon getting
       three tail attacks for the price of one. */
    const costs = /costs?\s+(\d+)\s+actions?/i.exec(a.name)
      ?? /\((\d+)\s+actions?\)/i.exec(a.name);
    out.push({
      name: a.name
        .replace(/\s*\(costs?\s+\d+\s+actions?\)\s*/i, "")
        .replace(/\s*\(\d+\s+actions?\)\s*/i, "")
        .trim(),
      desc: a.desc ?? "",
      cost: costs === null ? 1 : Number(costs[1]),
    });
  }
  return out;
}

/**
 * What the lair does, if anything.
 *
 * "On initiative count 20 (losing initiative ties), the dragon takes a lair
 * action" — the count is READ rather than assumed, because a handful of
 * creatures use a different one and a hardcoded 20 would be quietly wrong for
 * exactly those.
 */
export type Lair = { readonly at: number; readonly text: string };

export function lair(entries: readonly Entry[] | undefined): Lair | null {
  const entry = (entries ?? []).find((a) => /^lair actions?$/i.test(a.name.trim()));
  if (entry?.desc === undefined || entry.desc === "") return null;
  const at = /initiative count (\d+)/i.exec(entry.desc);
  return { at: at === null ? 20 : Number(at[1]), text: entry.desc };
}

/**
 * Whether this creature may take one right now.
 *
 * Not on its own turn. That is the rule people get wrong in the other
 * direction, and it matters: a dragon that legendary-acts on its own turn is
 * taking four actions instead of one.
 */
export function mayTake({ budget: has, spent = 0, isTheirTurn, cost = 1 }: {
  budget: number;
  /** Spent this ROUND: they come back at the start of the creature's turn, and
      between those two moments the count only goes down. */
  spent?: number;
  isTheirTurn: boolean;
  cost?: number;
}): boolean {
  if (has === 0 || isTheirTurn) return false;
  return Math.max(0, has - spent) >= cost;
}

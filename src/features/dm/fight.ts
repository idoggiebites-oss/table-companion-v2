import { fold } from "../../core/fold";
import type { Event } from "../../core/types";

export const FIGHT = "fight.act";

/**
 * How much of a creature the players are shown.
 *
 * An ORDERED ladder, not a set of options, because the DM slides it up as a
 * fight develops: a hobgoblin is *hidden* while it is behind a door, *present*
 * once it steps out, *vague* once somebody has hit it, and *exact* when the
 * DM decides the mystery has stopped being fun. A dropdown would hide that
 * order, which is the thing the control is for (DM.md principle 2).
 *
 * It is a field on the combatant and set per creature, never a mode for the
 * whole table: the dragon can be a rumour while the goblins are an open book.
 */
export const DISCLOSURE = ["hidden", "present", "vague", "exact"] as const;
export type Disclosure = (typeof DISCLOSURE)[number];

/** Where a combatant's hit points live, which differs by what it is. */
export type Source =
  /** A character. Hit points are in the log, on their own sheet. */
  | { readonly kind: "character"; readonly character: string }
  /** Anything the DM runs. Hit points live in the fight itself. */
  | { readonly kind: "creature"; readonly statblock: string; readonly max: number; readonly ac: number };

export type Combatant = {
  readonly id: string;
  readonly name: string;
  /**
   * Null until it is rolled, and never zero for "not yet".
   *
   * "Has not rolled" and "rolled badly" are different facts, and knowing who
   * the table is still waiting on is the whole reason a fight has a staging
   * phase rather than starting the moment somebody says roll.
   */
  readonly initiative: number | null;
  readonly source: Source;
  readonly disclosure: Disclosure;
  /** Damage taken. Only creatures carry it; a character's is on their sheet. */
  readonly damage: number;
};

export type Fight = {
  /** A fight exists before it runs. */
  readonly phase: "staging" | "rolling" | "active";
  readonly round: number;
  readonly combatants: readonly Combatant[];
};

export const NO_FIGHT: Fight = { phase: "staging", round: 0, combatants: [] };

/** What the DM does to a fight while assembling it. */
export type Act =
  | { readonly act: "stage"; readonly id: string; readonly name: string;
      readonly source: Source; readonly disclosure?: Disclosure }
  | { readonly act: "unstage"; readonly id: string }
  | { readonly act: "disclose"; readonly id: string; readonly to: Disclosure }
  | { readonly act: "clear" };

const asAct = (e: Event): Act | null =>
  e.kind === FIGHT ? (e.data as unknown as Act) : null;

/**
 * A creature staged twice is two creatures.
 *
 * Three goblins are three rows with their own hit points, not one row with a
 * count — the moment one of them is bloodied and another is not, a count
 * cannot say so, and "goblin 2 is nearly down" is a thing a DM says out loud.
 * Numbering is by how many of that statblock are already on the table, so the
 * first is plain and the rest are numbered.
 */
export function nameFor(name: string, existing: readonly Combatant[], statblock: string): string {
  const n = existing.filter((c) => c.source.kind === "creature" && c.source.statblock === statblock).length;
  return n === 0 ? name : `${name} ${String(n + 1)}`;
}

function reduce(f: Fight, e: Event): Fight {
  const a = asAct(e);
  if (a === null) return f;
  switch (a.act) {
    case "stage":
      return { ...f, combatants: [...f.combatants, {
        id: a.id,
        name: nameFor(a.name, f.combatants, a.source.kind === "creature" ? a.source.statblock : a.id),
        initiative: null,
        source: a.source,
        /* Hidden by default, and deliberately: a creature that appears on
           every player's screen the instant the DM stages it has spoiled the
           encounter before it starts. Staging is preparation, not narration. */
        disclosure: a.disclosure ?? "hidden",
        damage: 0,
      }] };
    case "unstage":
      return { ...f, combatants: f.combatants.filter((c) => c.id !== a.id) };
    case "disclose":
      return { ...f, combatants: f.combatants.map((c) => c.id === a.id ? { ...c, disclosure: a.to } : c) };
    case "clear":
      return NO_FIGHT;
  }
}

export const fightFrom = (events: readonly Event[]): Fight => fold(events, reduce, NO_FIGHT);

/** Whether a seat may be shown this combatant at all. */
export const visibleTo = (dm: boolean, c: Combatant): boolean => dm || c.disclosure !== "hidden";

/** What a seat is allowed to know about a combatant's health. */
export const showsNumbers = (dm: boolean, c: Combatant): boolean => dm || c.disclosure === "exact";

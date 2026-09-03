import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import { healthStep, VAGUE } from "../../rules/5e/vitals";
import type { Claim } from "./claim";

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
  | {
      readonly kind: "creature"; readonly statblock: string;
      readonly max: number; readonly ac: number;
      /* Challenge rating, already a number: 0.125 rather than "1/8". Carried
         because an encounter kept from what is staged has no other way to know
         it, and without it every kept encounter is worth 10 XP a head — the
         arithmetic this exists to do, wrong quietly. Optional so a fight
         staged before this existed still replays. */
      readonly cr?: number;
    };

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
  /**
   * What is on it, by condition id.
   *
   * A creature's conditions live in the fight for the same reason its hit
   * points do — nothing else holds a creature. A CHARACTER's live on their
   * sheet, so this stays empty for them and `conditionsOf` reads the sheet
   * instead. One number, one home, is the rule the party screen depends on.
   */
  readonly conditions: readonly string[];
};

export type Fight = {
  /** A fight exists before it runs. */
  readonly phase: "staging" | "rolling" | "active";
  readonly round: number;
  /**
   * Whose go it is, as a position in the DERIVED order — not a stored order.
   *
   * The turn is real information and has to be kept; the order is not, because
   * it is a function of the initiative values every device already has. V1
   * stored both and had to re-anchor the pointer whenever the roster changed.
   */
  readonly turn: number;
  readonly combatants: readonly Combatant[];
  /** Unanswered swings, oldest first. */
  readonly claims: readonly Claim[];
};

export const NO_FIGHT: Fight = { phase: "staging", round: 0, turn: 0, combatants: [], claims: [] };

/** What the DM does to a fight while assembling it. */
export type Act =
  | { readonly act: "stage"; readonly id: string; readonly name: string;
      readonly source: Source; readonly disclosure?: Disclosure }
  | { readonly act: "unstage"; readonly id: string }
  | { readonly act: "disclose"; readonly id: string; readonly to: Disclosure }
  | { readonly act: "roll"; readonly id: string; readonly value: number }
  /**
   * Damage, or healing when `amount` is negative.
   *
   * One act rather than two, which is V1's shape: at a table "heal it four"
   * and "hit it four" are the same gesture with the sign flipped, and a second
   * act would need the same clamping written twice.
   */
  | { readonly act: "hurt"; readonly id: string; readonly amount: number }
  /** On or off. Idempotent, because two devices may say the same thing. */
  | { readonly act: "condition"; readonly id: string; readonly condition: string; readonly on: boolean }
  | { readonly act: "claim"; readonly claim: Claim }
  /**
   * The DM's answer. `lands` is theirs, not the app's — the suggestion is
   * offered and can always be overruled, because a shield spell or a cover
   * rule this app has never heard of is still true at the table.
   */
  | { readonly act: "verdict"; readonly claim: string; readonly lands: boolean }
  | { readonly act: "begin" }
  /**
   * `from` is the turn the presser could see. Without it a DM and a player
   * both ending the same turn advance it twice and somebody's go vanishes —
   * and in a log-shaped app the two events are both perfectly valid, so
   * nothing else would catch it.
   */
  | { readonly act: "advance"; readonly from: number }
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
        conditions: [],
      }] };
    case "unstage":
      return { ...f, combatants: f.combatants.filter((c) => c.id !== a.id) };
    case "disclose":
      return { ...f, combatants: f.combatants.map((c) => c.id === a.id ? { ...c, disclosure: a.to } : c) };
    case "roll":
      return {
        ...f,
        /* Rolling is its own moment at the table — the DM says "roll for
           initiative" and then waits. Leaving it in `staging` would make
           `awaiting` meaningless, which is the thing the phase is for. */
        phase: f.phase === "staging" ? "rolling" : f.phase,
        combatants: f.combatants.map((c) => c.id === a.id ? { ...c, initiative: a.value } : c),
      };
    case "hurt":
      return { ...f, combatants: f.combatants.map((c) => {
        if (c.id !== a.id) return c;
        /* A character's hit points are not the fight's to hold — they are in
           the log, on their own sheet (V1's `Source` union). Ignoring it here
           is what stops the party screen and the fight ever disagreeing:
           there is only ever one of the number. */
        if (c.source.kind !== "creature") return c;
        /* Clamped both ends. The ceiling is V1's, and so is its reason: a
           ghoul patched up twice reads 30/22, which is not a state the game
           has. The floor is the same rule from the other side — a creature is
           at zero or it is not, and 5e gives it no dying to be in. */
        return { ...c, damage: Math.min(c.source.max, Math.max(0, c.damage + a.amount)) };
      }) };
    case "condition":
      return { ...f, combatants: f.combatants.map((c) => {
        if (c.id !== a.id) return c;
        /* Same rule as `hurt`: a character's conditions are on their sheet,
           and a second copy here would be a second source of truth for the
           one thing the party screen and the sheet must agree about. */
        if (c.source.kind !== "creature") return c;
        const has = c.conditions.includes(a.condition);
        if (a.on === has) return c; // idempotent: two devices may say it at once
        return { ...c, conditions: a.on
          ? [...c.conditions, a.condition]
          : c.conditions.filter((x) => x !== a.condition) };
      }) };
    case "claim":
      /* Idempotent by id: a flaky socket may deliver the same swing twice. */
      return f.claims.some((c) => c.id === a.claim.id)
        ? f
        : { ...f, claims: [...f.claims, a.claim] };
    case "verdict": {
      const claim = f.claims.find((c) => c.id === a.claim);
      if (claim === undefined) return f; // already answered, or never arrived
      const rest = f.claims.filter((c) => c.id !== a.claim);
      if (!a.lands) return { ...f, claims: rest };
      return { ...f, claims: rest, combatants: f.combatants.map((c) => {
        if (c.id !== claim.targetId || c.source.kind !== "creature") return c;
        return { ...c, damage: Math.min(c.source.max, Math.max(0, c.damage + claim.damage)) };
      }) };
    }
    case "begin":
      /* Anyone who never rolled is dropped rather than placed arbitrarily.
         V1's reason, kept: a fight that starts with somebody at a made-up
         position is worse than one that starts without them, and they can be
         staged again. */
      return { ...f, phase: "active", round: 1, turn: 0,
        combatants: f.combatants.filter((c) => c.initiative !== null) };
    case "advance": {
      if (f.phase !== "active") return f;
      if (f.combatants.length === 0) return f;
      if (a.from !== f.turn) return f; // a turn already ended by somebody else
      const next = f.turn + 1;
      return next >= f.combatants.length
        ? { ...f, turn: 0, round: f.round + 1 }
        : { ...f, turn: next };
    }
    case "clear":
      return NO_FIGHT;
  }
}

/**
 * Higher initiative first; anyone who has not rolled last; ties by the order
 * the DM staged them.
 *
 * Ported from V1's `sortOrder`, including its reason: the tie-break consults
 * only the staged order, so the same fight resolves the same way on every
 * device. A sort that reached for anything device-local would desynchronise
 * the table.
 *
 * Not-yet-rolled sorts LAST rather than as a zero, so a half-rolled order
 * still reads correctly while the table waits.
 */
export function orderOf(f: Fight): readonly Combatant[] {
  return f.combatants
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ai = a.c.initiative;
      const bi = b.c.initiative;
      if (ai === null && bi === null) return a.i - b.i;
      if (ai === null) return 1;
      if (bi === null) return -1;
      return bi - ai || a.i - b.i;
    })
    .map(({ c }) => c);
}

/** Who the table is still waiting on. */
export const awaiting = (f: Fight): readonly Combatant[] =>
  f.combatants.filter((c) => c.initiative === null);

/** Whose go it is, or null before the fight runs. */
export function activeOf(f: Fight): Combatant | null {
  if (f.phase !== "active") return null;
  return orderOf(f)[f.turn] ?? null;
}

export const fightFrom = (events: readonly Event[]): Fight => fold(events, reduce, NO_FIGHT);

/** A creature's hit points, or null for a character — theirs are on their sheet. */
export function hpOf(c: Combatant): { hp: number; max: number } | null {
  if (c.source.kind !== "creature") return null;
  return { hp: c.source.max - c.damage, max: c.source.max };
}

/**
 * What a seat may be told about a creature's health, by its rung.
 *
 * A player asking "how hurt is that ogre" gets a WORD, never a number, until
 * the DM decides the mystery has stopped being fun — `healthStep` and `VAGUE`
 * already exist in `rules/5e/vitals.ts` for exactly that, and are the same
 * words the party screen uses, so the two sides of the table cannot end up
 * describing the same creature differently.
 */
export type HealthShown =
  | { readonly kind: "none" }
  | { readonly kind: "word"; readonly word: string }
  | { readonly kind: "numbers"; readonly hp: number; readonly max: number };

export function healthShown(dm: boolean, c: Combatant): HealthShown {
  const at = hpOf(c);
  if (at === null) return { kind: "none" };
  if (showsNumbers(dm, c)) return { kind: "numbers", hp: at.hp, max: at.max };
  if (c.disclosure === "vague") return { kind: "word", word: VAGUE[healthStep(at.hp, at.max)] };
  return { kind: "none" };
}

/** Whether a seat may be shown this combatant at all. */
export const visibleTo = (dm: boolean, c: Combatant): boolean => dm || c.disclosure !== "hidden";

/** What a seat is allowed to know about a combatant's health. */
export const showsNumbers = (dm: boolean, c: Combatant): boolean => dm || c.disclosure === "exact";

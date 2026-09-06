import type { Event } from "../../core/types";
import { fold } from "../../core/fold";
import {
  maxHitPoints, hitDice, applyDamage, applyHealing, applyTemp,
  EMPTY_DEATHS, clampExhaustion, type Health, type Deaths,
} from "../../rules/5e/vitals";
import type { Build } from "../creation/model";
import type { Attack } from "../../rules/5e/attack";
import { scoresOf } from "../creation/scores";

export const VITAL = "sheet.vital";

/** Everything true about a character between turns. */
export type Vitals = {
  readonly health: Health;
  readonly deaths: Deaths;
  readonly conditions: readonly string[];
  readonly exhaustion: number;
  readonly inspiration: boolean;
  readonly concentrating: string | null;
  /** Hit dice already spent, by die size. */
  readonly spent: Readonly<Record<number, number>>;
  /**
   * Spell slots already spent, by spell level.
   *
   * Held apart from the pact below because they are not the same pool and do
   * not come back at the same time — V1's third finding, and the one that
   * makes a warlock a warlock: pact slots return on a SHORT rest.
   */
  readonly slots: Readonly<Record<number, number>>;
  /** Pact slots spent. A warlock's, and nobody else's. */
  readonly pact: number;
  /**
   * What this character swings, keyed by name.
   *
   * Stored as what it IS — ability, proficiency, dice — never as the final
   * bonus. V1's reason, and it is the whole point: entering "+7" leaves a
   * number that silently stays +7 after the level-up that should have made
   * it +8. The bonus is derived at read time, every time.
   */
  readonly attacks: readonly Attack[];
};

export type Vital =
  | { readonly act: "damage"; readonly n: number }
  | { readonly act: "heal"; readonly n: number }
  | { readonly act: "temp"; readonly n: number }
  | { readonly act: "hitdie"; readonly die: number; readonly rolled: number }
  | { readonly act: "rest"; readonly length: "short" | "long" }
  /**
   * A spell cast, at the level the slot was spent at.
   *
   * The LEVEL rather than the spell: upcasting is the whole reason a slot and
   * a spell are different things, and a fireball thrown from a fifth-level
   * slot spends a fifth-level slot.
   */
  | { readonly act: "cast"; readonly level: number; readonly pact?: boolean }
  | { readonly act: "condition"; readonly id: string; readonly on: boolean }
  | { readonly act: "death"; readonly result: "success" | "failure" | "clear" }
  | { readonly act: "exhaustion"; readonly n: number }
  | { readonly act: "inspiration"; readonly on: boolean }
  | { readonly act: "concentrate"; readonly spell: string | null }
  /** Adds, or replaces one of the same name — a character has one Longsword. */
  | { readonly act: "attack"; readonly attack: Attack }
  | { readonly act: "unattack"; readonly name: string };

export function startingVitals(build: Build): Vitals {
  const con = scoresOf(build).con;
  const max = maxHitPoints(build.classes, con, build.hp);
  return {
    health: { hp: max, max, temp: 0, dying: false, dead: false },
    deaths: EMPTY_DEATHS,
    conditions: [],
    attacks: [],
    exhaustion: 0,
    inspiration: false,
    concentrating: null,
    spent: {},
    slots: {},
    pact: 0,
  };
}

const withDeath = (v: Vitals, fails: number): Vitals =>
  fails === 0 ? v : { ...v, deaths: { ...v.deaths, failures: Math.min(3, v.deaths.failures + fails) } };

/**
 * How many spent hit dice a long rest gives back, and which ones.
 *
 * The rule is "up to half your TOTAL, minimum one" — a budget against the
 * whole pool. V2 halved what had been SPENT instead, which is a different
 * sum and quietly wrong for every character who had not spent them all: ten
 * hit dice, three spent, should come back to none spent and came back to one.
 * It only agreed with the rule at the extremes, which is why it survived.
 *
 * V1 avoided the question by keeping hit dice as a single pool sized to total
 * level. V2 splits them by die size — which is the better shape, because a
 * multiclass character rolls a d10 or a d6 and needs to know which are left —
 * so the budget has to be spent somewhere. **Largest die first**, since that
 * is what a player choosing for themselves would take and the rules leave the
 * choice to them.
 */
function afterLongRest(
  spent: Readonly<Record<number, number>>, build: Build,
): Record<number, number> {
  const pools = hitDice(build.classes);
  const total = pools.reduce((n, p) => n + p.count, 0);
  let budget = Math.max(1, Math.floor(total / 2));
  const out: Record<number, number> = { ...spent };
  /* `hitDice` already sorts by die size descending. */
  for (const { die } of pools) {
    if (budget <= 0) break;
    const was = out[die] ?? 0;
    const back = Math.min(was, budget);
    out[die] = was - back;
    budget -= back;
  }
  return out;
}

export function reduceVitals(v: Vitals, e: Event, build: Build): Vitals {
  if (e.kind !== VITAL) return v;
  const a = e.data as unknown as Vital;
  switch (a.act) {
    case "attack":
      return { ...v, attacks: [
        ...v.attacks.filter((x) => x.name !== a.attack.name), a.attack,
      ] };
    case "unattack":
      return { ...v, attacks: v.attacks.filter((x) => x.name !== a.name) };
    case "damage": {
      const { health, deathFails } = applyDamage(v.health, a.n);
      // Damage breaks concentration unless the save is made; the DM confirms
      // that, so the app drops it and says so rather than deciding.
      return withDeath({ ...v, health, concentrating: health.hp === 0 ? null : v.concentrating }, deathFails);
    }
    case "heal": {
      const health = applyHealing(v.health, a.n);
      return { ...v, health, deaths: health.hp > 0 ? EMPTY_DEATHS : v.deaths };
    }
    case "temp": return { ...v, health: applyTemp(v.health, a.n) };
    case "hitdie": {
      const spent = { ...v.spent, [a.die]: (v.spent[a.die] ?? 0) + 1 };
      return { ...v, spent, health: applyHealing(v.health, a.rolled) };
    }
    case "cast":
      return a.pact === true
        ? { ...v, pact: v.pact + 1 }
        : { ...v, slots: { ...v.slots, [a.level]: (v.slots[a.level] ?? 0) + 1 } };
    case "rest": {
      /* A short rest gives a warlock everything back and everybody else
         nothing — the one asymmetry that makes pact magic worth having. */
      if (a.length === "short") return v.pact === 0 ? v : { ...v, pact: 0 };
      // A long rest: all hit points, half the hit dice back, one exhaustion
      // shed, and death saves forgotten.
      return {
        ...v,
        health: { ...v.health, hp: v.health.max, temp: 0, dying: false },
        deaths: EMPTY_DEATHS,
        exhaustion: clampExhaustion(v.exhaustion - 1),
        spent: afterLongRest(v.spent, build),
        /* Every slot, and the pact with them. Unlike hit dice, which come back
           by halves, spell slots are all or nothing. */
        slots: {},
        pact: 0,
      };
    }
    case "condition":
      return {
        ...v,
        conditions: a.on
          ? v.conditions.includes(a.id) ? v.conditions : [...v.conditions, a.id]
          : v.conditions.filter((c) => c !== a.id),
      };
    case "death":
      if (a.result === "clear") return { ...v, deaths: EMPTY_DEATHS };
      return {
        ...v,
        deaths: a.result === "success"
          ? { ...v.deaths, successes: Math.min(3, v.deaths.successes + 1) }
          : { ...v.deaths, failures: Math.min(3, v.deaths.failures + 1) },
      };
    case "exhaustion": return { ...v, exhaustion: clampExhaustion(a.n) };
    case "inspiration": return { ...v, inspiration: a.on };
    case "concentrate": return { ...v, concentrating: a.spell };
  }
}

/** This character's vitals, folded from the log over the build it started from. */
export function vitalsFrom(events: readonly Event[], character: string, build: Build): Vitals {
  const mine = events.filter((e) => e.kind !== VITAL || e.data["character"] === character);
  return fold(mine, (v, e) => reduceVitals(v, e, build), startingVitals(build));
}

/** Hit dice left, by die. */
export function diceLeft(build: Build, v: Vitals): { die: number; left: number; total: number }[] {
  return hitDice(build.classes).map(({ die, count }) => ({
    die, total: count, left: count - (v.spent[die] ?? 0),
  }));
}

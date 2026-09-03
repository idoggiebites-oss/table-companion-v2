import type { Event } from "../../core/types";
import { fold } from "../../core/fold";
import {
  maxHitPoints, hitDice, applyDamage, applyHealing, applyTemp,
  EMPTY_DEATHS, clampExhaustion, type Health, type Deaths,
} from "../../rules/5e/vitals";
import type { Build } from "../creation/model";
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
};

export type Vital =
  | { readonly act: "damage"; readonly n: number }
  | { readonly act: "heal"; readonly n: number }
  | { readonly act: "temp"; readonly n: number }
  | { readonly act: "hitdie"; readonly die: number; readonly rolled: number }
  | { readonly act: "rest"; readonly length: "short" | "long" }
  | { readonly act: "condition"; readonly id: string; readonly on: boolean }
  | { readonly act: "death"; readonly result: "success" | "failure" | "clear" }
  | { readonly act: "exhaustion"; readonly n: number }
  | { readonly act: "inspiration"; readonly on: boolean }
  | { readonly act: "concentrate"; readonly spell: string | null };

export function startingVitals(build: Build): Vitals {
  const con = scoresOf(build).con;
  const max = maxHitPoints(build.classes, con, build.hp);
  return {
    health: { hp: max, max, temp: 0, dying: false, dead: false },
    deaths: EMPTY_DEATHS,
    conditions: [],
    exhaustion: 0,
    inspiration: false,
    concentrating: null,
    spent: {},
  };
}

const withDeath = (v: Vitals, fails: number): Vitals =>
  fails === 0 ? v : { ...v, deaths: { ...v.deaths, failures: Math.min(3, v.deaths.failures + fails) } };

export function reduceVitals(v: Vitals, e: Event): Vitals {
  if (e.kind !== VITAL) return v;
  const a = e.data as unknown as Vital;
  switch (a.act) {
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
    case "rest": {
      if (a.length === "short") return v;
      // A long rest: all hit points, half the hit dice back, one exhaustion
      // shed, and death saves forgotten.
      const spent: Record<number, number> = {};
      for (const [die, n] of Object.entries(v.spent)) spent[Number(die)] = Math.floor(n / 2);
      return {
        ...v,
        health: { ...v.health, hp: v.health.max, temp: 0, dying: false },
        deaths: EMPTY_DEATHS,
        exhaustion: clampExhaustion(v.exhaustion - 1),
        spent,
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
  return fold(mine, reduceVitals, startingVitals(build));
}

/** Hit dice left, by die. */
export function diceLeft(build: Build, v: Vitals): { die: number; left: number; total: number }[] {
  return hitDice(build.classes).map(({ die, count }) => ({
    die, total: count, left: count - (v.spent[die] ?? 0),
  }));
}

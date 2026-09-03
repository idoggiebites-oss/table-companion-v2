import { rulesFor } from "./classes";
import { modifier } from "./abilities";

/**
 * Hit points, hit dice, death saves and exhaustion.
 *
 * The app never rolls. Where the rules call for a die, this holds the number a
 * person threw and does the arithmetic around it.
 */

export type ClassLevel = { readonly id: string; readonly level: number };

/**
 * Maximum hit points.
 *
 * The first level of the FIRST class takes the whole die; every level after
 * takes what was thrown for it, or the average rounded up when nobody threw.
 * A multiclass character's later class levels are average too — the full die
 * is a property of first level, not of a class, which is the part that is easy
 * to get wrong when the classes are a list.
 *
 * Constitution applies to EVERY level, not only the first, which is the
 * arithmetic people most often shortcut.
 *
 * `rolls` are the levels after the first, in the order they were taken. They
 * were being recorded into the log and then thrown away here, so a player who
 * threw a 10 on a d10 was quietly given the average 6.
 */
export function maxHitPoints(
  classes: readonly ClassLevel[],
  con: number,
  rolls: readonly number[] = [],
): number {
  const conMod = modifier(con);
  let total = 0;
  let taken = 0;
  for (const c of classes) {
    const die = rulesFor(c.id).hitDie;
    const average = Math.floor(die / 2) + 1;
    for (let i = 0; i < c.level; i++) {
      // A roll is trusted only within the die it was thrown on.
      const thrown = rolls[taken - 1];
      const gained = taken === 0
        ? die
        : thrown !== undefined && thrown >= 1 && thrown <= die ? thrown : average;
      total += gained + conMod;
      taken++;
    }
  }
  // A character never has fewer than one hit point per level from this.
  return Math.max(taken, total);
}

/** Hit dice, kept per class, because a fighter's d10 is not a wizard's d6. */
export function hitDice(classes: readonly ClassLevel[]): { die: number; count: number }[] {
  const by = new Map<number, number>();
  for (const c of classes) {
    const die = rulesFor(c.id).hitDie;
    by.set(die, (by.get(die) ?? 0) + c.level);
  }
  return [...by.entries()].sort((a, b) => b[0] - a[0]).map(([die, count]) => ({ die, count }));
}

export type Health = {
  /** Current hit points. Never above max, never below zero. */
  readonly hp: number;
  readonly max: number;
  /** Temporary hit points do not stack and are not healing. */
  readonly temp: number;
  readonly dying: boolean;
  readonly dead: boolean;
};

export const BLOODIED = (h: Health): boolean => h.hp > 0 && h.hp <= Math.floor(h.max / 2);

/**
 * How hurt somebody looks, in four steps.
 *
 * The DM side needs this and the sheet does not: a DM looking at six party
 * members wants to see who is in trouble without reading six fractions, and a
 * player asking "how hurt is that ogre" gets a WORD, never a number and never
 * a bar they can read a number off. DM.md: vague is a word, not a meter.
 *
 * The steps are V1's, and the boundaries matter — "bloodied" is the game's own
 * word for half, so `injured` has to stop there rather than at some rounder
 * fraction.
 */
export type HealthStep = "unharmed" | "injured" | "bloodied" | "near";

export function healthStep(hp: number, max: number): HealthStep {
  if (max <= 0) return "near";
  const part = hp / max;
  if (part >= 1) return "unharmed";
  if (part > 0.5) return "injured";
  if (part > 0.25) return "bloodied";
  return "near";
}

/** The word a player is allowed to hear when numbers are not revealed. */
export const VAGUE: Record<HealthStep, string> = {
  unharmed: "Unharmed",
  injured: "Injured",
  bloodied: "Bloodied",
  near: "Near death",
};

/**
 * Damage falls on temporary hit points first, and they are not healed back.
 * At zero a character is dying rather than dead; damage taken while dying is
 * a failed death save, and damage equal to the maximum is death outright.
 */
export function applyDamage(h: Health, amount: number): { health: Health; deathFails: number } {
  const n = Math.max(0, amount);
  const fromTemp = Math.min(h.temp, n);
  const rest = n - fromTemp;
  const hp = h.hp - rest;

  if (h.hp === 0) return { health: { ...h, temp: h.temp - fromTemp }, deathFails: n > 0 ? 1 : 0 };
  if (hp <= -h.max) return { health: { ...h, hp: 0, temp: 0, dying: false, dead: true }, deathFails: 0 };
  if (hp <= 0) return { health: { ...h, hp: 0, temp: h.temp - fromTemp, dying: true }, deathFails: 0 };
  return { health: { ...h, hp, temp: h.temp - fromTemp }, deathFails: 0 };
}

/** Healing above zero ends dying. It never exceeds the maximum. */
export function applyHealing(h: Health, amount: number): Health {
  if (h.dead) return h;
  const hp = Math.min(h.max, h.hp + Math.max(0, amount));
  return { ...h, hp, dying: hp > 0 ? false : h.dying };
}

/** Temporary hit points replace rather than add. The larger pool wins. */
export const applyTemp = (h: Health, amount: number): Health => ({ ...h, temp: Math.max(h.temp, Math.max(0, amount)) });

export type Deaths = { readonly successes: number; readonly failures: number };
export const EMPTY_DEATHS: Deaths = { successes: 0, failures: 0 };
export const stable = (d: Deaths): boolean => d.successes >= 3;
export const died = (d: Deaths): boolean => d.failures >= 3;

/** Exhaustion runs one to six. Six is death. */
export const EXHAUSTION_MAX = 6;
export const clampExhaustion = (n: number): number => Math.min(EXHAUSTION_MAX, Math.max(0, n));

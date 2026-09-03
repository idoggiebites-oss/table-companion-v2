import { describe, it, expect } from "vitest";
import {
  maxHitPoints, hitDice, applyDamage, applyHealing, applyTemp,
  BLOODIED, stable, died, clampExhaustion, EMPTY_DEATHS, type Health,
} from "./vitals";

const health = (over: Partial<Health> = {}): Health =>
  ({ hp: 10, max: 10, temp: 0, dying: false, dead: false, ...over });

describe("hit points", () => {
  it("gives the whole die at first level and the average after", () => {
    // Fighter 1 with CON 14: d10 + 2 = 12.
    expect(maxHitPoints([{ id: "fighter", level: 1 }], 14)).toBe(12);
    // Fighter 3: 12 + (6+2) + (6+2) = 28.
    expect(maxHitPoints([{ id: "fighter", level: 3 }], 14)).toBe(28);
  });

  it("gives the full die only once, however the classes are split", () => {
    // The full die belongs to FIRST LEVEL, not to each class. A fighter 1 /
    // wizard 1 is d10 + avg(d6), not d10 + d6.
    const split = maxHitPoints([{ id: "fighter", level: 1 }, { id: "wizard", level: 1 }], 14);
    expect(split).toBe(12 + (4 + 2));
    expect(split).toBeLessThan(12 + (6 + 2));
  });

  it("gives a wizard less than a barbarian at the same level", () => {
    expect(maxHitPoints([{ id: "wizard", level: 5 }], 10))
      .toBeLessThan(maxHitPoints([{ id: "barbarian", level: 5 }], 10));
  });

  it("never drops below one hit point per level, whatever the constitution", () => {
    expect(maxHitPoints([{ id: "wizard", level: 4 }], 1)).toBeGreaterThanOrEqual(4);
  });

  it("keeps hit dice apart by class, because a d10 is not a d6", () => {
    expect(hitDice([{ id: "fighter", level: 5 }, { id: "wizard", level: 2 }]))
      .toEqual([{ die: 10, count: 5 }, { die: 6, count: 2 }]);
  });
});

describe("damage and healing", () => {
  it("spends temporary hit points first, and does not heal them back", () => {
    const { health: h } = applyDamage(health({ temp: 5 }), 3);
    expect(h.temp).toBe(2);
    expect(h.hp).toBe(10);
    expect(applyHealing(h, 5).temp).toBe(2);
  });

  it("does not stack temporary hit points — the larger pool wins", () => {
    expect(applyTemp(health({ temp: 5 }), 3).temp).toBe(5);
    expect(applyTemp(health({ temp: 5 }), 8).temp).toBe(8);
  });

  it("stops at zero and starts dying rather than going negative", () => {
    const { health: h } = applyDamage(health({ hp: 4 }), 9);
    expect(h.hp).toBe(0);
    expect(h.dying).toBe(true);
    expect(h.dead).toBe(false);
  });

  it("kills outright when the overflow reaches the maximum", () => {
    const { health: h } = applyDamage(health({ hp: 4 }), 15);
    expect(h.dead).toBe(true);
    expect(h.dying).toBe(false);
  });

  it("counts damage taken while dying as a failed death save", () => {
    const { health: h, deathFails } = applyDamage(health({ hp: 0, dying: true }), 3);
    expect(deathFails).toBe(1);
    expect(h.hp).toBe(0);
  });

  it("ends dying the moment a single point of healing lands", () => {
    const h = applyHealing(health({ hp: 0, dying: true }), 1);
    expect(h.hp).toBe(1);
    expect(h.dying).toBe(false);
  });

  it("never heals the dead", () => {
    expect(applyHealing(health({ hp: 0, dead: true }), 10).hp).toBe(0);
  });

  it("never heals above the maximum", () => {
    expect(applyHealing(health({ hp: 8 }), 99).hp).toBe(10);
  });

  it("is bloodied at half, and not at zero", () => {
    expect(BLOODIED(health({ hp: 5 }))).toBe(true);
    expect(BLOODIED(health({ hp: 6 }))).toBe(false);
    expect(BLOODIED(health({ hp: 0 }))).toBe(false);
  });
});

describe("death saves and exhaustion", () => {
  it("stabilises at three successes and dies at three failures", () => {
    expect(stable({ ...EMPTY_DEATHS, successes: 3 })).toBe(true);
    expect(died({ ...EMPTY_DEATHS, failures: 3 })).toBe(true);
    expect(stable(EMPTY_DEATHS)).toBe(false);
  });

  it("holds exhaustion between none and six", () => {
    expect(clampExhaustion(-1)).toBe(0);
    expect(clampExhaustion(7)).toBe(6);
  });
});

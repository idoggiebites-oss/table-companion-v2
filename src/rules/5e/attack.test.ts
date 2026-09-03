import { describe, it, expect } from "vitest";
import { attackFromWeapon, abilityFor, damageFormula, resolveAttack, attackLabel } from "./attack";
import type { Scores } from "./abilities";

const scores = (o: Partial<Scores>): Scores => ({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o });

const longsword = { name: "Longsword", range: "Melee" as const, damage: "1d8 slashing", properties: [] };
const rapier = { name: "Rapier", range: "Melee" as const, damage: "1d8 piercing", properties: ["finesse"] };
const shortbow = { name: "Shortbow", range: "Ranged" as const, damage: "1d6 piercing", properties: ["ammunition"] };
const blowgun = { name: "Blowgun", range: "Ranged" as const, damage: "1 piercing", properties: [] };

describe("reading a weapon out of the compendium", () => {
  it("swings a plain melee weapon on Strength", () => {
    expect(attackFromWeapon(longsword, true).ability).toBe("str");
  });

  it("swings a ranged weapon on Dexterity", () => {
    expect(attackFromWeapon(shortbow, true).ability).toBe("dex");
  });

  it("leaves a finesse weapon undecided, because it is the BETTER of two", () => {
    /* The reason `properties` had to start being compiled: without it a rapier
       reads from Strength, which is wrong for the most ordinary character in
       the game. */
    expect(attackFromWeapon(rapier, true).ability).toBe("finesse");
  });

  it("splits the damage string into dice and a type", () => {
    const a = attackFromWeapon(longsword, true);
    expect(a.damage.count).toBe(1);
    expect(a.damage.die).toBe(8);
    expect(a.damageType).toBe("slashing");
  });

  it("survives a weapon with no die at all", () => {
    /* A blowgun deals "1 piercing" — one point, no die. */
    const a = attackFromWeapon(blowgun, true);
    expect(a.damage.count).toBe(1);
    expect(a.damageType).toBe("piercing");
  });
});

describe("finesse takes whichever is better, and can change", () => {
  const a = attackFromWeapon(rapier, true);
  it("uses Dexterity for the duellist", () => {
    expect(abilityFor(a, scores({ str: 10, dex: 18 }))).toBe("dex");
  });
  it("uses Strength when Strength is higher", () => {
    expect(abilityFor(a, scores({ str: 18, dex: 10 }))).toBe("str");
  });
  it("prefers Dexterity on a tie, which is the usual reading", () => {
    expect(abilityFor(a, scores({ str: 14, dex: 14 }))).toBe("dex");
  });
});

describe("the bonus is derived, never stored", () => {
  it("adds ability, proficiency and any magic to the roll", () => {
    const a = { ...attackFromWeapon(longsword, true), bonus: 1 };
    /* +3 Strength, +2 proficiency, +1 weapon. */
    expect(resolveAttack(a, scores({ str: 16 }), 2).toHit).toBe(6);
  });

  it("leaves proficiency out when the character does not have it", () => {
    const a = attackFromWeapon(longsword, false);
    expect(resolveAttack(a, scores({ str: 16 }), 2).toHit).toBe(3);
  });

  it("moves with proficiency, which is the whole reason it is not stored", () => {
    const a = attackFromWeapon(longsword, true);
    expect(resolveAttack(a, scores({ str: 16 }), 2).toHit).toBe(5);
    expect(resolveAttack(a, scores({ str: 16 }), 4).toHit).toBe(7);
  });

  it("adds the ability to damage, and the magic bonus with it", () => {
    const a = { ...attackFromWeapon(longsword, true), bonus: 1 };
    expect(resolveAttack(a, scores({ str: 16 }), 2).damage).toBe("1d8+4");
  });

  it("adds NO ability to an off-hand attack's damage", () => {
    const a = { ...attackFromWeapon(longsword, true),
      damage: { count: 1, die: 8, addAbility: false } };
    expect(resolveAttack(a, scores({ str: 16 }), 2).damage).toBe("1d8");
  });

  it("never prints a bare +0", () => {
    expect(damageFormula(1, 8, 0)).toBe("1d8");
    expect(damageFormula(1, 6, -1)).toBe("1d6-1");
  });

  it("labels an attack the way a sheet prints it", () => {
    const a = attackFromWeapon(longsword, true);
    expect(attackLabel(resolveAttack(a, scores({ str: 16 }), 2))).toBe("Longsword +5");
  });
});

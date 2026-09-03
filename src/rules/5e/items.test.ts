import { describe, it, expect } from "vitest";
import {
  isWeapon, isShield, isArmour, hasProperty, bucketOf, itemFacts, weightOf, carryLimit,
  type Item, type Stack,
} from "./items";

const item = (o: Partial<Item> & { id: string; name: string; category: string }): Item => o as Item;

const longsword = item({ id: "longsword", name: "Longsword", category: "weapon",
  weaponRange: "Melee", weaponCategory: "Martial", damage: "1d8", damageType: "Slashing",
  twoHanded: "1d10", properties: ["versatile"], weight: 3 });

const shield = item({ id: "shield", name: "Shield", category: "armor",
  armorCategory: "Shield", baseAc: 2, weight: 6 });

const chainMail = item({ id: "chain-mail", name: "Chain Mail", category: "armor",
  armorCategory: "Heavy", baseAc: 16, stealthDisadvantage: true, weight: 55 });

const leather = item({ id: "leather", name: "Leather Armor", category: "armor",
  armorCategory: "Light", baseAc: 11, dexBonus: true, weight: 10 });

describe("weapon, armour, shield are read off category, never guessed", () => {
  it("a weapon is category weapon", () => {
    expect(isWeapon(longsword)).toBe(true);
    expect(isWeapon(shield)).toBe(false);
  });

  it("a shield is armor whose armorCategory says Shield", () => {
    expect(isShield(shield)).toBe(true);
    expect(isShield(chainMail)).toBe(false);
  });

  /* The rule this exists to enforce: a shield is not armour for the purpose
     of "what am I wearing", because it shares a slot with nothing else and a
     fighter with plate AND a shield is not wearing two suits of armour. */
  it("armour is category armor MINUS shields", () => {
    expect(isArmour(chainMail)).toBe(true);
    expect(isArmour(leather)).toBe(true);
    expect(isArmour(shield)).toBe(false);
  });

  it("hasProperty reads the properties list, absent means none", () => {
    expect(hasProperty(longsword, "versatile")).toBe(true);
    expect(hasProperty(longsword, "finesse")).toBe(false);
    expect(hasProperty(shield, "versatile")).toBe(false); // no properties field at all
  });
});

describe("which tab a thing sorts under", () => {
  it("a weapon is weapons, an armor-category item is armor", () => {
    expect(bucketOf(longsword)).toBe("weapons");
    expect(bucketOf(chainMail)).toBe("armor");
    expect(bucketOf(shield)).toBe("armor");
  });

  it("reads consumables off the name — the compendium has no such category", () => {
    expect(bucketOf(item({ id: "p1", name: "Potion of Healing", category: "adventuring-gear" }))).toBe("consumables");
    expect(bucketOf(item({ id: "s1", name: "Scroll of Fireball", category: "adventuring-gear" }))).toBe("consumables");
  });

  /* The comment's own example: the catalogue names ammunition in the plural,
     "Arrows (20)", never the singular "Arrow". A singular-only pattern finds
     none of it. */
  it("matches the plural the catalogue actually uses", () => {
    expect(bucketOf(item({ id: "a1", name: "Arrows (20)", category: "adventuring-gear" }))).toBe("consumables");
    expect(bucketOf(item({ id: "a2", name: "Alchemist's Fire", category: "adventuring-gear" }))).toBe("consumables");
  });

  it("anything unrecognised is gear — a rope and a tarnished key both belong there", () => {
    expect(bucketOf(item({ id: "r1", name: "Hempen Rope (50 feet)", category: "adventuring-gear" }))).toBe("gear");
    expect(bucketOf(item({ id: "k1", name: "a tarnished key", category: "adventuring-gear" }))).toBe("gear");
  });
});

describe("what a character can carry", () => {
  it("Strength times fifteen, the rule as written — not enforced, just read", () => {
    expect(carryLimit(10)).toBe(150);
    expect(carryLimit(18)).toBe(270);
  });

  it("sums quantity times weight, looking each stack up in the catalogue", () => {
    const stacks: Stack[] = [{ itemId: "longsword", name: "Longsword", qty: 1 },
      { itemId: "leather", name: "Leather Armor", qty: 2 }];
    const of = (id: string) => ({ longsword, leather }[id as "longsword" | "leather"]);
    expect(weightOf(stacks, of)).toBe(3 + 10 * 2);
  });

  it("an unresolvable stack — the DM's tarnished key — weighs nothing rather than throwing", () => {
    const stacks: Stack[] = [{ itemId: "said:a-tarnished-key", name: "a tarnished key", qty: 1 }];
    expect(weightOf(stacks, () => undefined)).toBe(0);
  });
});

describe("everything the app knows about a thing, in lines — there is no prose", () => {
  it("is just the category when nothing else applies", () => {
    expect(itemFacts(item({ id: "r1", name: "Rope", category: "adventuring-gear" }))).toEqual(["adventuring-gear"]);
  });

  it("adds the detail unless it is 'common' — the unmarked, unremarkable case", () => {
    const common = item({ id: "p1", name: "Potion of Healing", category: "adventuring-gear", detail: "common" });
    const rare = item({ id: "w1", name: "Wand of Magic Missiles", category: "wand", detail: "rare" });
    expect(itemFacts(common)).toEqual(["adventuring-gear"]);
    expect(itemFacts(rare)).toEqual(["wand · rare"]);
  });

  it("states damage, and only adds the two-handed die when the weapon has one", () => {
    const dagger = item({ id: "dagger", name: "Dagger", category: "weapon",
      weaponRange: "Melee", weaponCategory: "Simple", damage: "1d4", damageType: "Piercing" });
    expect(itemFacts(dagger)).toEqual(["weapon", "1d4 piercing", "Simple melee weapon"]);
    expect(itemFacts(longsword)).toEqual([
      "weapon", "1d8 slashing, or 1d10 in two hands", "Martial melee weapon", "versatile", "3 lb",
    ]);
  });

  it("falls back to the word 'damage' when a damage type is missing", () => {
    const mystery = item({ id: "m1", name: "Mystery Blade", category: "weapon", damage: "1d6" });
    expect(itemFacts(mystery)[0 + 1]).toBe("1d6 damage");
  });

  it("gives a shield a + line, and armour a flat AC that may add dexterity", () => {
    expect(itemFacts(shield)).toEqual(["armor", "+2 to armour class", "6 lb"]);
    expect(itemFacts(leather)).toEqual(["armor", "armour class 11 + dexterity", "10 lb"]);
    expect(itemFacts(chainMail)).toEqual([
      "armor", "armour class 16", "disadvantage on Stealth", "55 lb",
    ]);
  });

  it("omits the weight line for something the file gives no weight — not '0 lb'", () => {
    expect(itemFacts(item({ id: "s1", name: "Spellbook", category: "adventuring-gear" }))).toEqual(["adventuring-gear"]);
  });
});

describe("a ranged weapon says how far it reaches", () => {
  /* V1 prints this and V2 had dropped it: the `Item` type had no `range` and
     the compiled INDEX omitted the field, though `detail` kept it. So every
     ranged weapon's card said "martial ranged weapon" and never 150/600 —
     the one number that decides whether the shot is possible. Found by
     auditing this module against V1 rather than by testing what it did. */
  const longbow = {
    id: "longbow", name: "Longbow", category: "weapon",
    damage: "1d8", damageType: "piercing",
    weaponCategory: "Martial" as const, weaponRange: "Ranged" as const,
    range: { normal: 150, long: 600 },
  };

  it("prints both distances", () => {
    expect(itemFacts(longbow)).toContain("range 150/600 ft");
  });

  it("prints one when there is no long range", () => {
    expect(itemFacts({ ...longbow, range: { normal: 20 } })).toContain("range 20 ft");
  });

  it("says nothing when the weapon has no range at all", () => {
    /* Omitted, not set to undefined: `exactOptionalPropertyTypes` is on, and
       an absent field and a present-but-undefined one are different things. */
    const { range: _dropped, ...sword } = { ...longbow, weaponRange: "Melee" as const };
    void _dropped;
    expect(itemFacts(sword).some((f) => f.startsWith("range"))).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { slotFor, figureOf, displacedBy, usesBothHands, rarityOf, rarityStep, SLOTS } from "./slots";
import { bucketOf, itemFacts, weightOf, carryLimit, type Item } from "./items";

const item = (over: Partial<Item> & { id: string; name: string }): Item =>
  ({ category: "adventuring-gear", ...over });

const RAPIER = item({ id: "rapier", name: "Rapier", category: "weapon", damage: "1d8", damageType: "Piercing", weaponCategory: "Martial", weaponRange: "Melee", properties: ["finesse"], weight: 2 });
const DAGGER = item({ id: "dagger", name: "Dagger", category: "weapon", damage: "1d4", damageType: "Piercing", properties: ["finesse", "light"], weight: 1 });
const GREATSWORD = item({ id: "greatsword", name: "Greatsword", category: "weapon", damage: "2d6", properties: ["heavy", "two-handed"], weight: 6 });
const SHIELD = item({ id: "shield", name: "Shield", category: "armor", armorCategory: "Shield", baseAc: 2, weight: 6 });
const LEATHER = item({ id: "studded-leather", name: "Studded Leather Armor", category: "armor", armorCategory: "Light", baseAc: 12, dexBonus: true, weight: 13 });
const CLOAK = item({ id: "cloak-of-elvenkind", name: "Cloak of Elvenkind", magic: true, detail: "uncommon (requires attunement)" });
const BOOTS = item({ id: "boots-of-elvenkind", name: "Boots of Elvenkind", magic: true, detail: "uncommon" });
const RING = item({ id: "silver-ring", name: "Silver Ring" });
const ROPE = item({ id: "rope", name: "Rope, Hempen (50 feet)", weight: 10 });

describe("where a thing goes", () => {
  it("puts a shield in the off hand and armour on the body", () => {
    expect(slotFor(SHIELD)).toBe("off");
    expect(slotFor(LEATHER)).toBe("armor");
  });

  /* The second sword lands in the other hand rather than replacing the first. */
  it("fills the main hand first, then the other", () => {
    expect(slotFor(RAPIER)).toBe("main");
    expect(slotFor(DAGGER, new Set(["main"]))).toBe("off");
    expect(slotFor(DAGGER, new Set(["main", "off"]))).toBeNull();
  });

  /* The catalogue says nothing about where a thing sits on a body — a Cloak
     of Protection is "adventuring-gear" like a coil of rope. */
  it("reads the three worn places off the name, because nothing else says", () => {
    expect(slotFor(CLOAK)).toBe("cloak");
    expect(slotFor(BOOTS)).toBe("boots");
    expect(slotFor(RING)).toBe("trinket");
  });

  it("admits when a thing fits none of the six", () => {
    expect(slotFor(ROPE)).toBeNull();
  });

  it("draws exactly the six the figure has room for", () => {
    expect(SLOTS.map((s) => s.id)).toEqual(["main", "off", "armor", "cloak", "boots", "trinket"]);
  });
});

describe("the figure, filled in", () => {
  it("places each thing where it belongs", () => {
    const f = figureOf([RAPIER, DAGGER, LEATHER, CLOAK, BOOTS, RING]);
    expect(f.slots.main?.name).toBe("Rapier");
    expect(f.slots.off?.name).toBe("Dagger");
    expect(f.slots.armor?.name).toBe("Studded Leather Armor");
    expect(f.slots.trinket?.name).toBe("Silver Ring");
    expect(f.elsewhere).toEqual([]);
  });

  /* Naming it beats forcing it into a slot it does not belong in. */
  it("names what will not fit rather than inventing a place for it", () => {
    const f = figureOf([RAPIER, DAGGER, GREATSWORD, ROPE]);
    expect(f.elsewhere.map((i) => i.name)).toEqual(["Greatsword", "Rope, Hempen (50 feet)"]);
  });

  it("gives the first-equipped the main hand", () => {
    expect(figureOf([DAGGER, RAPIER]).slots.main?.name).toBe("Dagger");
  });
});

describe("what has to come off for this to go on", () => {
  /*
   * A greatsword and a shield is not a thing, and the app allowed it and
   * quietly handed out the armour class for it.
   */
  it("empties both hands for a two-handed weapon", () => {
    expect(usesBothHands(GREATSWORD)).toBe(true);
    expect(displacedBy(GREATSWORD, [RAPIER, SHIELD]).map((i) => i.id).sort())
      .toEqual(["rapier", "shield"]);
  });

  it("drops a two-handed weapon when a shield goes on", () => {
    expect(displacedBy(SHIELD, [GREATSWORD]).map((i) => i.id)).toEqual(["greatsword"]);
  });

  /* One hand each is fine: a rapier and a dagger displace nothing. */
  it("leaves one-handed things alone", () => {
    expect(displacedBy(DAGGER, [RAPIER])).toEqual([]);
  });

  it("swaps what is already in a worn slot", () => {
    const other = item({ id: "chain-mail", name: "Chain Mail", category: "armor", armorCategory: "Heavy", baseAc: 16 });
    expect(displacedBy(other, [LEATHER]).map((i) => i.id)).toEqual(["studded-leather"]);
  });
});

describe("rarity, as a rim rather than a fill", () => {
  it("reads the word the catalogue used", () => {
    expect(rarityOf(CLOAK)).toBe("uncommon");
    expect(rarityOf(item({ id: "x", name: "X", detail: "very rare" }))).toBe("very rare");
  });

  /* "very rare" contains "rare", so the longest wins. */
  it("does not read 'very rare' as 'rare'", () => {
    expect(rarityOf(item({ id: "x", name: "X", detail: "very rare (requires attunement)" })))
      .toBe("very rare");
  });

  it("gives ordinary kit no rim at all", () => {
    expect(rarityOf(RAPIER)).toBeNull();
    expect(rarityStep(RAPIER)).toBe(0);
    expect(rarityStep(CLOAK)).toBe(1);
  });
});

describe("which tab a thing is under", () => {
  it("sorts by what the catalogue says where it can", () => {
    expect(bucketOf(RAPIER)).toBe("weapons");
    expect(bucketOf(SHIELD)).toBe("armor");
    expect(bucketOf(LEATHER)).toBe("armor");
    expect(bucketOf(ROPE)).toBe("gear");
  });

  /* The compendium has no "consumable" category — potions and arrows are
     both "adventuring-gear" — so the name is the only signal there is. */
  it("reads a consumable off its name, which is all there is", () => {
    expect(bucketOf(item({ id: "p", name: "Potion of Healing" }))).toBe("consumables");
    expect(bucketOf(item({ id: "a", name: "Arrows (20)" }))).toBe("consumables");
    expect(bucketOf(CLOAK)).toBe("gear");
  });
});

describe("what it all weighs", () => {
  const of = (id: string) => [RAPIER, DAGGER, LEATHER, ROPE].find((i) => i.id === id);

  it("counts the quantity, not just the thing", () => {
    expect(weightOf([{ itemId: "dagger", name: "Dagger", qty: 4 }], of)).toBe(4);
    expect(weightOf([{ itemId: "rapier", name: "Rapier", qty: 1 },
                     { itemId: "studded-leather", name: "Studded Leather Armor", qty: 1 }], of)).toBe(15);
  });

  /* A thing the catalogue has never heard of weighs nothing rather than
     breaking the sum. */
  it("counts an unknown thing as weightless rather than failing", () => {
    expect(weightOf([{ itemId: "tarnished-key", name: "A tarnished key", qty: 1 }], of)).toBe(0);
  });

  it("says what a character can carry, which is Strength times fifteen", () => {
    expect(carryLimit(8)).toBe(120);
    expect(carryLimit(20)).toBe(300);
  });
});

describe("what the app knows about a thing", () => {
  /* Not one of the 10,760 items carries a description, so this is assembled
     from the fields rather than quoted. */
  it("assembles the facts, because there is no prose to quote", () => {
    const facts = itemFacts(RAPIER);
    expect(facts).toContain("1d8 piercing");
    expect(facts).toContain("Martial melee weapon");
    expect(facts).toContain("finesse");
    expect(facts).toContain("2 lb");
  });

  it("says what armour does, and what it costs", () => {
    expect(itemFacts(SHIELD)).toContain("+2 to armour class");
    expect(itemFacts(LEATHER)).toContain("armour class 12 + dexterity");
  });
});

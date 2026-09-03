import { describe, it, expect } from "vitest";
import { armourIn, wornFrom, isBarding, isArmourRow, kindOf, type Armour } from "./armour";

const a = (id: string, name: string, kind: Armour["kind"], ac: number, maxDex?: number): Armour =>
  ({ id, name, kind, ac, ...(maxDex === undefined ? {} : { maxDex }) });

const TABLE: Armour[] = [
  a("leather-armor", "Leather Armor", "light", 11),
  a("studded-leather-armor", "Studded Leather Armor", "light", 12),
  a("scale-mail", "Scale Mail", "medium", 14, 2),
  a("chain-mail", "Chain Mail", "heavy", 16),
  a("chain-shirt", "Chain Shirt", "medium", 13, 2),
  a("shield", "Shield", "shield", 2),
];

describe("finding armour in a line of prose", () => {
  it("finds a suit named on its own", () => {
    expect(armourIn("chain mail", TABLE).map((x) => x.id)).toEqual(["chain-mail"]);
  });

  it("finds a suit buried in a longer line", () => {
    expect(armourIn("leather armor, longbow, and arrows (20)", TABLE).map((x) => x.id))
      .toEqual(["leather-armor"]);
  });

  /*
   * The reason names are tried longest first. Short-first, "studded leather
   * armor" matches "leather armor" — the rogue is dressed in the wrong suit,
   * and the leftover "studded" leaves the real one to match as well.
   */
  it("prefers the longer name when one contains another", () => {
    expect(armourIn("studded leather armor", TABLE).map((x) => x.id))
      .toEqual(["studded-leather-armor"]);
  });

  it("does not confuse two suits that share a word", () => {
    expect(armourIn("chain mail", TABLE).map((x) => x.id)).toEqual(["chain-mail"]);
    expect(armourIn("a chain shirt", TABLE).map((x) => x.id)).toEqual(["chain-shirt"]);
  });

  it("finds a shield among other things", () => {
    expect(armourIn("A shield and a holy symbol", TABLE).map((x) => x.id)).toEqual(["shield"]);
  });

  it("matches whole words only", () => {
    // A shielding rod is not a shield.
    expect(armourIn("a shielding rod", TABLE)).toEqual([]);
  });

  it("finds nothing in a line that names none", () => {
    expect(armourIn("(a) a dungeoneer's pack or (b) an explorer's pack", TABLE)).toEqual([]);
    expect(armourIn("", TABLE)).toEqual([]);
  });

  it("reads across every line the character chose", () => {
    const lines = ["chain mail", "a martial weapon and a shield", "an explorer's pack"];
    expect(wornFrom(lines, TABLE).map((x) => x.id)).toEqual(["chain-mail", "shield"]);
  });
});

describe("what belongs in the table at all", () => {
  /* A quarter of the compendium's armour is for horses. */
  it("knows barding when it sees it", () => {
    expect(isBarding("Leather Barding")).toBe(true);
    expect(isBarding("Half Plate Barding")).toBe(true);
    expect(isBarding("Half Plate Armor")).toBe(false);
  });

  /* V1's rule: `category` says it is armour, `armorCategory` says which kind.
     Every one of the 1,347 armour rows carries both. */
  it("takes armour from the category the catalogue files it under", () => {
    expect(isArmourRow("armor")).toBe(true);
    expect(isArmourRow("weapon")).toBe(false);
    expect(isArmourRow("adventuring-gear")).toBe(false);
    expect(isArmourRow(undefined)).toBe(false);
  });

  it("reads the compendium's own category, and nothing else", () => {
    expect(kindOf("Heavy")).toBe("heavy");
    expect(kindOf("Shield")).toBe("shield");
    expect(kindOf("")).toBeNull();
    expect(kindOf("Wondrous")).toBeNull();
  });
});

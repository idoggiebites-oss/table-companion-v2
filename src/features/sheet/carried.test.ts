import { describe, it, expect } from "vitest";
import { findItem, readPhrase, merge, stacksOf, inBucket } from "./carried";
import { EMPTY } from "../creation/model";
import type { Item } from "../../rules/5e/items";

const CATALOGUE: Item[] = [
  { id: "dagger", name: "Dagger", category: "weapon", damage: "1d4", weight: 1 },
  { id: "rapier", name: "Rapier", category: "weapon", damage: "1d8", weight: 2 },
  { id: "leather-armor", name: "Leather Armor", category: "armor", armorCategory: "Light", baseAc: 11 },
  { id: "studded-leather-armor", name: "Studded Leather Armor", category: "armor", armorCategory: "Light", baseAc: 12 },
  { id: "chain-mail", name: "Chain Mail", category: "armor", armorCategory: "Heavy", baseAc: 16 },
  { id: "chain-mail-barding", name: "Barding: Chain Mail", category: "armor", armorCategory: "Heavy", baseAc: 16 },
  { id: "arrow", name: "Arrows", category: "adventuring-gear", weight: 0.05 },
  { id: "thieves-tools", name: "Thieves' Tools", category: "tools", weight: 1 },
];

describe("naming a thing the catalogue knows", () => {
  /* "chain mail" also substring-matches "barding: chain mail", and "leather
     armor" matches "studded leather armor" — the longer one would arm every
     fighter wrongly. */
  it("takes the exact name before any containing one", () => {
    expect(findItem("chain mail", CATALOGUE)?.id).toBe("chain-mail");
    expect(findItem("leather armor", CATALOGUE)?.id).toBe("leather-armor");
  });

  it("ignores punctuation and case", () => {
    expect(findItem("thieves tools", CATALOGUE)?.id).toBe("thieves-tools");
  });

  it("says nothing about a thing it has never heard of", () => {
    expect(findItem("a tarnished key", CATALOGUE)).toBeUndefined();
    expect(findItem("", CATALOGUE)).toBeUndefined();
  });
});

describe("reading a phrase into a stack", () => {
  it("counts a spelled number and a numeral alike", () => {
    expect(readPhrase("two daggers", CATALOGUE)).toEqual({ itemId: "dagger", name: "Dagger", qty: 2 });
    expect(readPhrase("10 daggers", CATALOGUE)?.qty).toBe(10);
  });

  /* A trailing "(20)" is a count, which is how the books write ammunition. */
  it("reads a trailing count in brackets", () => {
    expect(readPhrase("arrows (20)", CATALOGUE)).toEqual({ itemId: "arrow", name: "Arrows", qty: 20 });
  });

  it("drops the article and keeps the thing", () => {
    expect(readPhrase("a rapier", CATALOGUE)).toEqual({ itemId: "rapier", name: "Rapier", qty: 1 });
  });

  /*
   * V1's reason, and it still holds: "an arcane focus" is a real item the
   * list does not enumerate, and a wizard who ends up without one because a
   * parser shrugged is worse off than one holding something labelled in
   * plain words.
   */
  it("keeps what it cannot name, rather than dropping it", () => {
    const s = readPhrase("an arcane focus", CATALOGUE)!;
    expect(s.name).toBe("arcane focus");
    expect(s.itemId).toMatch(/^said:/);
    expect(s.qty).toBe(1);
  });
});

describe("what the character is carrying", () => {
  const build = { ...EMPTY, equipment: ["Leather armor, two daggers, and thieves' tools"], weapons: ["Rapier"] };

  it("reads every phrase in every line, and the weapons chosen after", () => {
    const s = stacksOf(build, CATALOGUE);
    expect(s.map((x) => `${String(x.qty)}× ${x.name}`).sort())
      .toEqual(["1× Leather Armor", "1× Rapier", "1× Thieves' Tools", "2× Dagger"]);
  });

  it("makes one stack of two rather than two stacks", () => {
    expect(merge([
      { itemId: "dagger", name: "Dagger", qty: 2 },
      { itemId: "dagger", name: "Dagger", qty: 1 },
    ])).toEqual([{ itemId: "dagger", name: "Dagger", qty: 3 }]);
  });

  it("includes what was picked up since", () => {
    const later = { ...build, stacks: [{ itemId: "arrow", name: "Arrows", qty: 20 }] };
    expect(stacksOf(later, CATALOGUE).some((s) => s.name === "Arrows")).toBe(true);
  });
});

describe("which tab a carried thing shows under", () => {
  const stacks = stacksOf(
    { ...EMPTY, equipment: ["Leather armor, two daggers, and thieves' tools, and a tarnished key"], weapons: [] },
    CATALOGUE,
  );

  it("sorts by what the catalogue says", () => {
    expect(inBucket(stacks, CATALOGUE, "weapons").map((s) => s.name)).toEqual(["Dagger"]);
    expect(inBucket(stacks, CATALOGUE, "armor").map((s) => s.name)).toEqual(["Leather Armor"]);
  });

  /* Something the catalogue never named is a thing in a bag. */
  it("puts what it cannot name under gear rather than losing it", () => {
    expect(inBucket(stacks, CATALOGUE, "gear").map((s) => s.name)).toContain("tarnished key");
  });
});

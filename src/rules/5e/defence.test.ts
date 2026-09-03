import { describe, it, expect } from "vitest";
import { unarmouredAC, initiative, savesFor } from "./defence";
import { BLANK, type Scores } from "./abilities";

const at = (dex: number): Scores => ({ ...BLANK, dex });

describe("what a character is worth before armour", () => {
  it("says the unarmoured number rather than assuming leather", () => {
    // The build carries equipment ids and nothing reads them yet. A sheet that
    // prints 16 because it guessed is worse than one that prints 12 and is
    // right about what it knows.
    expect(unarmouredAC(at(14))).toBe(12);
    expect(unarmouredAC(at(8))).toBe(9);
  });

  it("takes initiative straight from Dexterity", () => {
    expect(initiative(at(18))).toBe(4);
    expect(initiative(at(10))).toBe(0);
  });

  it("knows which two saves a class is trained in", () => {
    expect(savesFor("rogue")).toEqual(["dex", "int"]);
    expect(savesFor("wizard")).toEqual(["int", "wis"]);
    expect(savesFor("Blood Hunter")).toEqual([]);
    expect(savesFor(null)).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { nameMarks, isAxis, sourceMark, isCore } from "./marks";

/*
 * content.test.ts already runs isAxis/sourceMark/isCore against the shipped
 * corpus fixture as a population-level check ("the axis trap"). This file is
 * the unit-level one: it pins each of the three things a parenthetical can be
 * — a choice, a property, a publisher — separately, and the two axes V2 added
 * on top of V1 (a bare number, a category word) that V1's marks.ts does not
 * have at all.
 */

describe("every parenthetical in a name, in order", () => {
  it("finds none in a plain name", () => {
    expect(nameMarks("Fireball")).toEqual([]);
  });

  it("finds one", () => {
    expect(nameMarks("Acid Splash (Alt) (HB)")).toEqual(["Alt", "HB"]);
  });

  it("finds two, in the order they were written", () => {
    expect(nameMarks("Sunwing Crossbow Bolts (Rare) (20)")).toEqual(["Rare", "20"]);
  });

  it("is null-safe — a name is not guaranteed to exist by the time this runs", () => {
    expect(nameMarks(null as unknown as string)).toEqual([]);
    expect(nameMarks(undefined as unknown as string)).toEqual([]);
  });
});

describe("an axis is not a source", () => {
  it("an ability score, baked into a feat's name by the file itself", () => {
    expect(isAxis("Constitution")).toBe(true);
    expect(isAxis("strength")).toBe(true); // case-insensitive
  });

  it("a damage type, baked into a spell's name the same way", () => {
    expect(isAxis("Fire")).toBe(true);
  });

  it("a rarity — the one whose miss hides every magic item in the game", () => {
    expect(isAxis("Rare")).toBe(true);
    expect(isAxis("Very Rare")).toBe(true);
    expect(isAxis("legendary")).toBe(true);
  });

  /*
   * Not in V1's marks.ts at all. V2's comment measures the reason: of 1,533
   * items whose name carries a rarity, 49 also carry a second parenthetical,
   * and 12 of those are a bare quantity — "Sunwing Crossbow Bolts (Rare) (20)"
   * — which is not a publisher no matter how it reads.
   */
  it("a bare number — a quantity, never a publisher", () => {
    expect(isAxis("20")).toBe(true);
    expect(isAxis("1")).toBe(true);
  });

  it("a bare number is exact — 'Ryoko' is not secretly a number in disguise", () => {
    expect(isAxis("Ryoko")).toBe(false);
  });

  /* The other kind found in that same 49: "Hammerhead Ship (Uncommon)
     (Vehicle)" — a category, not a publisher. Also new relative to V1. */
  it("a category word attached to gear, not a publisher", () => {
    expect(isAxis("Vehicle")).toBe(true);
    expect(isAxis("Mount")).toBe(true);
    expect(isAxis("vessel")).toBe(true);
  });

  it("does not extend the category set past the three the item file actually uses", () => {
    expect(isAxis("Ryoko")).toBe(false);
    expect(isAxis("Matthew Mercer")).toBe(false);
    expect(isAxis("Grim Hollow")).toBe(false);
  });
});

describe("the first non-axis parenthetical is the source", () => {
  it("is null when every parenthetical is an axis", () => {
    expect(sourceMark("Resilient (Constitution)")).toBeNull();
    expect(sourceMark("Sunwing Crossbow Bolts (Rare) (20)")).toBeNull();
    expect(sourceMark("Hammerhead Ship (Uncommon) (Vehicle)")).toBeNull();
  });

  it("skips a leading axis to find the real publisher behind it", () => {
    // The 37-of-49 case: a rarity followed by who actually wrote the item.
    expect(sourceMark("Blade of Fire (Rare) (Ryoko)")).toBe("Ryoko");
  });

  it("is the only parenthetical when there is nothing else to skip", () => {
    expect(sourceMark("Acid Splash (HB)")).toBe("HB");
  });
});

describe("core means nothing in brackets but a choice", () => {
  it("a name with no parenthetical at all", () => {
    expect(isCore("Longsword")).toBe(true);
  });

  it("a name whose only bracket is a rarity, a quantity, or a category", () => {
    expect(isCore("Glamerweave (Common)")).toBe(true);
    expect(isCore("Sunwing Crossbow Bolts (Rare) (20)")).toBe(true);
    expect(isCore("Hammerhead Ship (Uncommon) (Vehicle)")).toBe(true);
  });

  it("a name carrying an actual publisher is not core, rarity or no", () => {
    expect(isCore("Blade of Fire (Rare) (Ryoko)")).toBe(false);
    expect(isCore("Acid Splash (Alt) (HB)")).toBe(false);
  });
});

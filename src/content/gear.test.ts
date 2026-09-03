import { describe, it, expect } from "vitest";
import { categoryOf, phrasesIn, categoriesIn } from "./gear";

describe("what an equipment phrase asks for", () => {
  /* 18 of 89 options across the thirteen classes name a category, so a
     fighter walked away carrying "a martial weapon" and no martial weapon. */
  it("reads a category as a decision, with its filter", () => {
    // The label is uniform: the article and any "any" come off.
    expect(categoryOf("any martial weapon"))
      .toEqual({ qty: 1, weapon: "Martial", label: "martial weapon" });
    expect(categoryOf("any simple melee weapon"))
      .toEqual({ qty: 1, weapon: "Simple", range: "Melee", label: "simple melee weapon" });
  });

  it("counts how many the line asks for", () => {
    expect(categoryOf("two martial weapons")?.qty).toBe(2);
    expect(categoryOf("a simple weapon")?.qty).toBe(1);
  });

  /*
   * Anchored on purpose. "a light crossbow and crossbow bolts (20)" names a
   * specific weapon, and reading it as a filter would ask a question the book
   * has already answered.
   */
  it("does not read a named weapon as a category", () => {
    expect(categoryOf("a light crossbow")).toBeNull();
    expect(categoryOf("chain mail")).toBeNull();
    expect(categoryOf("a dungeoneer's pack")).toBeNull();
    expect(categoryOf("")).toBeNull();
  });

  it("splits an option into the things it names", () => {
    expect(phrasesIn("a martial weapon and a shield")).toEqual(["a martial weapon", "a shield"]);
    expect(phrasesIn("leather armor, longbow, and arrows (20)"))
      .toEqual(["leather armor", "longbow", "arrows (20)"]);
  });

  it("finds the open decisions in a whole option", () => {
    expect(categoriesIn("a martial weapon and a shield").map((c) => c.label)).toEqual(["martial weapon"]);
    expect(categoriesIn("two martial weapons")).toHaveLength(1);
    expect(categoriesIn("a dungeoneer's pack")).toEqual([]);
  });
});

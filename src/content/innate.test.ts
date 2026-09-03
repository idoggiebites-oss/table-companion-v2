import { describe, it, expect } from "vitest";
import { innateFrom, innateAt, hasInnate, NO_INNATE } from "./innate";

const DROW = [{
  name: "Drow Magic",
  text: "You know the dancing lights cantrip. When you reach 3rd level, you can cast the faerie fire spell once per day. When you reach 5th level, you can also cast the darkness spell once per day.",
}];
const TIEFLING = [{
  name: "Infernal Legacy",
  text: "You know the thaumaturgy cantrip. Once you reach 3rd level, you can cast the hellish rebuke spell as a 2nd-level spell once per day.",
}];
const HIGH_ELF = [{
  name: "Cantrip",
  text: "You know one cantrip of your choice from the wizard spell list.",
}];

describe("spells an ancestry hands you", () => {
  /*
   * The trait was prose and the spell never reached the spell list, so a
   * tiefling arrived unable to cast the one thing tieflings are known for.
   */
  it("reads a cantrip known from the start", () => {
    expect(innateFrom(TIEFLING).spells[0]).toEqual({ name: "thaumaturgy", level: 1, from: "Infernal Legacy" });
  });

  /* This is the whole of racial progression: an ancestry does not stop
     mattering after level one. */
  it("reads the ones that arrive later, and at which level", () => {
    const s = innateFrom(DROW).spells;
    expect(s).toEqual([
      { name: "dancing lights", level: 1, from: "Drow Magic" },
      { name: "faerie fire", level: 3, from: "Drow Magic" },
      { name: "darkness", level: 5, from: "Drow Magic" },
    ]);
  });

  it("reads two grants written in one paragraph", () => {
    expect(innateFrom(DROW).spells.filter((s) => s.level > 1)).toHaveLength(2);
  });

  /* The app should ask, not pick. */
  it("reads a cantrip of your choice as a question, not a grant", () => {
    const c = innateFrom(HIGH_ELF);
    expect(c.spells).toEqual([]);
    expect(c.choices).toEqual([{ count: 1, list: "wizard", from: "Cantrip" }]);
  });

  it("keeps the trait's own spelling, for the spellbook to settle", () => {
    // "faerie fire" here, "Faerie Fire" in the file — only the spellbook knows.
    expect(innateFrom(DROW).spells[1]!.name).toBe("faerie fire");
  });

  it("finds nothing where an ancestry grants nothing", () => {
    expect(innateFrom([{ name: "Darkvision", text: "You can see in dim light." }])).toEqual(NO_INNATE);
    expect(innateFrom(undefined)).toEqual(NO_INNATE);
    expect(hasInnate(NO_INNATE)).toBe(false);
  });
});

describe("what they have YET", () => {
  it("withholds what has not arrived", () => {
    const c = innateFrom(DROW);
    expect(innateAt(c, 1).map((s) => s.name)).toEqual(["dancing lights"]);
    expect(innateAt(c, 3).map((s) => s.name)).toEqual(["dancing lights", "faerie fire"]);
    expect(innateAt(c, 5)).toHaveLength(3);
  });
});

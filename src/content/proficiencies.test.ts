import { describe, it, expect } from "vitest";
import {
  languagesFromTrait, toolsFromClass, resolveTool, kindsNamed, isMundaneTool, gather,
} from "./proficiencies";

describe("languages, read out of an ancestry's trait", () => {
  it("reads the shape 581 of 605 ancestries use", () => {
    expect(languagesFromTrait("You can speak, read, and write Common and Elvish."))
      .toEqual({ known: ["Common", "Elvish"], choose: 0 });
  });

  it("counts a choice the book offers on top", () => {
    expect(languagesFromTrait("You can speak, read, and write Common and one extra language of your choice."))
      .toEqual({ known: ["Common"], choose: 1 });
  });

  /*
   * 120 ancestries in a real compendium phrase it this way and no other, and
   * every one of them lost their choice until it was measured.
   */
  it("counts 'one other language', which is the phrasing 120 ancestries use", () => {
    const g = languagesFromTrait(
      "Your character can speak, read, and write Common and one other language that you and your DM agree is appropriate.",
    );
    expect(g).toEqual({ known: ["Common"], choose: 1 });
  });

  it("counts two of them", () => {
    expect(languagesFromTrait("You can speak, read, and write Common and two other languages.").choose).toBe(2);
  });

  /*
   * The count has to sit against the word. Written loosely it also claimed
   * "a unique language (Wassic) among other atsaad", which is not a choice.
   */
  it("does not read a stray 'other' later in the sentence as a choice", () => {
    expect(languagesFromTrait("You can speak Common and a unique language (Wassic) among other atsaad.").choose)
      .toBe(0);
  });

  it("cuts at the clause boundary, so a caveat does not become a language", () => {
    const g = languagesFromTrait(
      "You can speak, read, and write Common and Auran, but you can only speak using your Mimicry trait.",
    );
    expect(g.known).toEqual(["Common", "Auran"]);
  });

  it("keeps a language the rulebook never printed", () => {
    expect(languagesFromTrait("You can speak, read, and write Common and Bullywug.").known)
      .toContain("Bullywug");
  });

  it("hands back what it could not read rather than inventing nothing", () => {
    const g = languagesFromTrait("Your speech is the wind's, and only the wind answers.");
    expect(g.known).toEqual([]);
    expect(g.stated).toMatch(/wind/);
  });

  it("says nothing about a trait that is not there", () => {
    expect(languagesFromTrait("")).toEqual({ known: [], choose: 0 });
  });
});

describe("tools, read out of a class's line", () => {
  it("grants a named tool", () => {
    expect(toolsFromClass("Thieves' Tools")).toEqual({ known: ["Thieves' Tools"], choose: 0 });
  });

  it("gives nothing for none", () => {
    expect(toolsFromClass("None")).toEqual({ known: [], choose: 0 });
  });

  /*
   * The artificer. Read as one thing, the whole line matched "one", all three
   * became a single choice, and two granted proficiencies vanished.
   */
  it("reads a line that both grants and asks", () => {
    const g = toolsFromClass("thieves' tools, tinker's tools, one type of artisan's tools of your choice");
    expect(g.known).toEqual(["thieves' tools", "tinker's tools"]);
    expect(g.choose).toBe(1);
    expect(g.choiceOf).toBe("one type of artisan's tools of your choice");
  });

  /*
   * And the mistake in the generous direction: an "or" is one pick among
   * three, not three grants.
   */
  it("reads an 'or' as one pick, not as three grants", () => {
    const g = toolsFromClass("poisoner's kit, herbalism kit, or alchemist's supplies");
    expect(g.known).toEqual([]);
    expect(g.choose).toBe(1);
  });

  it("counts a counted choice", () => {
    expect(toolsFromClass("Three Musical Instrument of your choice").choose).toBe(3);
  });
});

describe("narrowing a pool to what was asked for", () => {
  it("names the family a phrase means", () => {
    expect(kindsNamed("one type of musical instrument")).toEqual(["instrument"]);
    expect(kindsNamed("one type of artisan's tools")).toEqual(["artisan tools"]);
    expect(kindsNamed("one type of gaming set")).toEqual(["gaming set"]);
  });

  /* A picker with nothing in it is worse than a long one. */
  it("names none for a phrase that narrows nothing", () => {
    expect(kindsNamed("one type of tool of your choice")).toEqual([]);
  });

  it("tells a tool from a magical object shaped like one", () => {
    expect(isMundaneTool("artisan tools")).toBe(true);
    expect(isMundaneTool("artisan tools, legendary (requires attunement)")).toBe(false);
    expect(isMundaneTool("wondrous item")).toBe(false);
  });
});

describe("matching prose to the thing it names", () => {
  const items = ["Disguise Kit", "Thieves' Tools", "Lute"];

  it("meets a background's spelling in the middle", () => {
    expect(resolveTool("Disguise kits", items)).toBe("Disguise Kit");
    expect(resolveTool("thieves' tools", items)).toBe("Thieves' Tools");
  });

  /* "Vehicles (land)" is a real proficiency and not an item. */
  it("keeps what it cannot match rather than dropping it", () => {
    expect(resolveTool("Vehicles (land)", items)).toBe("Vehicles (land)");
  });
});

describe("gathering what three sources gave", () => {
  it("keeps the first spelling and never repeats", () => {
    expect(gather(["Common", "Elvish"], ["common", "Dwarvish"], undefined))
      .toEqual(["Common", "Elvish", "Dwarvish"]);
  });
});

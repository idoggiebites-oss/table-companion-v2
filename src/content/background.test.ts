import { describe, it, expect } from "vitest";
import { grantsOf, describeGrants, picksIn } from "./background";

const traits = (text: string) => [{ name: "Background", text }];

const ACOLYTE = traits(
  "• Skill Proficiencies: Insight, Religion\n• Languages: Two of your choice\n• Equipment: A holy symbol",
);
const CRIMINAL = traits(
  "• Skill Proficiencies: Deception, Stealth\n• Tool Proficiencies: One type of gaming set, thieves' tools",
);
const ARTISAN = traits(
  "• Skill Proficiencies: Insight, Persuasion\n• Tool Proficiencies: One type of artisan's tools\n• Languages: One of your choice",
);

/*
 * The builder used to ask for "two of your choice — languages or tools, in any
 * mix", which is a rule no edition has. The background decides.
 */
describe("what a background actually gives", () => {
  it("gives an acolyte two languages and no tools", () => {
    const g = grantsOf(ACOLYTE);
    expect(g.languages).toBe(2);
    expect(g.tools).toEqual([]);
    expect(g.toolChoices).toEqual([]);
  });

  it("gives a criminal two tools and no languages", () => {
    const g = grantsOf(CRIMINAL);
    expect(g.languages).toBe(0);
    expect(g.tools).toEqual(["thieves' tools"]);
    expect(g.toolChoices).toEqual([{ of: "gaming set", count: 1 }]);
  });

  it("gives a guild artisan one of each", () => {
    const g = grantsOf(ARTISAN);
    expect(g.languages).toBe(1);
    expect(g.toolChoices).toEqual([{ of: "artisan's tools", count: 1 }]);
  });

  it("separates a named language from a chosen one", () => {
    const g = grantsOf(traits("• Languages: Elvish and one of your choice"));
    expect(g.namedLanguages).toEqual(["Elvish"]);
    expect(g.languages).toBe(1);
  });

  /*
   * "Your choice of a gaming set or a musical instrument" puts the words in
   * the other order, and matching only one order granted the whole sentence as
   * a tool with that name.
   */
  it("reads the choice written the other way round", () => {
    const g = grantsOf(traits("• Tool Proficiencies: Your choice of a gaming set or a musical instrument"));
    expect(g.tools).toEqual([]);
    expect(g.toolChoices).toHaveLength(1);
    expect(g.toolChoices[0]!.of).toMatch(/gaming set or a musical instrument/);
  });

  it("keeps the book's own words beside a thin reading", () => {
    expect(grantsOf(CRIMINAL).said.tools).toBe("One type of gaming set, thieves' tools");
  });

  it("gives nothing when the background says nothing", () => {
    expect(grantsOf(traits("• Skill Proficiencies: Athletics")).languages).toBe(0);
    expect(grantsOf([])).toEqual({ languages: 0, namedLanguages: [], tools: [], toolChoices: [], said: {} });
  });
});

describe("saying it in one sentence", () => {
  it("reads as English, not as concatenation", () => {
    expect(describeGrants(grantsOf(CRIMINAL), "Criminal"))
      .toBe("Criminal gives you thieves' tools and a gaming set of your choice.");
    expect(describeGrants(grantsOf(ACOLYTE), "Acolyte")).toBe("Acolyte gives you two languages.");
  });

  it("says so when there is nothing to say", () => {
    expect(describeGrants(grantsOf([]), "Hermit")).toBe("Hermit says nothing about languages or tools.");
  });
});

describe("how many decisions it asks for", () => {
  it("counts languages and tool choices together", () => {
    expect(picksIn(grantsOf(ACOLYTE))).toBe(2);
    expect(picksIn(grantsOf(CRIMINAL))).toBe(1);
    expect(picksIn(grantsOf(ARTISAN))).toBe(2);
  });
});

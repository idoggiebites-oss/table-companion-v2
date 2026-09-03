import { describe, it, expect } from "vitest";
import { findChoices, choicesBy, outerParen, ownerOf, answers, ownFeatures } from "./choicepoints";

const FIGHTER = [
  { level: 1, name: "Starting Fighter" },
  { level: 1, name: "Fighting Style" },
  { level: 1, name: "Fighting Style: Archery" },
  { level: 1, name: "Fighting Style: Defense" },
  { level: 1, name: "Second Wind" },
  { level: 2, name: "Action Surge (one use)" },
  { level: 3, name: "Martial Archetype" },
  { level: 3, name: "Martial Archetype: Champion" },
  { level: 3, name: "Martial Archetype: Battle Master" },
  // The option whose own features are written "(Purple Dragon Knight (Banneret))".
  { level: 3, name: "Martial Archetype: Purple Dragon Knight (Banneret)" },
  { level: 3, name: "Improved Critical (Champion)" },
  { level: 3, name: "Combat Superiority (Battle Master)" },
  { level: 3, name: "Rallying Cry (Purple Dragon Knight (Banneret))" },
  { level: 1, name: "Multiclass Fighter" },
];

describe("the choices a class makes about itself", () => {
  /*
   * One reading, not a special case each. V2 knew about subclasses and
   * fighting styles and nothing else, so a sorcerer was never asked about
   * Metamagic and a warlock never about their Pact Boon.
   */
  it("finds every question the class asks, at the level it asks", () => {
    const points = findChoices(FIGHTER);
    expect(points.map((p) => `${p.of}@${String(p.level)}`))
      .toEqual(["Fighting Style@1", "Martial Archetype@3"]);
  });

  it("takes the level from the question, not from its answers", () => {
    const late = findChoices([
      { level: 3, name: "Metamagic" },
      { level: 3, name: "Metamagic: Careful Spell" },
      { level: 10, name: "Metamagic: Twinned Spell" },
    ]);
    expect(late[0]!.level).toBe(3);
  });

  /*
   * Without the "is there a plain feature of that name" test, "Channel
   * Divinity: Turn Undead" looks like a decision when it is the only thing
   * on offer.
   */
  it("is not a choice when the class never asks the question", () => {
    expect(findChoices([
      { level: 2, name: "Channel Divinity: Turn Undead" },
      { level: 2, name: "Channel Divinity: Harness Divine Power" },
    ])).toEqual([]);
  });

  it("is not a choice when there is only one answer", () => {
    expect(findChoices([
      { level: 3, name: "Pact Boon" },
      { level: 3, name: "Pact Boon: Pact of the Blade" },
    ])).toEqual([]);
  });

  /* The display name is stripped for a menu; `full` keeps the marker, because
     stripping it made every homebrew archetype look like the game's own. */
  it("keeps the marker for provenance while showing a clean name", () => {
    const p = findChoices([
      { level: 3, name: "Ranger Archetype" },
      { level: 3, name: "Ranger Archetype: Hunter" },
      { level: 3, name: "Ranger Archetype: Bog Phantom (HB)" },
    ])[0]!;
    expect(p.options.map((o) => o.name)).toEqual(["Bog Phantom", "Hunter"]);
    expect(p.options.map((o) => o.full)).toContain("Bog Phantom (HB)");
  });

  it("reports only the questions a character has reached", () => {
    expect(choicesBy(findChoices(FIGHTER), 1).map((p) => p.of)).toEqual(["Fighting Style"]);
    expect(choicesBy(findChoices(FIGHTER), 3).map((p) => p.of)).toHaveLength(2);
  });
});

describe("whose feature is this", () => {
  /* Reading the innermost group gives "Banneret", which matches no option,
     so a fighter reaching 3 was told they gained a hundred and fifty
     features belonging to subclasses they had not taken. */
  it("reads the outermost parenthetical, not the innermost", () => {
    expect(outerParen("Rallying Cry (Purple Dragon Knight (Banneret))"))
      .toBe("Purple Dragon Knight (Banneret)");
    expect(outerParen("Improved Critical (Champion)")).toBe("Champion");
    expect(outerParen("Second Wind")).toBeNull();
  });

  /* "Action Surge (one use)" is a plain class feature. */
  it("does not read every parenthetical as an owner", () => {
    const options = new Set(["Champion", "Battle Master"]);
    expect(ownerOf("Action Surge (one use)", options)).toBeNull();
    expect(ownerOf("Improved Critical (Champion)", options)).toBe("Champion");
  });
});

describe("does this answer name that option", () => {
  it("matches exactly, and by a trailing label", () => {
    expect(answers("Life Domain", "Life Domain")).toBe(true);
    expect(answers("life", "Life Domain")).toBe(true);
  });

  it("matches a leading label, but only across 'of'", () => {
    expect(answers("Evocation", "School of Evocation")).toBe(true);
    expect(answers("Moon", "Circle of the Moon")).toBe(true);
  });

  /* Matching any shared last word would hand a Hunter every feature of the
     Trophy Hunter and the Bounty Hunter. */
  it("does not match on a shared last word", () => {
    expect(answers("Hunter", "Trophy Hunter")).toBe(false);
    expect(answers("Hunter", "Bounty Hunter")).toBe(false);
  });

  it("says no to nothing", () => {
    expect(answers("", "Life Domain")).toBe(false);
  });
});

describe("what THIS character has, out of everything the class can be", () => {
  it("keeps a class's own features and drops other subclasses'", () => {
    const mine = ownFeatures(FIGHTER, { level: 3, answered: ["Champion"] });
    const flat = mine.flatMap((r) => r.names);
    expect(flat).toContain("Second Wind");
    expect(flat).toContain("Action Surge (one use)");
    expect(flat).toContain("Improved Critical (Champion)");
    expect(flat).not.toContain("Combat Superiority (Battle Master)");
    expect(flat).not.toContain("Rallying Cry (Purple Dragon Knight (Banneret))");
  });

  it("drops the question itself — the answer shows as what it granted", () => {
    const flat = ownFeatures(FIGHTER, { level: 3, answered: ["Champion"] }).flatMap((r) => r.names);
    expect(flat).not.toContain("Martial Archetype: Champion");
    expect(flat).toContain("Martial Archetype");
  });

  it("drops the compendium's structural rows", () => {
    const flat = ownFeatures(FIGHTER, { level: 3, answered: [] }).flatMap((r) => r.names);
    expect(flat).not.toContain("Starting Fighter");
    expect(flat).not.toContain("Multiclass Fighter");
  });

  it("stops at the level asked for", () => {
    const levels = ownFeatures(FIGHTER, { level: 1, answered: [] }).map((r) => r.level);
    expect(levels).toEqual([1]);
  });

  it("groups by the level they arrived at", () => {
    const mine = ownFeatures(FIGHTER, { level: 3, answered: ["Champion"] });
    expect(mine.map((r) => r.level)).toEqual([1, 2, 3]);
  });
});

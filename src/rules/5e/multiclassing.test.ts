import { describe, it, expect } from "vitest";
import {
  multiclassGrant, describeGrant, MULTICLASS,
  casterLevel, multiclassSlots, pactMagic, multiclassBlock,
} from "./multiclassing";
import { BLANK, type Scores } from "./abilities";
import { SKILLS } from "./skills";

describe("what a second class brings, which is not what a first one does", () => {
  /*
   * The builder was half-right by accident: a second class granted nothing,
   * which is correct for nine classes and wrong for the three that grant a
   * skill.
   */
  it("grants a skill for exactly three classes", () => {
    const withSkills = Object.entries(MULTICLASS)
      .filter(([, g]) => g.skills !== undefined)
      .map(([id]) => id)
      .sort();
    expect(withSkills).toEqual(["bard", "ranger", "rogue"]);
  });

  it("lets a bard choose any skill at all, and the other two from a list", () => {
    expect(multiclassGrant("bard")!.skills).toEqual({ choose: 1, from: [] });
    expect(multiclassGrant("rogue")!.skills!.from).toContain("stealth");
    expect(multiclassGrant("ranger")!.skills!.from).toContain("survival");
    expect(multiclassGrant("ranger")!.skills!.from).not.toContain("deception");
  });

  /* Ids, not display names: a list that does not join against SKILLS offers
     nothing, and does it silently. */
  it("names skills the way the skill table does", () => {
    const known = new Set(SKILLS.map((s) => s.id));
    for (const [id, g] of Object.entries(MULTICLASS)) {
      for (const s of g.skills?.from ?? []) {
        expect(known.has(s), `${id} names ${s}`).toBe(true);
      }
    }
  });

  it("carries the armour and weapons that do come across", () => {
    expect(multiclassGrant("fighter")!.proficiencies).toContain("shields");
    // A fighter/wizard's shield proficiency was a thing to remember alone.
    expect(multiclassGrant("wizard")!.proficiencies).toEqual([]);
  });

  it("knows nothing about a class the book does not cover", () => {
    expect(multiclassGrant("blood-hunter")).toBeNull();
  });
});

describe("saying it out loud", () => {
  it("reads as a sentence, not as a list of fragments", () => {
    expect(describeGrant("Rogue", multiclassGrant("rogue")!))
      .toBe("Taken as a second class, Rogue brings light armour, thieves' tools and one skill from its list.");
  });

  it("says so plainly when a class brings nothing", () => {
    expect(describeGrant("Wizard", multiclassGrant("wizard")!))
      .toBe("Wizard brings its spellcasting and nothing else — no armour, no weapons, no skills.");
  });
});

const k = (id: string, level: number, subclass?: string) =>
  ({ id, level, ...(subclass === undefined ? {} : { subclass }) });

describe("spell slots, when there is more than one class", () => {
  /*
   * The reason this is a file rather than a few lines. A Cleric 3 / Wizard 3
   * has the slots of a SIXTH-level caster while knowing only 2nd-level
   * spells. Adding the two class tables together gives 4/2 + 4/2; the rules
   * give 4/3/3.
   */
  it("reads one combined caster level, not two tables added together", () => {
    expect(casterLevel([k("cleric", 3), k("wizard", 3)])).toBe(6);
    expect(multiclassSlots([k("cleric", 3), k("wizard", 3)])).toEqual([4, 3, 3]);
  });

  it("counts a half caster at half, rounded down", () => {
    expect(casterLevel([k("paladin", 5)])).toBe(2);
    expect(casterLevel([k("ranger", 1)])).toBe(0);
  });

  /* The single most-forgotten exception in the whole calculation. */
  it("rounds the artificer UP, alone among the half casters", () => {
    expect(casterLevel([k("artificer", 1)])).toBe(1);
    expect(casterLevel([k("artificer", 5)])).toBe(3);
    expect(casterLevel([k("paladin", 5)])).toBe(2);
  });

  /* A third caster is a SUBCLASS fact, not a class fact. */
  it("counts a third caster only when the subclass says so", () => {
    expect(casterLevel([k("fighter", 6, "champion")])).toBe(0);
    expect(casterLevel([k("fighter", 6, "eldritch-knight")])).toBe(2);
    expect(casterLevel([k("rogue", 9, "arcane-trickster")])).toBe(3);
  });

  it("gives nothing to a party of non-casters", () => {
    expect(multiclassSlots([k("fighter", 5), k("barbarian", 5)])).toEqual([]);
  });

  it("does not run off the end of the table", () => {
    expect(multiclassSlots([k("wizard", 20), k("cleric", 20)])).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });
});

describe("pact magic, which never joins that sum", () => {
  it("is the warlock's own track", () => {
    expect(pactMagic([k("warlock", 1)])).toEqual({ count: 1, level: 1 });
    expect(pactMagic([k("warlock", 2)])).toEqual({ count: 2, level: 1 });
    expect(pactMagic([k("warlock", 5)])).toEqual({ count: 2, level: 3 });
    expect(pactMagic([k("warlock", 11)])).toEqual({ count: 3, level: 5 });
    expect(pactMagic([k("warlock", 17)])).toEqual({ count: 4, level: 5 });
  });

  /* A Warlock 3 / Wizard 3 has a wizard's 3rd-level slots AND two pact slots,
     not one combined pool. */
  it("stacks alongside the combined table rather than into it", () => {
    const mix = [k("warlock", 3), k("wizard", 3)];
    expect(casterLevel(mix)).toBe(3);
    expect(multiclassSlots(mix)).toEqual([4, 2]);
    expect(pactMagic(mix)).toEqual({ count: 2, level: 2 });
  });

  it("says nothing about a character with no warlock levels", () => {
    expect(pactMagic([k("wizard", 5)])).toBeNull();
  });
});

describe("what each class demands before it will have you", () => {
  const scores = (over: Partial<Scores> = {}): Scores => ({ ...BLANK, ...over });

  it("blocks a class whose minimum is not met", () => {
    expect(multiclassBlock({ from: [k("fighter", 1)], into: "wizard", scores: scores({ str: 15, int: 12 }) }))
      .toContain("Wizard needs Intelligence 13");
  });

  /* The half people forget: you need the minimums of the class you are
     LEAVING as well as the one you are joining. */
  it("demands the minimums of the class being left, too", () => {
    const said = multiclassBlock({ from: [k("wizard", 3)], into: "fighter", scores: scores({ int: 10, str: 16 }) });
    expect(said).toContain("Wizard needs Intelligence 13");
  });

  it("takes either of a class that asks for one of two", () => {
    expect(multiclassBlock({ from: [], into: "fighter", scores: scores({ str: 15, dex: 8 }) })).toBeNull();
    expect(multiclassBlock({ from: [], into: "fighter", scores: scores({ str: 8, dex: 15 }) })).toBeNull();
    expect(multiclassBlock({ from: [], into: "fighter", scores: scores({ str: 8, dex: 8 }) }))
      .toContain("Strength or Dexterity");
  });

  it("demands both where the class asks for both", () => {
    expect(multiclassBlock({ from: [], into: "paladin", scores: scores({ str: 15, cha: 10 }) }))
      .toContain("Strength and Charisma");
  });

  it("lets a class it has no rule for through rather than guessing", () => {
    expect(multiclassBlock({ from: [], into: "blood-hunter", scores: scores() })).toBeNull();
  });

  it("says nothing when everything is met", () => {
    expect(multiclassBlock({ from: [k("fighter", 1)], into: "wizard", scores: scores({ str: 15, int: 14 }) }))
      .toBeNull();
  });
});

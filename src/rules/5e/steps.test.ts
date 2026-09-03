import { describe, it, expect } from "vitest";
import { stepsFor, diffSteps, progress, type StepFacts, type StepId, type ClassFacts } from "./steps";

const klass = (id: string, level = 1): ClassFacts => ({
  id, level,
  casterAtFirst: id === "wizard" || id === "cleric",
  subclassAtLevel: id === "cleric" ? 1 : id === "wizard" ? 2 : 3,
  styleAtLevel: id === "fighter" ? 1 : id === "paladin" || id === "ranger" ? 2 : Number.POSITIVE_INFINITY,
});

const facts = (over: Partial<StepFacts> = {}): StepFacts => {
  const classes = over.classes ?? [];
  return {
    race: null,
    classes,
    level: over.level ?? (classes.reduce((n, c) => n + c.level, 0) || 1),
    picks: 0,
    heritage: 0,
    improvements: 0,
    mcSkills: 0,
    classPicks: 0,
    weapons: 0,
    ...over,
  };
};
const elf = { id: "elf", hasSubraces: true };
const human = { id: "human", hasSubraces: false };
const ids = (f: StepFacts) => stepsFor(f).map((s) => s.id);

describe("the step list is computed, not fixed", () => {
  it("gives a fighter no spells step", () => {
    expect(ids(facts({ classes: [klass("fighter")] }))).not.toContain("spells");
    expect(ids(facts({ classes: [klass("wizard")] }))).toContain("spells");
  });

  it("gives a subrace step only to an ancestry that has one", () => {
    expect(ids(facts({ race: elf }))).toContain("subrace");
    expect(ids(facts({ race: human }))).not.toContain("subrace");
  });

  it("asks a cleric for a subclass at level 1 and a wizard not until 2", () => {
    expect(ids(facts({ classes: [klass("cleric")] }))).toContain("subclass");
    expect(ids(facts({ classes: [klass("wizard", 1)] }))).not.toContain("subclass");
    expect(ids(facts({ classes: [klass("wizard", 2)] }))).toContain("subclass");
  });

  it("has no levels to place at level one", () => {
    expect(ids(facts({ classes: [klass("fighter", 1)] }))).not.toContain("multiclass");
    expect(ids(facts({ classes: [klass("fighter", 2)] }))).toContain("multiclass");
  });

  it("is a different length for two different characters", () => {
    expect(ids(facts({ race: elf, classes: [klass("wizard")] })).length)
      .not.toBe(ids(facts({ race: human, classes: [klass("fighter")] })).length);
  });

  it("always begins with ancestry, names the character, then reviews", () => {
    for (const f of [facts(), facts({ race: elf, classes: [klass("cleric")] })]) {
      const list = ids(f);
      expect(list[0]).toBe("ancestry");
      // Review is last, and it is the only step after Identity — a character
      // is named before anybody is asked to confirm them.
      expect(list.at(-1)).toBe("review");
      expect(list.at(-2)).toBe("identity");
    }
  });
});

describe("more than one class", () => {
  const fighterWizard = [klass("fighter", 5), klass("wizard", 2)];

  it("asks for spells because one of the classes casts", () => {
    // A fighter/wizard is asked about spells. A fighter/rogue is not.
    expect(ids(facts({ classes: fighterWizard }))).toContain("spells");
    expect(ids(facts({ classes: [klass("fighter", 5), klass("rogue", 2)] }))).not.toContain("spells");
  });

  it("asks for a path because one of the classes has reached its own", () => {
    // The wizard half is level 2, which is where a wizard chooses.
    expect(ids(facts({ classes: fighterWizard }))).toContain("subclass");
    // Neither half has reached third level, so neither has a path yet.
    expect(ids(facts({ classes: [klass("fighter", 2), klass("rogue", 2)] }))).not.toContain("subclass");
  });

  it("counts the character's level as the sum of its classes", () => {
    expect(facts({ classes: fighterWizard }).level).toBe(7);
    expect(ids(facts({ classes: fighterWizard }))).toContain("multiclass");
  });
});

describe("a step arrives; it never changes underneath you", () => {
  it("adds lineage without disturbing what was already answered", () => {
    const change = diffSteps(stepsFor(facts()), stepsFor(facts({ race: elf })), ["ancestry"]);
    expect(change.added).toEqual(["subrace"]);
    expect(change.removed).toEqual([]);
    expect(change.stable).toBe(true);
  });

  it("reports a removal rather than performing it silently", () => {
    const change = diffSteps(stepsFor(facts({ race: elf })), stepsFor(facts({ race: human })), ["ancestry"]);
    expect(change.removed).toEqual(["subrace"]);
    expect(change.stable).toBe(true);
  });

  it("keeps every answered step in order when a second class adds two steps", () => {
    const answered: StepId[] = ["ancestry", "class", "level", "abilities"];
    const before = stepsFor(facts({ race: human, classes: [klass("fighter", 7)] }));
    const after = stepsFor(facts({ race: human, classes: [klass("fighter", 5), klass("cleric", 2)] }));
    const change = diffSteps(before, after, answered);
    expect(change.added).toEqual(["spells"]); // subclass was already there at fighter 5
    expect(change.stable).toBe(true);
  });

  it("counts progress against this character's list, never a constant", () => {
    const a = stepsFor(facts({ race: human, classes: [klass("fighter")] }));
    const b = stepsFor(facts({ race: elf, classes: [klass("wizard", 2)] }));
    expect(progress(a, "identity").total).toBe(a.length);
    expect(progress(b, "identity").total).toBe(b.length);
    expect(progress(a, "identity").total).not.toBe(progress(b, "identity").total);
  });
});

describe("the steps that arrive because of what a class is", () => {
  it("asks a fighter how they fight, and nobody else", () => {
    expect(stepsFor(facts({ classes: [klass("fighter")] })).map((s) => s.id)).toContain("style");
    expect(stepsFor(facts({ classes: [klass("wizard")] })).map((s) => s.id)).not.toContain("style");
  });

  /* A paladin adopts one at 2. At 1 there is nothing to adopt. */
  it("waits until the level the class states", () => {
    expect(stepsFor(facts({ classes: [klass("paladin", 1)] })).map((s) => s.id)).not.toContain("style");
    expect(stepsFor(facts({ classes: [klass("paladin", 2)] })).map((s) => s.id)).toContain("style");
  });

  /*
   * "Choose 0 of nothing" is a dead end, not a question — a Dwarf Fighter with
   * a Soldier background is handed every language and tool they get.
   */
  it("asks about languages and tools only when something is left open", () => {
    expect(stepsFor(facts({ classes: [klass("fighter")], picks: 0 })).map((s) => s.id))
      .not.toContain("proficiencies");
    expect(stepsFor(facts({ classes: [klass("fighter")], picks: 2 })).map((s) => s.id))
      .toContain("proficiencies");
  });

  it("keeps the order fixed even as membership changes", () => {
    const ids = stepsFor(facts({ classes: [klass("fighter")], picks: 1 })).map((s) => s.id);
    expect(ids.indexOf("skills")).toBeLessThan(ids.indexOf("style"));
    expect(ids.indexOf("style")).toBeLessThan(ids.indexOf("proficiencies"));
    expect(ids.indexOf("proficiencies")).toBeLessThan(ids.indexOf("equipment"));
  });
});

describe("the steps a character's own history adds", () => {
  it("asks what the ancestry left open, and only when it left something", () => {
    expect(ids(facts({ classes: [klass("wizard")], heritage: 0 }))).not.toContain("heritage");
    expect(ids(facts({ classes: [klass("wizard")], heritage: 4 }))).toContain("heritage");
  });

  /* A Fighter joining at 8 has passed 4, 6 and 8. One grown at the table
     answers each as it arrives and is never asked here. */
  it("asks about improvements already passed, and only for a character joining above one", () => {
    expect(ids(facts({ classes: [klass("fighter")], improvements: 0 }))).not.toContain("improvements");
    expect(ids(facts({ classes: [klass("fighter", 8)], improvements: 3 }))).toContain("improvements");
  });

  it("asks what a second class brought, for the three classes that bring a skill", () => {
    expect(ids(facts({ classes: [klass("fighter"), klass("wizard")], mcSkills: 0 }))).not.toContain("mcskills");
    expect(ids(facts({ classes: [klass("fighter"), klass("rogue")], mcSkills: 1 }))).toContain("mcskills");
  });

  it("places the ancestry's gift after the scores it changes", () => {
    const list = ids(facts({ classes: [klass("wizard")], heritage: 2 }));
    expect(list.indexOf("abilities")).toBeLessThan(list.indexOf("heritage"));
    // And before Skills, so a skill it grants can be shown as already held.
    expect(list.indexOf("heritage")).toBeLessThan(list.indexOf("skills"));
  });
});

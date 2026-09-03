import { describe, it, expect } from "vitest";
import { Clock } from "../../core/log";
import { asDevice, type Event } from "../../core/types";
import { buildFrom, charactersIn, primary, scoresOf, featsOf, CHOICE, EMPTY, type Choice } from "./model";
import { factsOf, type Catalogue } from "./facts";
import { toSheet, fromSheet } from "./transfer";
import { NO_OFFER } from "./offers";
import { languagesOf, toolsOf } from "./proficiency";
import { stepsFor, diffSteps } from "../../rules/5e/steps";
import { BLANK } from "../../rules/5e/abilities";

const cat: Catalogue = {
  hasSubraces: (id) => id === "elf" || id === "dwarf",
  casterAtFirst: (id) => id === "wizard" || id === "cleric",
  subclassAtLevel: (id) => (id === "cleric" ? 1 : id === "wizard" ? 2 : 3),
  styleAtLevel: (id) => (id === "fighter" ? 1 : Number.POSITIVE_INFINITY),
  cantripsFor: () => 3,
  openQuestions: () => [],
  slotTableFor: () => undefined,
  proficienciesFor: () => NO_OFFER,
  heritageFor: () => ({ points: 0, skills: 0, feat: false }),
};

const build = () => {
  const c = new Clock(asDevice("dev"));
  const events: Event[] = [];
  const choose = (choice: Choice) => {
    const e = c.issue(CHOICE, choice as unknown as Record<string, unknown>);
    events.push(e);
    return e;
  };
  return { c, events, choose };
};

describe("every choice is an event", () => {
  it("changes nothing except through the log", () => {
    const { events, choose } = build();
    expect(buildFrom(events)).toEqual(EMPTY);
    choose({ step: "ancestry", race: "elf" });
    expect(buildFrom(events).race).toBe("elf");
    expect(events).toHaveLength(1);
  });

  it("records which steps were answered, in order", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "human" });
    choose({ step: "class", klass: "fighter" });
    choose({ step: "background", background: "sage" });
    expect(buildFrom(events).answered).toEqual(["ancestry", "class", "background"]);
  });

  it("undoes a choice without deleting it", () => {
    const { c, events, choose } = build();
    const first = choose({ step: "ancestry", race: "elf" });
    choose({ step: "class", klass: "wizard" });
    events.push(c.undo(first.id));

    const b = buildFrom(events);
    expect(b.race).toBeNull();
    expect(primary(b)).toBe("wizard"); // the later choice survives
    expect(events).toHaveLength(3); // nothing was removed
  });

  it("drops a lineage when the ancestry changes under it", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "elf" });
    choose({ step: "subrace", subrace: "high-elf" });
    expect(buildFrom(events).subrace).toBe("high-elf");
    choose({ step: "ancestry", race: "human" });
    expect(buildFrom(events).subrace).toBeNull();
  });
});

describe("the step list follows the build", () => {
  it("grows a lineage step the moment an elf is chosen", () => {
    const { events, choose } = build();
    const before = stepsFor(factsOf(buildFrom(events), cat));
    choose({ step: "ancestry", race: "elf" });
    const after = stepsFor(factsOf(buildFrom(events), cat));

    const change = diffSteps(before, after, buildFrom(events).answered);
    expect(change.added).toEqual(["subrace"]);
    expect(change.stable).toBe(true);
  });

  it("gives a wizard a spells step and a fighter none", () => {
    const w = build(); w.choose({ step: "class", klass: "wizard" });
    const f = build(); f.choose({ step: "class", klass: "fighter" });
    const ids = (b: ReturnType<typeof build>) => stepsFor(factsOf(buildFrom(b.events), cat)).map((s) => s.id);
    expect(ids(w)).toContain("spells");
    expect(ids(f)).not.toContain("spells");
  });

  it("never disturbs an answered step when the list changes", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "human" });
    choose({ step: "class", klass: "fighter" });
    choose({ step: "abilities", method: "point-buy", scores: BLANK });
    const before = stepsFor(factsOf(buildFrom(events), cat));

    choose({ step: "class", klass: "cleric" }); // gains subclass and spells
    const after = stepsFor(factsOf(buildFrom(events), cat));
    const change = diffSteps(before, after, buildFrom(events).answered);

    expect(change.added.sort()).toEqual(["spells", "subclass"]);
    expect(change.stable).toBe(true);
  });
});

describe("a device holds more than one character", () => {
  const two = () => {
    const c = new Clock(asDevice("dev"));
    const events: Event[] = [];
    const choose = (character: string, choice: Choice) =>
      events.push(c.issue(CHOICE, { ...(choice as unknown as Record<string, unknown>), character }));
    choose("a", { step: "ancestry", race: "elf" });
    choose("a", { step: "class", klass: "wizard" });
    choose("b", { step: "ancestry", race: "human" });
    choose("b", { step: "class", klass: "fighter" });
    return { c, events };
  };

  it("keeps two builds apart in one log", () => {
    const { events } = two();
    expect(buildFrom(events, "a").race).toBe("elf");
    expect(primary(buildFrom(events, "a"))).toBe("wizard");
    expect(buildFrom(events, "b").race).toBe("human");
    expect(primary(buildFrom(events, "b"))).toBe("fighter");
  });

  it("lists them most recently started first", () => {
    const { events } = two();
    expect(charactersIn(events).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("drops a character whose every choice was undone", () => {
    const { c, events } = two();
    for (const e of events.filter((x) => x.data["character"] === "b")) events.push(c.undo(e.id));
    expect(charactersIn(events).map((c2) => c2.id)).toEqual(["a"]);
  });
});

describe("more than one class, in one pass", () => {
  const cat7: Catalogue = {
    hasSubraces: (id) => id === "elf",
    casterAtFirst: (id) => id === "wizard" || id === "cleric",
    subclassAtLevel: (id) => (id === "cleric" ? 1 : id === "wizard" ? 2 : 3),
    styleAtLevel: () => Number.POSITIVE_INFINITY,
    cantripsFor: () => 3,
  openQuestions: () => [],
    slotTableFor: () => undefined,
    proficienciesFor: () => NO_OFFER,
  heritageFor: () => ({ points: 0, skills: 0, feat: false }),
  };

  const fighterWizard = () => {
    const b = build();
    b.choose({ step: "ancestry", race: "elf" });
    b.choose({ step: "subrace", subrace: "high-elf" });
    b.choose({ step: "class", klass: "fighter" });
    b.choose({ step: "level", level: 7 });
    b.choose({ step: "multiclass", classes: [{ id: "fighter", level: 5 }, { id: "wizard", level: 2 }] });
    b.choose({ step: "subclass", subclass: "champion", klass: "fighter" });
    b.choose({ step: "subclass", subclass: "evocation", klass: "wizard" });
    return b;
  };

  it("builds a level-7 fighter/wizard", () => {
    const b = buildFrom(fighterWizard().events);
    expect(b.level).toBe(7);
    expect(b.classes.map((c) => `${c.id} ${c.level}`)).toEqual(["fighter 5", "wizard 2"]);
    expect(b.classes.map((c) => c.subclass)).toEqual(["champion", "evocation"]);
  });

  it("puts every level in the first class until told otherwise", () => {
    const b = build();
    b.choose({ step: "class", klass: "fighter" });
    b.choose({ step: "level", level: 7 });
    expect(buildFrom(b.events).classes).toEqual([{ id: "fighter", level: 7, subclass: null }]);
  });

  it("asks for spells because the wizard half casts, though the fighter does not", () => {
    const ids = stepsFor(factsOf(buildFrom(fighterWizard().events), cat7)).map((s) => s.id);
    expect(ids).toContain("spells");
    expect(ids).toContain("multiclass");
  });

  it("keeps a path already chosen when the levels move", () => {
    const b = fighterWizard();
    b.choose({ step: "multiclass", classes: [{ id: "fighter", level: 4 }, { id: "wizard", level: 3 }] });
    const built = buildFrom(b.events);
    expect(built.classes.map((c) => c.subclass)).toEqual(["champion", "evocation"]);
    expect(built.classes.map((c) => c.level)).toEqual([4, 3]);
  });

  it("starts over when the first class changes, because the levels went somewhere else", () => {
    const b = fighterWizard();
    b.choose({ step: "class", klass: "rogue" });
    const built = buildFrom(b.events);
    expect(built.classes).toEqual([{ id: "rogue", level: 7, subclass: null }]);
  });

  it("round-trips a multiclass character through export and import", () => {
    const { events } = fighterWizard();
    const reimported = fromSheet(JSON.parse(JSON.stringify(toSheet(events))));
    expect(buildFrom(reimported)).toEqual(buildFrom(events));
  });
});

describe("a choice records the words, not only the id", () => {
  it("keeps the name the person saw", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "elf", name: "Elf" });
    choose({ step: "subrace", subrace: "elf-high", name: "High" });
    choose({ step: "class", klass: "rogue", name: "Rogue" });
    const b = buildFrom(events);
    // Ids are what the rules join on; names are what a screen says.
    expect(b.race).toBe("elf");
    expect(b.names["ancestry"]).toBe("Elf");
    expect(b.names["subrace"]).toBe("High");
    expect(b.names["class"]).toBe("Rogue");
  });

  it("carries them through export and import", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "elf", name: "Elf" });
    const again = fromSheet(JSON.parse(JSON.stringify(toSheet(events))));
    expect(buildFrom(again).names["ancestry"]).toBe("Elf");
  });

  it("works without them, because an old log has none", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "elf" });
    expect(buildFrom(events).names).toEqual({});
    expect(buildFrom(events).race).toBe("elf");
  });
});

describe("what the ancestry grants", () => {
  it("adds its bonuses to the scores a person assigned", () => {
    // A High Elf is +2 Dexterity and +1 Intelligence. Without this every
    // derived number on the sheet is short: armour class, initiative, saves,
    // skills, and hit points.
    const { events, choose } = build();
    choose({ step: "ancestry", race: "elf", bonuses: { dex: 2, int: 1 }, speed: 30 });
    choose({ step: "abilities", method: "standard-array",
             scores: { ...BLANK, dex: 15, int: 14, con: 13 } });
    const b = buildFrom(events);
    expect(b.scores.dex).toBe(15);        // what they assigned
    expect(scoresOf(b).dex).toBe(17);     // what they have
    expect(scoresOf(b).int).toBe(15);
    expect(scoresOf(b).con).toBe(13);     // untouched
  });

  it("keeps the two apart, so a sheet can say why a 15 became a 17", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "dwarf", bonuses: { con: 2 } });
    choose({ step: "abilities", method: "manual", scores: { ...BLANK, con: 15 } });
    expect(buildFrom(events).bonuses).toEqual({ con: 2 });
    expect(buildFrom(events).scores.con).toBe(15);
  });

  it("takes the lineage's grant over the ancestry's", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "elf", bonuses: { dex: 2 }, speed: 30 });
    choose({ step: "subrace", subrace: "elf-high", bonuses: { dex: 2, int: 1 }, speed: 30 });
    expect(buildFrom(events).bonuses).toEqual({ dex: 2, int: 1 });
  });

  it("drops the old grant when the ancestry changes", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "dwarf", bonuses: { con: 2 }, speed: 25 });
    choose({ step: "ancestry", race: "human", bonuses: { str: 1, dex: 1 }, speed: 30 });
    expect(buildFrom(events).bonuses).toEqual({ str: 1, dex: 1 });
    expect(buildFrom(events).speed).toBe(30);
  });

  it("never pushes a score past twenty", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "elf", bonuses: { dex: 2 } });
    choose({ step: "abilities", method: "manual", scores: { ...BLANK, dex: 19 } });
    expect(scoresOf(buildFrom(events)).dex).toBe(20);
  });

  it("reads the speed the book gives rather than guessing from a name", () => {
    const { events, choose } = build();
    choose({ step: "ancestry", race: "halfling", bonuses: { dex: 2 }, speed: 25 });
    expect(buildFrom(events).speed).toBe(25);
  });
});

describe("the answers that were missing entirely", () => {
  const at = (choice: Choice) => {
    const clock = new Clock(asDevice("d"));
    return buildFrom([clock.issue(CHOICE, choice as unknown as Record<string, unknown>)]);
  };

  it("remembers a fighting style, in the words the person saw", () => {
    const b = at({ step: "style", style: "great-weapon-fighting", name: "Great Weapon Fighting" });
    expect(b.style).toBe("great-weapon-fighting");
    expect(b.names["style"]).toBe("Great Weapon Fighting");
    expect(b.answered).toContain("style");
  });

  it("keeps languages and tools apart, because the sheet has two places for them", () => {
    const b = at({ step: "proficiencies", languages: ["Draconic", "Elvish"], tools: ["Dice Set"] });
    expect(b.languages).toEqual(["Draconic", "Elvish"]);
    expect(b.tools).toEqual(["Dice Set"]);
  });

  it("starts with none of either rather than with a guess", () => {
    expect(EMPTY.style).toBeNull();
    expect(EMPTY.languages).toEqual([]);
    expect(EMPTY.tools).toEqual([]);
  });

  it("records equipment as the book's own words", () => {
    const b = at({ step: "equipment", equipment: ["a martial weapon and a shield", "an explorer's pack"] });
    expect(b.equipment).toEqual(["a martial weapon and a shield", "an explorer's pack"]);
  });
});

describe("what the sources gave, and what was chosen on top", () => {
  const clock = () => new Clock(asDevice("d"));
  const run = (...choices: Choice[]) => {
    const c = clock();
    return buildFrom(choices.map((x) => c.issue(CHOICE, x as unknown as Record<string, unknown>)));
  };

  const HUMAN: Choice = { step: "ancestry", race: "human", grant: { languages: ["Common"], tools: [] } };
  const ROGUE: Choice = { step: "class", klass: "rogue", grant: { languages: [], tools: ["Thieves' Tools"] } };
  const CRIMINAL: Choice = {
    step: "background", background: "criminal",
    grant: { languages: [], tools: ["Thieves' Tools"] },
  };

  /*
   * A Human Rogue who picked Undercommon showed as speaking one language and
   * carrying no tools: the build stored only what was chosen.
   */
  it("counts what a character was given as well as what they picked", () => {
    const b = run(HUMAN, ROGUE, CRIMINAL, { step: "proficiencies", languages: ["Undercommon"], tools: ["Dice Set"] });
    expect(languagesOf(b)).toEqual(["Common", "Undercommon"]);
    expect(toolsOf(b)).toEqual(["Thieves' Tools", "Dice Set"]);
  });

  it("does not hand the same thing over twice", () => {
    // A Rogue's class and a Criminal's past both give thieves' tools.
    expect(toolsOf(run(ROGUE, CRIMINAL))).toEqual(["Thieves' Tools"]);
  });

  /* The step never arrives for a character with nothing left to decide, so
     the grants must stand on their own. */
  it("holds what it was given even when nothing was ever chosen", () => {
    expect(languagesOf(run(HUMAN))).toEqual(["Common"]);
    expect(toolsOf(run(ROGUE))).toEqual(["Thieves' Tools"]);
  });

  /* The same reason `bonuses` is replaced wholesale: a character who stops
     being a Criminal stops owning a Criminal's tools. */
  it("takes a source's grant away when that source changes", () => {
    const b = run(ROGUE, CRIMINAL, { step: "background", background: "acolyte", grant: { languages: ["Celestial"], tools: [] } });
    expect(languagesOf(b)).toEqual(["Celestial"]);
    expect(toolsOf(b)).toEqual(["Thieves' Tools"]);
  });

  it("gives nothing when a choice carried no grant", () => {
    expect(languagesOf(run({ step: "ancestry", race: "human" }))).toEqual([]);
  });
});

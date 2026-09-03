import { describe, it, expect } from "vitest";
import { contentFrom, type Loaded } from "./compendium";
import type { RaceEntry, ClassEntry, BackgroundEntry } from "../../content/schema";
import type { Asking } from "./facts";
import { EMPTY, type Build } from "./model";

const phb = { tier: "unknown" as const, book: "phb", source: "Player's Handbook (2014)", order: 1 };

const race = (id: string, name: string, known: string[], choose: number): RaceEntry => ({
  id, name, kind: "race", provenance: phb,
  traits: [], bonuses: {}, speed: 30, size: "M",
  languages: { known, choose },
});

const klass = (id: string, name: string, over: Partial<ClassEntry> = {}): ClassEntry => ({
  id, name, kind: "class", provenance: phb,
  skills: [], skillCount: 2, armor: [], weapons: [],
  tools: { known: [], choose: 0 }, gear: [], ...over,
});

const background = (id: string, name: string, over: Partial<BackgroundEntry> = {}): BackgroundEntry => ({
  id, name, kind: "background", provenance: phb, skills: [],
  grants: { languages: 0, namedLanguages: [], tools: [], toolChoices: [], said: {} },
  ...over,
});

const HALF_ELF = race("half-elf", "Half-Elf", ["Common", "Elvish"], 1);
const DWARF = race("dwarf", "Dwarf", ["Common", "Dwarvish"], 0);

const BARD = klass("bard", "Bard", {
  skills: [], skillCount: 3,
  tools: { known: [], choose: 3, stated: "three musical instrument of your choice",
           choiceOf: "three musical instrument of your choice" },
});
const ROGUE = klass("rogue", "Rogue", {
  skills: ["Acrobatics", "Athletics", "Deception", "Insight", "Stealth"],
  skillCount: 4,
  tools: { known: ["thieves' tools"], choose: 0 },
  gear: [
    { id: "gear-0", options: ["a rapier", "a shortsword"] },
    { id: "gear-1", options: ["Leather armor, two daggers, and thieves' tools"] },
  ],
});

const CRIMINAL = background("criminal", "Criminal", {
  skills: ["Deception", "Stealth"],
  grants: {
    languages: 0, namedLanguages: [], tools: ["thieves' tools"],
    toolChoices: [{ of: "gaming set", count: 1 }],
    said: { tools: "One type of gaming set, thieves' tools" },
  },
});
const SAGE = background("sage", "Sage", {
  skills: ["Arcana", "History"],
  grants: { languages: 2, namedLanguages: [], tools: [], toolChoices: [], said: { languages: "Two of your choice" } },
});

const TOOLS = [
  { id: "lute", name: "Lute", kind: "instrument" as const },
  { id: "drum", name: "Drum", kind: "instrument" as const },
  { id: "dice-set", name: "Dice Set", kind: "gaming set" as const },
  { id: "dragonchess-set", name: "Dragonchess Set", kind: "gaming set" as const },
  { id: "thieves-tools", name: "Thieves' Tools", kind: "tools" as const },
  { id: "smiths-tools", name: "Smith's Tools", kind: "artisan tools" as const },
];

/* Grants two skills and asks for nothing else — which is a real background,
   and the case where the step must not appear at all. */
const SOLDIER = background("soldier", "Soldier", { skills: ["Athletics", "Intimidation"] });

const ARMOUR = [
  { id: "leather-armor", name: "Leather Armor", kind: "light" as const, ac: 11 },
  { id: "chain-mail", name: "Chain Mail", kind: "heavy" as const, ac: 16, strMinimum: 13, stealthDisadvantage: true },
  { id: "shield", name: "Shield", kind: "shield" as const, ac: 2 },
];

const FEATS = [
  { id: "alert", name: "Alert", kind: "feat" as const, provenance: phb },
  { id: "lucky", name: "Lucky", kind: "feat" as const, provenance: phb },
];

const spell = (id: string, name: string, classes: string[]) => ({
  id, name, kind: "spell" as const, provenance: phb,
  level: 0, school: "evocation", classes, isFeature: false,
});

/* A cantrip's class list names the bare class AND every subclass that gets it,
   as "wizard (school of invention (ua))". Only the bare name counts. */
const CANTRIPS = [
  spell("fire-bolt", "Fire Bolt", ["school: evocation", "wizard", "sorcerer"]),
  spell("eldritch-blast", "Eldritch Blast", ["school: evocation", "warlock"]),
  spell("druidcraft", "Druidcraft", ["school: transmutation", "druid"]),
  spell("sacred-flame", "Sacred Flame", ["cleric", "wizard (school of invention (ua))"]),
];

const loaded = (over: Partial<Loaded> = {}): Loaded => ({
  races: [HALF_ELF, DWARF], classes: [BARD, ROGUE], backgrounds: [CRIMINAL, SAGE, SOLDIER],
  spells: CANTRIPS, paths: {}, styles: {}, tools: TOOLS, armour: ARMOUR, feats: FEATS, choices: {}, weapons: [], ...over,
});

const content = (over: Partial<Loaded> = {}) => contentFrom(loaded(over), { onlyGames: false });
const ask = (o: Partial<Asking>): Asking =>
  ({ race: null, subrace: null, klass: null, background: null, subclass: null, classes: [], heritage: [], ...o });

/* `groupsFor` takes the whole build: a class question depends on the level
   reached and on what has already been answered. */
const asBuild = (o: Partial<Asking>): Build => ({
  ...EMPTY,
  race: o.race ?? null, subrace: o.subrace ?? null, background: o.background ?? null,
  classes: o.klass === null || o.klass === undefined ? [] : [{ id: o.klass, level: 1, subclass: null }],
});

describe("what three sources leave you to decide", () => {
  it("hands over everything named and asks only for what is counted", () => {
    const o = content().proficienciesFor(ask({ race: "half-elf", klass: "rogue", background: "criminal" }));
    expect(o.languages).toEqual(["Common", "Elvish"]);
    expect(o.tools).toEqual(["Thieves' Tools"]);
  });

  /* A Half-Elf who already speaks Elvish should not be offered it again. */
  it("strikes what is already held from the pool it would be offered from", () => {
    const o = content().proficienciesFor(ask({ race: "half-elf", background: "sage" }));
    const langs = o.picks.find((p) => p.id === "languages")!;
    expect(langs.count).toBe(3);
    expect(langs.options).not.toContain("Elvish");
    expect(langs.options).not.toContain("Common");
    expect(langs.options).toContain("Draconic");
  });

  /*
   * Merged into one "choose four", a Criminal could spend their gaming set on
   * a lute — which the background did not offer.
   */
  it("keeps each source's question separate, because the pools differ", () => {
    const o = content().proficienciesFor(ask({ race: "dwarf", klass: "bard", background: "criminal" }));
    const ids = o.picks.map((p) => p.id);
    expect(ids).toEqual(["tools-class", "tools-background-0"]);

    const fromClass = o.picks.find((p) => p.id === "tools-class")!;
    expect(fromClass.count).toBe(3);
    expect(fromClass.options).toEqual(["Lute", "Drum"]);

    const fromBackground = o.picks.find((p) => p.id === "tools-background-0")!;
    expect(fromBackground.count).toBe(1);
    expect(fromBackground.options).toEqual(["Dice Set", "Dragonchess Set"]);
  });

  it("names who is asking, so a screen can say", () => {
    const o = content().proficienciesFor(ask({ klass: "bard", background: "criminal" }));
    expect(o.picks.map((p) => p.from)).toEqual(["Bard", "Criminal"]);
  });

  /* A Dwarf Rogue with a Soldier background is handed the lot — no question
     is left, and the step must not arrive with "choose 0 of nothing". */
  it("asks nothing when nothing is left over", () => {
    const o = content().proficienciesFor(ask({ race: "dwarf", klass: "rogue", background: "soldier" }));
    expect(o.picks).toEqual([]);
    expect(o.languages).toEqual(["Common", "Dwarvish"]);
  });

  it("offers no pool that has run empty", () => {
    const empty = content({ tools: [] });
    expect(empty.proficienciesFor(ask({ klass: "bard" })).picks).toEqual([]);
  });
});

describe("skills, from the class that offers them", () => {
  it("takes the class's own count, not everybody's two", () => {
    expect(content().skillLimit({ klass: "rogue", background: null })).toBe(4);
    expect(content().skillLimit({ klass: "bard", background: null })).toBe(3);
  });

  it("offers only the skills the class lists", () => {
    const names = content().optionsFor("skills", ask({ klass: "rogue" })).map((o) => o.name);
    expect(names).toContain("Stealth (Dex)");
    expect(names).not.toContain("Nature (Int)");
  });

  it("offers all eighteen when the class names none", () => {
    expect(content().optionsFor("skills", ask({ klass: "bard" }))).toHaveLength(18);
  });

  /*
   * Picking class skills before the background's are known is how a player
   * spends a choice on something they were about to be given.
   */
  it("shows what the background already gave, and shows it as held", () => {
    const rows = content().optionsFor("skills", ask({ klass: "rogue", background: "criminal" }));
    expect(rows.find((o) => o.id === "stealth")?.held).toBe("From Criminal");
    expect(rows.find((o) => o.id === "acrobatics")?.held).toBeUndefined();
  });

  it("keeps a granted skill the class does not offer", () => {
    const rows = content().optionsFor("skills", ask({ klass: "rogue", background: "sage" }));
    expect(rows.find((o) => o.id === "arcana")?.held).toBe("From Sage");
  });
});

describe("equipment, from the class's own list", () => {
  it("makes one question of each line that offers a choice", () => {
    const groups = content().groupsFor!("equipment", asBuild({ klass: "rogue" }))!;
    expect(groups).toHaveLength(2);
    expect(groups[0]!.limit).toBe(1);
    expect(groups[0]!.options.map((o) => o.name)).toEqual(["A rapier", "A shortsword"]);
  });

  /* A line with nothing to choose is not a question; it is carried. */
  it("carries a line with no choice rather than asking about it", () => {
    const groups = content().groupsFor!("equipment", asBuild({ klass: "rogue" }))!;
    expect(groups[1]!.limit).toBe(0);
    expect(groups[1]!.options[0]!.held).toBe("From your class");
  });

  it("offers nothing for a class that states nothing", () => {
    expect(content().groupsFor!("equipment", asBuild({ klass: "bard" }))).toEqual([]);
  });
});

describe("cantrips, offered to the class that gets them", () => {
  /*
   * Unfiltered, a wizard was offered all 198 cantrips in the compendium —
   * Eldritch Blast and Druidcraft included. Every cantrip carries a class
   * list; nothing read it.
   */
  it("offers a wizard the wizard's cantrips and nobody else's", () => {
    const names = content().optionsFor("spells", ask({ klass: "wizard" })).map((o) => o.name);
    expect(names).toContain("Fire Bolt");
    expect(names).not.toContain("Eldritch Blast");
    expect(names).not.toContain("Druidcraft");
  });

  /* "wizard (school of invention (ua))" is a UA subclass's list, not the
     wizard's. Matching loosely hands a plain wizard Sacred Flame. */
  it("reads the bare class name, not a subclass that shares it", () => {
    const names = content().optionsFor("spells", ask({ klass: "wizard" })).map((o) => o.name);
    expect(names).not.toContain("Sacred Flame");
  });

  /* A screen with nothing on it is worse than a long one. */
  it("offers the lot for a class the compendium never names", () => {
    expect(content().optionsFor("spells", ask({ klass: "blood-hunter" }))).toHaveLength(4);
  });

  it("asks for the class's own number of cantrips, not the wizard's three", () => {
    expect(content().cantripsFor("wizard", 1)).toBe(3);
    expect(content().cantripsFor("sorcerer", 1)).toBe(4);
    expect(content().cantripsFor("bard", 1)).toBe(2);
    expect(content().cantripsFor("fighter", 1)).toBe(0);
  });

  it("hands over the class's own slot table", () => {
    expect(content().slotTableFor("bard")).toBeUndefined();
    expect(content({ classes: [{ ...BARD, slots: [[2], [3]] }, ROGUE] }).slotTableFor("bard"))
      .toEqual([[2], [3]]);
  });
});

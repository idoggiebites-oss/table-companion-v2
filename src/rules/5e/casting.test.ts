import { describe, it, expect } from "vitest";
import {
  cantripsKnown, castsCantrips, castsWith, slotsAt, topSpellLevel, slotsGained,
  spellsKnown, knowsSpells, learnedAt, spellsAtCreation, spellbook, prepares, preparedCount,
} from "./casting";
import { nextThreshold, xpForLevel, levelForXp } from "./progression";

/* A wizard's own table, as the compendium ships it. */
const WIZARD = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
const PALADIN = [[], [2], [3], [3], [4, 2]];

describe("cantrips known", () => {
  /* The builder offered everybody three, which is the wizard's number given
     to six other classes. */
  it("is the class's own number, not the wizard's", () => {
    expect(cantripsKnown("wizard", 1)).toBe(3);
    expect(cantripsKnown("sorcerer", 1)).toBe(4);
    expect(cantripsKnown("bard", 1)).toBe(2);
    expect(cantripsKnown("druid", 1)).toBe(2);
  });

  it("grows at the levels the table says", () => {
    expect(cantripsKnown("wizard", 3)).toBe(3);
    expect(cantripsKnown("wizard", 4)).toBe(4);
    expect(cantripsKnown("wizard", 9)).toBe(4);
    expect(cantripsKnown("wizard", 10)).toBe(5);
    expect(cantripsKnown("wizard", 20)).toBe(5);
  });

  it("offers none to a class that has none", () => {
    expect(cantripsKnown("fighter", 1)).toBe(0);
    expect(castsCantrips("fighter")).toBe(false);
    expect(castsCantrips("wizard")).toBe(true);
    // A homebrew class the app has never heard of is offered nothing.
    expect(castsCantrips("blood-hunter")).toBe(false);
  });

  it("does not fall off either end of the table", () => {
    expect(cantripsKnown("wizard", 0)).toBe(3);
    expect(cantripsKnown("wizard", 99)).toBe(5);
  });
});

describe("spell slots, read from the class's own table", () => {
  it("gives a wizard two at first level and four-and-two at third", () => {
    expect(slotsAt(WIZARD, 1)).toEqual([2]);
    expect(slotsAt(WIZARD, 3)).toEqual([4, 2]);
    expect(slotsAt(WIZARD, 20)).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  /* Empty at first level is not the same as never casting: a paladin's table
     is empty at one and not at two. */
  it("tells an empty row from a class with no table at all", () => {
    expect(slotsAt(PALADIN, 1)).toEqual([]);
    expect(slotsAt(PALADIN, 2)).toEqual([2]);
    expect(slotsAt(undefined, 5)).toEqual([]);
  });

  it("says how high they can reach", () => {
    expect(topSpellLevel(slotsAt(WIZARD, 1))).toBe(1);
    expect(topSpellLevel(slotsAt(WIZARD, 5))).toBe(3);
    expect(topSpellLevel(slotsAt(PALADIN, 1))).toBe(0);
  });
});

describe("what a level actually gained", () => {
  /*
   * The level-up card said "+5 hit points. No improvement. No path." for a
   * wizard reaching 3 — the level they gain second-level spells, which is the
   * largest thing that happens to a caster.
   */
  it("names a new spell level", () => {
    expect(slotsGained(WIZARD, 2, 3)).toEqual([
      { level: 1, had: 3, now: 4 },
      { level: 2, had: 0, now: 2 },
    ]);
  });

  it("names another slot at a level already held", () => {
    expect(slotsGained(WIZARD, 1, 2)).toEqual([{ level: 1, had: 2, now: 3 }]);
  });

  it("says nothing when nothing changed", () => {
    expect(slotsGained(WIZARD, 11, 12)).toEqual([]);
  });
});

describe("whose table it is", () => {
  /* A Fighter's table is the Eldritch Knight's; a plain fighter never casts.
     Handing every fighter two slots at third level because the class record
     carries a table is the quiet kind of wrong. */
  it("withholds a subclass's table from a class that does not cast", () => {
    expect(castsWith("fighter", null)).toBe(false);
    expect(castsWith("fighter", "champion")).toBe(false);
    expect(castsWith("fighter", "eldritch-knight")).toBe(true);
    expect(castsWith("rogue", "thief")).toBe(false);
    expect(castsWith("rogue", "arcane-trickster")).toBe(true);
  });

  it("gives a class that casts in its own right its own table", () => {
    expect(castsWith("wizard", null)).toBe(true);
    expect(castsWith("paladin", null)).toBe(true);
  });

  /* A homebrew caster the app has no rules for still shows what its data says. */
  it("trusts a class it has never heard of", () => {
    expect(castsWith("blood-hunter", null)).toBe(true);
  });
});

describe("what the next level costs", () => {
  /* The hub printed "0 / 300" at every level — wrong twice over: no
     experience is tracked anywhere, and 300 is the level-2 threshold, so a
     third-level character was told they were 300 from their next. */
  it("is the SRD advancement table, not a constant", () => {
    expect(nextThreshold(1)).toEqual({ next: 2, at: 300 });
    expect(nextThreshold(3)).toEqual({ next: 4, at: 2_700 });
    expect(nextThreshold(10)).toEqual({ next: 11, at: 85_000 });
  });

  it("has nothing to say at the top of the table", () => {
    expect(nextThreshold(20)).toBeNull();
    expect(xpForLevel(21)).toBeNull();
    expect(xpForLevel(1)).toBe(0);
  });

  it("reads a total back to a level", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(299)).toBe(1);
    expect(levelForXp(300)).toBe(2);
    expect(levelForXp(1_000_000)).toBe(20);
  });
});

describe("what a level newly teaches", () => {
  /* The level-up asked for hit points and an improvement and stopped. */
  it("counts the cantrips and spells a level adds", () => {
    expect(learnedAt("bard", 1, 2)).toEqual({ cantrips: 0, spells: 1 });
    expect(learnedAt("wizard", 3, 4)).toEqual({ cantrips: 1, spells: 0 });
    expect(learnedAt("sorcerer", 3, 4)).toEqual({ cantrips: 1, spells: 1 });
  });

  it("teaches nothing at a level that adds nothing", () => {
    expect(learnedAt("bard", 11, 12)).toEqual({ cantrips: 0, spells: 0 });
    expect(learnedAt("fighter", 1, 2)).toEqual({ cantrips: 0, spells: 0 });
  });

  /* A cleric, druid, paladin and wizard PREPARE from a list; only four
     classes know a fixed number. A wizard's spellbook is its own thing. */
  it("knows which classes know rather than prepare", () => {
    expect(knowsSpells("bard")).toBe(true);
    expect(knowsSpells("sorcerer")).toBe(true);
    expect(knowsSpells("wizard")).toBe(false);
    expect(knowsSpells("cleric")).toBe(false);
  });

  it("gives a ranger nothing at first level, which is right", () => {
    expect(spellsKnown("ranger", 1)).toBe(0);
    expect(spellsKnown("ranger", 2)).toBe(2);
  });
});

describe("how many spells a character chooses when they are made", () => {
  /*
   * The gap that made the two doors disagree: a bard created at 1 knew no
   * spells, while a bard GROWN to 2 knew one. Creation asked for cantrips
   * and stopped.
   */
  it("asks a knower for the number they know", () => {
    expect(spellsAtCreation("bard", 1)).toBe(4);
    expect(spellsAtCreation("sorcerer", 1)).toBe(2);
    expect(spellsAtCreation("warlock", 1)).toBe(2);
    // A ranger knows none until second level, which is right.
    expect(spellsAtCreation("ranger", 1)).toBe(0);
    expect(spellsAtCreation("ranger", 2)).toBe(2);
  });

  /* A wizard writes six into a book, and two more at every level after. */
  it("gives a wizard a spellbook rather than a number known", () => {
    expect(spellsAtCreation("wizard", 1)).toBe(6);
    expect(spellbook("wizard", 3)).toBe(10);
    expect(spellbook("bard", 3)).toBe(0);
    expect(knowsSpells("wizard")).toBe(false);
  });

  /* A cleric prepares from the entire list every dawn. Asking them to pick
     at creation would be inventing a rule. */
  it("asks a preparer for nothing at all", () => {
    expect(spellsAtCreation("cleric", 1)).toBe(0);
    expect(spellsAtCreation("druid", 5)).toBe(0);
    expect(prepares("cleric")).toBe(true);
    expect(prepares("bard")).toBe(false);
    expect(prepares("fighter")).toBe(false);
  });

  it("counts what a preparer has ready, never below one", () => {
    expect(preparedCount(3, 5)).toBe(8);
    expect(preparedCount(-1, 1)).toBe(1);
  });

  it("asks a non-caster for nothing", () => {
    expect(spellsAtCreation("fighter", 5)).toBe(0);
  });
});

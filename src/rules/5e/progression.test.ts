import { describe, it, expect } from "vitest";
import {
  asiLevels, grantsAt, grantsBetween, averageHp, owes,
  xpForLevel, levelForXp, nextThreshold, MAX_LEVEL,
} from "./progression";

/*
 * grantsAt/asiLevels/xpForLevel/levelForXp/nextThreshold are already exercised
 * indirectly through their callers in casting.test.ts and
 * features/progression/model.test.ts. This file is the dedicated one for
 * progression.ts, and it leans on what neither of those touches:
 * grantsBetween (nothing else calls it), owes (nothing else calls it either —
 * features/progression/model.ts reimplements the same `!== "hp"` check
 * inline instead), and averageHp / MAX_LEVEL in isolation.
 */

describe("one level's grants", () => {
  it("always includes hit points, at the class's own die", () => {
    expect(grantsAt("wizard", 5)).toContainEqual({ kind: "hp", klass: "wizard", level: 5, die: 6 });
    expect(grantsAt("barbarian", 5)).toContainEqual({ kind: "hp", klass: "barbarian", level: 5, die: 12 });
  });

  it("is read against the level IN THIS CLASS, not the character's total", () => {
    // The module header names this exactly: a fighter 5 / wizard 1 gets the
    // wizard's FIRST-level grants (a subclass, for a cleric/sorcerer/wizard —
    // here just hp, since wizard picks its subclass at 2), not its sixth.
    expect(grantsAt("wizard", 1).map((g) => g.kind)).toEqual(["hp"]);
    expect(grantsAt("wizard", 2).map((g) => g.kind)).toContain("subclass");
  });

  it("grants a subclass choice only at the class's own level for it", () => {
    expect(grantsAt("cleric", 1).map((g) => g.kind)).toContain("subclass");
    expect(grantsAt("fighter", 3).map((g) => g.kind)).toContain("subclass");
    expect(grantsAt("fighter", 2).map((g) => g.kind)).not.toContain("subclass");
  });

  it("grants an ASI only at the levels asiLevels names for that class", () => {
    for (const l of asiLevels("rogue")) expect(grantsAt("rogue", l).map((g) => g.kind)).toContain("asi");
    expect(grantsAt("rogue", 5).map((g) => g.kind)).not.toContain("asi");
  });
});

describe("grants across a span of levels", () => {
  it("is empty for no advance at all", () => {
    expect(grantsBetween("fighter", 5, 5)).toEqual([]);
  });

  it("concatenates each level's own grants, in level order", () => {
    // Fighter 1→3 covers levels 2 and 3 (1 is already held): hp at 2,
    // then hp + subclass at 3.
    const g = grantsBetween("fighter", 1, 3);
    expect(g.map((x) => x.level)).toEqual([2, 3, 3]);
    expect(g.map((x) => x.kind)).toEqual(["hp", "hp", "subclass"]);
  });

  it("crosses an ASI level in the middle of the span", () => {
    // Wizard 2→5 covers levels 3, 4 and 5; level 4 is every class's ASI.
    const kinds = grantsBetween("wizard", 2, 5).map((g) => g.kind);
    expect(kinds).toEqual(["hp", "hp", "asi", "hp"]);
  });

  it("never grants the level already held", () => {
    // from is exclusive: going from 3 to 4 grants only level 4, not level 3
    // again — the levels already paid for cannot be re-asked.
    expect(grantsBetween("fighter", 3, 4)).toEqual(grantsAt("fighter", 4));
  });
});

describe("hit points for a level after the first", () => {
  /* PHB average-rounding, floor(die/2)+1 — the level-1 die itself is not a
     choice and is granted whole by grantsAt, never through this. */
  it("rounds the average up, per die size", () => {
    expect(averageHp(6)).toBe(4);
    expect(averageHp(8)).toBe(5);
    expect(averageHp(10)).toBe(6);
    expect(averageHp(12)).toBe(7);
  });
});

describe("what a level owes an answer for", () => {
  it("hit points owe nothing — there is no choice to make", () => {
    expect(owes({ kind: "hp", klass: "wizard", level: 5, die: 6 })).toBe(false);
  });

  it("an ASI and a subclass both owe an answer", () => {
    expect(owes({ kind: "asi", klass: "fighter", level: 4 })).toBe(true);
    expect(owes({ kind: "subclass", klass: "cleric", level: 1 })).toBe(true);
  });
});

describe("the SRD advancement table", () => {
  it("has twenty levels, and MAX_LEVEL is read off its length, not hardcoded twice", () => {
    expect(MAX_LEVEL).toBe(20);
    expect(xpForLevel(20)).not.toBeNull();
    expect(xpForLevel(21)).toBeNull();
  });

  it("agrees with itself: xpForLevel and levelForXp are inverses at the threshold", () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const at = xpForLevel(level)!;
      expect(levelForXp(at)).toBe(level);
    }
  });

  it("one xp short of a threshold is still the level below", () => {
    expect(levelForXp(xpForLevel(5)! - 1)).toBe(4);
  });

  it("nextThreshold reports the level actually being climbed to", () => {
    for (let level = 1; level < MAX_LEVEL; level++) {
      expect(nextThreshold(level)).toEqual({ next: level + 1, at: xpForLevel(level + 1) });
    }
    expect(nextThreshold(MAX_LEVEL)).toBeNull();
  });
});

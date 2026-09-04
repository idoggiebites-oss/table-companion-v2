import { describe, it, expect } from "vitest";
import {
  bandFor, budgetFor, describeTotals, encounterMultiplier, thresholdsForLevel, totalsFor,
} from "./encounter";

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const RUNGS = ["easy", "medium", "hard", "deadly"] as const;

describe("the transcribed table", () => {
  /*
   * V1's caveat, and the reason these exist: "these numbers are transcribed,
   * and a wrong digit in a threshold table is invisible — it just quietly
   * mis-rates every fight." None of this checks the numbers against the book;
   * it checks the SHAPE the book's numbers must have, which is what a
   * transposed or dropped digit breaks.
   */
  it("rises with level, on every rung", () => {
    for (const rung of RUNGS) {
      for (const level of LEVELS.slice(1)) {
        const here = thresholdsForLevel(level)[rung];
        const below = thresholdsForLevel(level - 1)[rung];
        expect(here, `${rung} at level ${String(level)}`).toBeGreaterThan(below);
      }
    }
  });

  it("keeps easy < medium < hard < deadly at every level", () => {
    for (const level of LEVELS) {
      const t = thresholdsForLevel(level);
      expect(t.easy, `level ${String(level)}`).toBeLessThan(t.medium);
      expect(t.medium, `level ${String(level)}`).toBeLessThan(t.hard);
      expect(t.hard, `level ${String(level)}`).toBeLessThan(t.deadly);
    }
  });

  it("holds levels outside 1-20 to the ends rather than crashing", () => {
    expect(thresholdsForLevel(0)).toEqual(thresholdsForLevel(1));
    expect(thresholdsForLevel(99)).toEqual(thresholdsForLevel(20));
  });

  it("never lets the multiplier fall as creatures are added", () => {
    /* Six weak things are more dangerous than one worth the same experience,
       so this only ever climbs. */
    for (let n = 1; n <= 20; n++) {
      expect(encounterMultiplier(n), `at ${String(n)}`)
        .toBeGreaterThanOrEqual(encounterMultiplier(n - 1));
    }
    expect(encounterMultiplier(0)).toBe(0);
  });
});

describe("the budget comes from the party, not from typing", () => {
  it("sums across the characters the app already holds", () => {
    const one = thresholdsForLevel(3);
    expect(budgetFor([3, 3, 3, 3])?.medium).toBe(one.medium * 4);
  });

  it("is null for nobody, rather than zero", () => {
    /* A zero budget would rate every fight deadly, which is worse than
       declining to rate it. */
    expect(budgetFor([])).toBeNull();
  });
});

describe("danger, and the award, are different numbers", () => {
  it("judges the band on the ADJUSTED total", () => {
    /* Four goblins at 50 each is 200 raw, but four creatures multiply by 2 —
       so 400 against a level-1 party, which is deadly rather than medium.
       Getting this backwards is the whole point of the warning. */
    const t = totalsFor({ creatures: 4, rawXp: 200 }, [1, 1, 1, 1]);
    expect(t.adjustedXp).toBe(400);
    expect(t.band).toBe(bandFor(400, budgetFor([1, 1, 1, 1])!));
    expect(t.band).not.toBe(bandFor(t.rawXp, budgetFor([1, 1, 1, 1])!));
  });

  it("awards the RAW total, never the adjusted one", () => {
    const t = totalsFor({ creatures: 4, rawXp: 200 }, [1, 1, 1, 1]);
    expect(t.rawXp).toBe(200);
    expect(t.perCharacter).toBe(50);
  });
});

describe("the licensing exit", () => {
  it("computes everything except the band when there is no party", () => {
    /*
     * Deleting `non-srd.ts` leaves exactly this shape: the arithmetic stands
     * and only the verdict goes. If the band were required rather than
     * nullable the file could not be deleted, which is the whole arrangement.
     */
    const t = totalsFor({ creatures: 3, rawXp: 300 });
    expect(t.band).toBeNull();
    expect(t.rawXp).toBe(300);
    expect(t.adjustedXp).toBe(600);
    expect(t.multiplier).toBe(2);
    expect(describeTotals(t, null)).toBe("300 × 2 = 600 XP");
  });
});

describe("showing the working", () => {
  it("names every number that produced the verdict", () => {
    const levels = [3, 3, 3];
    const t = totalsFor({ creatures: 5, rawXp: 500 }, levels);
    const said = describeTotals(t, budgetFor(levels));
    expect(said).toContain("500 × 2 = 1000 XP");
    expect(said).toContain(t.band!);
  });

  it("does not print a multiplication that did not happen", () => {
    /* One creature multiplies by one; "450 × 1 = 450" is noise. */
    expect(describeTotals(totalsFor({ creatures: 1, rawXp: 450 }), null)).toBe("450 XP");
  });
});

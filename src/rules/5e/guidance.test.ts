import { describe, it, expect } from "vitest";
import { ABILITIES, ABILITY_DOES, ABILITY_NAME } from "./abilities";
import { CLASS_BLURB, CLASS_RULES, facetsOf } from "./classes";

/*
 * Plain words for the two questions a builder cannot answer with numbers.
 *
 * These are assertions about AUTHORED prose, which is unusual and is the
 * point: the risk here is not a wrong calculation, it is a confident sentence
 * about a class this app knows nothing about.
 */

describe("what a score does", () => {
  it("says something about every one of the six", () => {
    for (const a of ABILITIES) {
      expect(ABILITY_DOES[a].length).toBeGreaterThan(20);
      expect(ABILITY_DOES[a].endsWith(".")).toBe(true);
    }
  });

  it("names what a table says out loud, not the rules' categories", () => {
    /* Nobody asks which ability governs a check. They ask what happens if
       this number is low, and the answer is a list of things they recognise. */
    expect(ABILITY_DOES.con).toContain("Hit points");
    expect(ABILITY_DOES.dex).toContain("Armour class");
    expect(ABILITY_DOES.str).toContain("Athletics");
  });

  it("does not restate the ability's own name back at you", () => {
    for (const a of ABILITIES) {
      expect(ABILITY_DOES[a].toLowerCase()).not.toContain(ABILITY_NAME[a].toLowerCase());
    }
  });
});

describe("what a class is like", () => {
  it("has a sentence for every class this app ships rules for", () => {
    /* `CLASS_RULES` is the definition of shipped: the twelve whose hit die and
       subclass level this app states. Each of those gets a sentence. */
    for (const id of Object.keys(CLASS_RULES)) {
      expect(CLASS_BLURB[id]?.sentence, id).toBeDefined();
    }
  });

  it("and none for one it does not", () => {
    /*
     * The artificer has tags and an icon and NO sentence, deliberately —
     * V1 does the same. It is not among the twelve above, and a confident line
     * about how it plays would be invention. Absent is honest; wrong is not.
     */
    expect(CLASS_BLURB["artificer"]).toBeDefined();
    expect(CLASS_BLURB["artificer"]?.sentence).toBeUndefined();
    expect(facetsOf("artificer").says).toBeUndefined();
  });

  it("says nothing at all about a class it has never heard of", () => {
    /* A compendium brings fifty-five more. This is the whole acceptance
       criterion: the row carries no sentence rather than an invented one. */
    expect(facetsOf("bloodhunter")).toEqual({});
    expect(facetsOf("")).toEqual({});
  });

  it("rates bookkeeping across the range, and rates the simple ones simple", () => {
    /* Bookkeeping, not power. A wizard has no more rules than a fighter; it
       has three hundred more decisions. */
    expect(CLASS_BLURB["fighter"]?.complexity).toBe(1);
    expect(CLASS_BLURB["barbarian"]?.complexity).toBe(1);
    expect(CLASS_BLURB["wizard"]?.complexity).toBe(5);
    for (const b of Object.values(CLASS_BLURB)) {
      expect(b.complexity).toBeGreaterThanOrEqual(1);
      expect(b.complexity).toBeLessThanOrEqual(5);
    }
  });

  it("keeps every sentence short enough to be read while choosing", () => {
    /* A paragraph at this moment is a paragraph nobody reads — the point is
       to answer "what is this like" between two taps. */
    for (const [id, b] of Object.entries(CLASS_BLURB)) {
      if (b.sentence === undefined) continue;
      expect(b.sentence.length, id).toBeLessThanOrEqual(100);
      expect(b.sentence.endsWith("."), id).toBe(true);
    }
  });

  it("hands the row its role and tags from the same place as its sentence", () => {
    /* One table. This list held a second copy of the roles and tags, so a
       sentence added here would have gone missing from the no-compendium
       fallback — which is the worst place to lose it. */
    const f = facetsOf("wizard");
    expect(f.role).toBe(CLASS_BLURB["wizard"]?.role);
    expect(f.tags).toEqual(CLASS_BLURB["wizard"]?.tags);
    expect(f.says).toBe(CLASS_BLURB["wizard"]?.sentence);
    expect(f.bookkeeping).toBe(CLASS_BLURB["wizard"]?.complexity);
  });
});

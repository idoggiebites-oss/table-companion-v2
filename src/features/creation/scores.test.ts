import { describe, it, expect } from "vitest";
import { Clock } from "../../core/log";
import { asDevice } from "../../core/types";
import { buildFrom, CHOICE, type Choice } from "./model";
import { scoresOf, featsOf, slotsOf, pactOf } from "./scores";
import { EMPTY } from "./model";

describe("improvements and hit dice, from both doors", () => {
  const at = (...cs: Choice[]) => {
    const c = new Clock(asDevice("d"));
    return buildFrom(cs.map((x) => c.issue(CHOICE, x as unknown as Record<string, unknown>)));
  };
  const SCORES = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };

  /*
   * A Fighter created at 8 has passed 4, 6 and 8. V1 hit this and fixed it —
   * "the builder was stating the points owed and giving nowhere to spend
   * them" — and V2 reintroduced it by not asking at all.
   */
  it("spends the improvements a character joining above level one has passed", () => {
    const b = at(
      { step: "ancestry", race: "human" },
      { step: "class", klass: "fighter" },
      { step: "abilities", method: "point-buy", scores: SCORES },
      { step: "level", level: 8 },
      { step: "improvements", improvements: [
        { abilities: ["str", "str"] }, { abilities: ["con", "con"] }, { feat: "alert", name: "Alert" },
      ] },
    );
    expect(scoresOf(b).str).toBe(17);
    expect(scoresOf(b).con).toBe(15);
    expect(featsOf(b)).toEqual(["Alert"]);
  });

  it("leaves the assigned scores alone — the arithmetic is derived", () => {
    const b = at(
      { step: "abilities", method: "point-buy", scores: SCORES },
      { step: "improvements", improvements: [{ abilities: ["str", "str"] }] },
    );
    expect(b.scores.str).toBe(15);
    expect(scoresOf(b).str).toBe(17);
  });

  it("stops at twenty, which is where a point stops being worth taking", () => {
    const b = at(
      { step: "abilities", method: "point-buy", scores: { ...SCORES, str: 15 } },
      { step: "ancestry", race: "half-orc", bonuses: { str: 2 } },
      { step: "improvements", improvements: [{ abilities: ["str", "str"] }, { abilities: ["str", "str"] }] },
    );
    // 15 + 2 racial = 17, then four points would be 21.
    expect(scoresOf(b).str).toBe(20);
  });

  /* Re-answerable: going back and choosing again replaces, never appends. */
  it("replaces the answer rather than stacking a second one", () => {
    const b = at(
      { step: "abilities", method: "point-buy", scores: SCORES },
      { step: "improvements", improvements: [{ abilities: ["str", "str"] }] },
      { step: "improvements", improvements: [{ abilities: ["dex", "dex"] }] },
    );
    expect(scoresOf(b).str).toBe(15);
    expect(scoresOf(b).dex).toBe(16);
  });

  /* Allocation re-takes every level; the rolls it synthesises must not pile up. */
  it("does not grow the hit-point list when a level is re-answered", () => {
    const b = at(
      { step: "class", klass: "fighter" },
      { step: "level", level: 5 },
      { step: "level", level: 5 },
      { step: "level", level: 3 },
    );
    // Two, not three: the first level takes the whole die and is never thrown.
    expect(b.hp).toHaveLength(2);
  });
});

describe("what the ancestry left to the player", () => {
  const at = (...cs: Choice[]) => {
    const c = new Clock(asDevice("d"));
    return buildFrom(cs.map((x) => c.issue(CHOICE, x as unknown as Record<string, unknown>)));
  };
  const SCORES = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };

  /*
   * A Half-Elf gets +2 Charisma and two points of their own. V2 applied the
   * fixed half and dropped the rest, arriving two points short of the book —
   * which is V1's own note about V1's own bug.
   */
  it("places the points the ancestry did not decide", () => {
    const b = at(
      { step: "ancestry", race: "half-elf", bonuses: { cha: 2 } },
      { step: "abilities", method: "point-buy", scores: SCORES },
      { step: "heritage", heritage: { abilities: { str: 1, dex: 1 }, skills: [], feat: null } },
    );
    expect(scoresOf(b).cha).toBe(10);
    expect(scoresOf(b).str).toBe(16);
    expect(scoresOf(b).dex).toBe(15);
  });

  /* A Variant Human's fixed half is `{}` — they arrived with nothing at all. */
  it("is the whole grant for an ancestry that decides nothing", () => {
    const b = at(
      { step: "ancestry", race: "human-variant", bonuses: {} },
      { step: "abilities", method: "point-buy", scores: SCORES },
      { step: "heritage", heritage: { abilities: { con: 1, wis: 1 }, skills: ["perception"], feat: "Alert" } },
    );
    expect(scoresOf(b).con).toBe(14);
    expect(featsOf(b)).toEqual(["Alert"]);
  });

  /* Both points on one ability is legal, and common. */
  it("lets both points land on the same ability", () => {
    const b = at(
      { step: "abilities", method: "point-buy", scores: SCORES },
      { step: "heritage", heritage: { abilities: { str: 2 }, skills: [], feat: null } },
    );
    expect(scoresOf(b).str).toBe(17);
  });

  it("drops what the old ancestry left open when the ancestry changes", () => {
    const b = at(
      { step: "abilities", method: "point-buy", scores: SCORES },
      { step: "heritage", heritage: { abilities: { str: 2 }, skills: ["stealth"], feat: "Alert" } },
      { step: "ancestry", race: "dwarf", bonuses: { con: 2 } },
    );
    expect(scoresOf(b).str).toBe(15);
    expect(featsOf(b)).toEqual([]);
    expect(b.heritage.skills).toEqual([]);
  });
});

describe("spell slots, when there is more than one class", () => {
  const caster = (classes: { id: string; level: number; subclass?: string | null }[], tables: Record<string, number[][]> = {}) => ({
    ...EMPTY,
    classes: classes.map((c) => ({ id: c.id, level: c.level, subclass: c.subclass ?? null })),
    level: classes.reduce((n, c) => n + c.level, 0),
    slots: tables,
  });
  const WIZARD = [[2], [3], [4, 2], [4, 3], [4, 3, 2]];

  it("reads one class's own table", () => {
    expect(slotsOf(caster([{ id: "wizard", level: 3 }], { wizard: WIZARD }))).toEqual([4, 2]);
  });

  /*
   * A Cleric 3 / Wizard 3 has the slots of a SIXTH-level caster while knowing
   * only second-level spells. V2 showed them per class and called the
   * combined table "not derived here" — it is derivable, and V1 derived it.
   */
  it("reads the combined table for more than one", () => {
    expect(slotsOf(caster([{ id: "cleric", level: 3 }, { id: "wizard", level: 3 }])))
      .toEqual([4, 3, 3]);
  });

  it("gives a party of non-casters nothing", () => {
    expect(slotsOf(caster([{ id: "fighter", level: 5 }, { id: "barbarian", level: 3 }]))).toEqual([]);
  });

  /* Pact magic is its own track, and never joins that sum. */
  it("keeps a warlock's slots apart", () => {
    const mix = caster([{ id: "warlock", level: 3 }, { id: "wizard", level: 3 }]);
    expect(slotsOf(mix)).toEqual([4, 2]);
    expect(pactOf(mix)).toEqual({ count: 2, level: 2 });
    expect(pactOf(caster([{ id: "wizard", level: 5 }]))).toBeNull();
  });
});

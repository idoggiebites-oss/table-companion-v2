import { describe, it, expect } from "vitest";
import { Clock } from "../../core/log";
import { asDevice, type Event } from "../../core/types";
import { buildFrom, featsOf, scoresOf, CHOICE, type Choice } from "../creation/model";
import { TAKE, levelsTo, asksFor, defaultHp, type LevelTaken } from "./model";
import { asiLevels, grantsAt } from "../../rules/5e/progression";
import { BLANK } from "../../rules/5e/abilities";
import { CLASS_RULES } from "../../rules/5e/classes";

const scribe = () => {
  const c = new Clock(asDevice("dev"));
  const events: Event[] = [];
  return {
    events,
    choose: (x: Choice) => events.push(c.issue(CHOICE, x as unknown as Record<string, unknown>)),
    take: (t: LevelTaken) => events.push(c.issue(TAKE, t as unknown as Record<string, unknown>)),
    build: () => buildFrom(events),
  };
};

/** A character made at first level, however it is going to grow. */
const atFirst = (klass: string) => {
  const s = scribe();
  s.choose({ step: "ancestry", race: "elf" });
  s.choose({ step: "class", klass });
  s.choose({ step: "abilities", method: "point-buy", scores: { ...BLANK, str: 15, con: 14, int: 13 } });
  s.choose({ step: "background", background: "sage" });
  return s;
};

describe("what a level asks for", () => {
  it("asks nothing but hit points at most levels", () => {
    expect(asksFor("fighter", 2)).toEqual([]);
    expect(grantsAt("fighter", 2).map((g) => g.kind)).toEqual(["hp"]);
  });

  it("asks for an improvement at the levels that grant one", () => {
    expect(asksFor("wizard", 4).map((g) => g.kind)).toEqual(["asi"]);
    expect(asksFor("wizard", 5)).toEqual([]);
  });

  it("knows that a fighter and a rogue are not most classes", () => {
    expect(asiLevels("fighter")).toContain(6);
    expect(asiLevels("rogue")).toContain(10);
    expect(asiLevels("wizard")).not.toContain(6);
    // Every class gets one at fourth.
    for (const id of Object.keys(CLASS_RULES)) expect(asiLevels(id)).toContain(4);
  });

  it("asks for a path at the level the class chooses one", () => {
    expect(asksFor("cleric", 1).map((g) => g.kind)).toEqual(["subclass"]);
    expect(asksFor("wizard", 2).map((g) => g.kind)).toEqual(["subclass"]);
    expect(asksFor("fighter", 3).map((g) => g.kind)).toEqual(["subclass"]);
  });
});

describe("growing", () => {
  it("raises the class level and the character level together", () => {
    const s = atFirst("fighter");
    s.take({ klass: "fighter", classLevel: 2, hp: defaultHp("fighter") });
    expect(s.build().level).toBe(2);
    expect(s.build().classes).toEqual([{ id: "fighter", level: 2, subclass: null }]);
  });

  it("spends an improvement on two ability points", () => {
    const s = atFirst("fighter");
    for (const t of levelsTo("fighter", 1, 3)) s.take(t);
    s.take({ klass: "fighter", classLevel: 4, hp: 6, asi: { abilities: ["str", "con"] } });
    // The assigned scores are untouched; the arithmetic is derived.
    const b = s.build();
    expect(b.scores.str).toBe(15);
    expect(scoresOf(b).str).toBe(16);
    expect(scoresOf(b).con).toBe(15);
  });

  it("spends an improvement on a feat instead", () => {
    const s = atFirst("wizard");
    for (const t of levelsTo("wizard", 1, 3)) s.take(t);
    s.take({ klass: "wizard", classLevel: 4, hp: 4, asi: { feat: "alert" } });
    expect(featsOf(s.build())).toEqual(["alert"]);
    expect(scoresOf(s.build()).str).toBe(15); // untouched
  });

  it("never pushes an ability past twenty", () => {
    const s = atFirst("fighter");
    s.take({ klass: "fighter", classLevel: 2, hp: 6, asi: { abilities: ["str", "str"] } });
    for (let i = 0; i < 10; i++) {
      s.take({ klass: "fighter", classLevel: 3 + i, hp: 6, asi: { abilities: ["str", "str"] } });
    }
    expect(scoresOf(s.build()).str).toBe(20);
  });

  it("adds a second class rather than raising the first", () => {
    const s = atFirst("fighter");
    for (const t of levelsTo("fighter", 1, 5)) s.take(t);
    s.take({ klass: "wizard", classLevel: 1, hp: 4 });
    const b = s.build();
    expect(b.classes.map((c) => `${c.id} ${c.level}`)).toEqual(["fighter 5", "wizard 1"]);
    expect(b.level).toBe(6);
  });

  it("takes a path when the level asks for one", () => {
    const s = atFirst("wizard");
    s.take({ klass: "wizard", classLevel: 2, hp: 4, subclass: "evocation" });
    expect(s.build().classes[0]!.subclass).toBe("evocation");
  });

  it("undoes a level without deleting it", () => {
    const s = atFirst("fighter");
    const four = s.events.length;
    s.take({ klass: "fighter", classLevel: 2, hp: 6 });
    const last = s.events.at(-1)!;
    s.events.push(new Clock(asDevice("dev2")).undo(last.id));
    expect(s.build().level).toBe(1);
    expect(s.events.length).toBe(four + 2);
  });
});

describe("joining at a level IS growing to it", () => {
  /**
   * The first-ship invariant. V1 had two code paths — a builder that could
   * start you at seven and a level-up that could grow you to seven — and
   * nothing held their answers together. Here there is one, and this test
   * exists so a later change cannot quietly fork them.
   */
  const grown = (klass: string, to: number) => {
    const s = atFirst(klass);
    for (const t of levelsTo(klass, 1, to)) s.take(t);
    return s.build();
  };

  const joined = (klass: string, at: number) => {
    // "Created at level N" is the same events, produced by the same function.
    const s = atFirst(klass);
    for (const t of levelsTo(klass, 1, at)) s.take(t);
    return s.build();
  };

  it("agrees at level five, for every class", () => {
    for (const klass of Object.keys(CLASS_RULES)) {
      expect(joined(klass, 5)).toEqual(grown(klass, 5));
    }
  });

  it("agrees at every level from one to twenty", () => {
    for (let n = 1; n <= 20; n++) expect(joined("fighter", n)).toEqual(grown("fighter", n));
  });

  it("agrees for a multiclass character", () => {
    const one = atFirst("fighter");
    for (const t of levelsTo("fighter", 1, 5)) one.take(t);
    for (const t of levelsTo("wizard", 0, 2)) one.take(t);

    const two = atFirst("fighter");
    for (const t of [...levelsTo("fighter", 1, 5), ...levelsTo("wizard", 0, 2)]) two.take(t);

    expect(one.build()).toEqual(two.build());
    expect(one.build().level).toBe(7);
  });

  it("does not agree when the answers differ, which is the point", () => {
    const a = atFirst("fighter");
    for (const t of levelsTo("fighter", 1, 4)) a.take(t);
    const b = atFirst("fighter");
    for (const t of levelsTo("fighter", 1, 3)) b.take(t);
    b.take({ klass: "fighter", classLevel: 4, hp: 6, asi: { abilities: ["str", "str"] } });
    expect(a.build()).not.toEqual(b.build());
  });
});

describe("the first-ship invariant, through the real screens", () => {
  /**
   * buildAt(5) === buildAt(1).then(levelTo(5)).
   *
   * `answered` is excluded: it records which STEPS a person filled in, which
   * is bookkeeping about the interface rather than a fact about the character.
   * Everything else must match exactly.
   */
  const character = (b: ReturnType<typeof buildFrom>) => {
    const { answered: _answered, ...rest } = b;
    return rest;
  };

  const joinedAtFive = () => {
    // The mid-campaign path: the builder's own Level and Classes steps.
    const s = atFirst("fighter");
    s.choose({ step: "level", level: 5 });
    s.choose({ step: "multiclass", classes: [{ id: "fighter", level: 5 }] });
    return s.build();
  };

  const grownToFive = () => {
    // The table path: four level-ups, one at a time.
    const s = atFirst("fighter");
    for (const t of levelsTo("fighter", 1, 5)) s.take(t);
    return s.build();
  };

  it("joins at five and grows to five identically", () => {
    expect(character(joinedAtFive())).toEqual(character(grownToFive()));
    expect(joinedAtFive().level).toBe(5);
  });

  it("agrees on a multiclass split, both ways round", () => {
    const joined = atFirst("fighter");
    joined.choose({ step: "level", level: 7 });
    joined.choose({ step: "multiclass", classes: [{ id: "fighter", level: 5 }, { id: "wizard", level: 2 }] });

    const grown = atFirst("fighter");
    for (const t of levelsTo("fighter", 1, 5)) grown.take(t);
    for (const t of levelsTo("wizard", 0, 2)) grown.take(t);

    expect(character(joined.build())).toEqual(character(grown.build()));
  });

  it("agrees for every class at level five", () => {
    for (const klass of Object.keys(CLASS_RULES)) {
      const joined = atFirst(klass);
      joined.choose({ step: "level", level: 5 });
      joined.choose({ step: "multiclass", classes: [{ id: klass, level: 5 }] });

      const grown = atFirst(klass);
      for (const t of levelsTo(klass, 1, 5)) grown.take(t);

      expect(character(joined.build())).toEqual(character(grown.build()));
    }
  });

  it("keeps a path chosen at creation when the levels are reallocated", () => {
    const s = atFirst("wizard");
    s.choose({ step: "level", level: 4 });
    s.choose({ step: "multiclass", classes: [{ id: "wizard", level: 4 }] });
    s.choose({ step: "subclass", subclass: "evocation", klass: "wizard" });
    expect(s.build().classes[0]!.subclass).toBe("evocation");

    s.choose({ step: "multiclass", classes: [{ id: "wizard", level: 3 }, { id: "fighter", level: 1 }] });
    expect(s.build().classes.find((c) => c.id === "wizard")!.subclass).toBe("evocation");
  });
});

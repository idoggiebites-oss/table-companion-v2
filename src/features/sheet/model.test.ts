import { describe, it, expect } from "vitest";
import { Clock } from "../../core/log";
import { asDevice, type Event } from "../../core/types";
import { vitalsFrom, diceLeft, startingVitals, VITAL, type Vital } from "./model";
import { EMPTY, type Build } from "../creation/model";
import type { Attack } from "../../rules/5e/attack";
import { BLANK } from "../../rules/5e/abilities";

const build = (over: Partial<Build> = {}): Build => ({
  ...EMPTY,
  classes: [{ id: "fighter", level: 5, subclass: null }],
  level: 5,
  scores: { ...BLANK, con: 14 },
  ...over,
});

const sheet = (b: Build = build()) => {
  const c = new Clock(asDevice("dev"));
  const events: Event[] = [];
  const act = (a: Vital) => {
    const e = c.issue(VITAL, { ...(a as unknown as Record<string, unknown>), character: "me" });
    events.push(e);
    return e;
  };
  return { c, events, act, now: () => vitalsFrom(events, "me", b) };
};

describe("the sheet is the log, like everything else", () => {
  it("starts at full hit points derived from the build", () => {
    // Fighter 5, CON 14: 12 + 8 + 8 + 8 + 8 = 44.
    expect(startingVitals(build()).health.max).toBe(44);
    expect(sheet().now().health.hp).toBe(44);
  });

  it("takes damage and gives it back", () => {
    const s = sheet();
    s.act({ act: "damage", n: 12 });
    expect(s.now().health.hp).toBe(32);
    s.act({ act: "heal", n: 5 });
    expect(s.now().health.hp).toBe(37);
  });

  it("undoes a hit without deleting it", () => {
    const s = sheet();
    const hit = s.act({ act: "damage", n: 12 });
    s.act({ act: "damage", n: 3 });
    s.events.push(s.c.undo(hit.id));
    expect(s.now().health.hp).toBe(41); // only the 3 landed
    expect(s.events).toHaveLength(3);
  });

  it("drops concentration when a character falls", () => {
    const s = sheet();
    s.act({ act: "concentrate", spell: "Bless" });
    s.act({ act: "damage", n: 60 });
    expect(s.now().health.dying).toBe(true);
    expect(s.now().concentrating).toBeNull();
  });

  it("counts damage taken while down as a failed death save", () => {
    const s = sheet();
    s.act({ act: "damage", n: 44 });
    expect(s.now().health.dying).toBe(true);
    s.act({ act: "damage", n: 2 });
    expect(s.now().deaths.failures).toBe(1);
  });

  it("forgets the death saves the moment healing lands", () => {
    const s = sheet();
    s.act({ act: "damage", n: 44 });
    s.act({ act: "death", result: "failure" });
    s.act({ act: "death", result: "failure" });
    expect(s.now().deaths.failures).toBe(2);
    s.act({ act: "heal", n: 1 });
    expect(s.now().deaths.failures).toBe(0);
  });
});

describe("hit dice and rests", () => {
  it("keeps the dice apart by class", () => {
    const b = build({ classes: [{ id: "fighter", level: 5, subclass: null }, { id: "wizard", level: 2, subclass: null }] });
    expect(diceLeft(b, startingVitals(b))).toEqual([
      { die: 10, left: 5, total: 5 },
      { die: 6, left: 2, total: 2 },
    ]);
  });

  it("spends a die and heals by what was thrown", () => {
    const s = sheet();
    s.act({ act: "damage", n: 20 });
    s.act({ act: "hitdie", die: 10, rolled: 7 });
    expect(s.now().health.hp).toBe(31);
    expect(diceLeft(build(), s.now())[0]).toEqual({ die: 10, left: 4, total: 5 });
  });

  it("gives back half your TOTAL dice on a long rest, not half of what you spent", () => {
    /*
     * The rule is a budget against the whole pool — "up to half your total,
     * minimum one" — and this halved what had been SPENT, which is a different
     * sum. It was wrong in both directions: a fighter who spent all five got
     * three back where the rule gives two, and one who spent three of ten got
     * two back where the rule gives all three.
     */
    const s = sheet();
    for (let i = 0; i < 5; i++) s.act({ act: "hitdie", die: 10, rolled: 1 });
    expect(diceLeft(build(), s.now())[0]!.left).toBe(0);
    s.act({ act: "rest", length: "long" });
    expect(diceLeft(build(), s.now())[0]!.left).toBe(2);
  });

  it("gives back everything spent when the budget covers it", () => {
    const b = build({ classes: [{ id: "fighter", level: 10, subclass: null }], level: 10 });
    const s = sheet(b);
    for (let i = 0; i < 3; i++) s.act({ act: "hitdie", die: 10, rolled: 1 });
    s.act({ act: "rest", length: "long" });
    expect(diceLeft(b, s.now())[0]!.left).toBe(10);
  });

  it("gives back at least one die to a first-level character", () => {
    /* floor(1/2) is zero, and a level-one character who spent their only die
       would never get it back. The minimum is the rule, not a rounding fix. */
    const b = build({ classes: [{ id: "fighter", level: 1, subclass: null }], level: 1 });
    const s = sheet(b);
    s.act({ act: "hitdie", die: 10, rolled: 1 });
    expect(diceLeft(b, s.now())[0]!.left).toBe(0);
    s.act({ act: "rest", length: "long" });
    expect(diceLeft(b, s.now())[0]!.left).toBe(1);
  });

  it("spends a multiclass budget on the largest dice first", () => {
    /*
     * The rules let the player choose which spent dice come back. V1 dodged
     * the question by keeping one undifferentiated pool; V2 splits by die size
     * because a multiclass character needs to know whether a d10 or a d6 is
     * left, so the choice has to be made somewhere. Largest first is what a
     * player picking for themselves would take.
     */
    const b = build({
      classes: [{ id: "fighter", level: 5, subclass: null }, { id: "wizard", level: 2, subclass: null }],
      level: 7,
    });
    const s = sheet(b);
    for (let i = 0; i < 5; i++) s.act({ act: "hitdie", die: 10, rolled: 1 });
    for (let i = 0; i < 2; i++) s.act({ act: "hitdie", die: 6, rolled: 1 });
    /* Seven total, so three come back — all three to the d10 pool. */
    s.act({ act: "rest", length: "long" });
    expect(diceLeft(b, s.now())).toEqual([
      { die: 10, left: 3, total: 5 },
      { die: 6, left: 0, total: 2 },
    ]);
  });

  it("restores everything else on a long rest, and sheds one exhaustion", () => {
    const s = sheet();
    s.act({ act: "damage", n: 30 });
    s.act({ act: "exhaustion", n: 3 });
    s.act({ act: "temp", n: 5 });
    s.act({ act: "rest", length: "long" });
    const v = s.now();
    expect(v.health.hp).toBe(44);
    expect(v.health.temp).toBe(0);
    expect(v.exhaustion).toBe(2);
  });

  it("does nothing on its own for a short rest", () => {
    const s = sheet();
    s.act({ act: "damage", n: 30 });
    s.act({ act: "rest", length: "short" });
    expect(s.now().health.hp).toBe(14); // hit dice are spent by choice, not by resting
  });
});

describe("conditions", () => {
  it("adds and clears without duplicating", () => {
    const s = sheet();
    s.act({ act: "condition", id: "poisoned", on: true });
    s.act({ act: "condition", id: "poisoned", on: true });
    expect(s.now().conditions).toEqual(["poisoned"]);
    s.act({ act: "condition", id: "poisoned", on: false });
    expect(s.now().conditions).toEqual([]);
  });

  it("holds several at once", () => {
    const s = sheet();
    for (const id of ["poisoned", "prone", "frightened"]) s.act({ act: "condition", id, on: true });
    expect(s.now().conditions).toHaveLength(3);
  });
});

describe("what a character swings", () => {
  const sword = (over: Partial<Attack> = {}): Attack => ({
    name: "Longsword", ability: "str", proficient: true, bonus: 0,
    damage: { count: 1, die: 8, addAbility: true }, damageType: "slashing", ...over,
  });

  it("keeps what was added", () => {
    const t = sheet();
    t.act({ act: "attack", attack: sword() });
    expect(t.now().attacks.map((a) => a.name)).toEqual(["Longsword"]);
  });

  it("replaces one of the same name rather than doubling it", () => {
    /* A character has one Longsword; editing it is not acquiring a second. */
    const t = sheet();
    t.act({ act: "attack", attack: sword() });
    t.act({ act: "attack", attack: sword({ proficient: false }) });
    expect(t.now().attacks).toHaveLength(1);
    expect(t.now().attacks[0]?.proficient).toBe(false);
  });

  it("puts one down again", () => {
    const t = sheet();
    t.act({ act: "attack", attack: sword() });
    t.act({ act: "unattack", name: "Longsword" });
    expect(t.now().attacks).toEqual([]);
  });

  it("stores what it IS, never the bonus — that is the whole point", () => {
    /* Entering "+7" leaves a number that stays +7 after the level-up that
       should have made it +8. */
    const t = sheet();
    t.act({ act: "attack", attack: sword() });
    expect(JSON.stringify(t.now().attacks[0])).not.toContain("toHit");
  });
});

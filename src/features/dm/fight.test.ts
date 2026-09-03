import { describe, it, expect } from "vitest";
import { fightFrom, nameFor, visibleTo, showsNumbers, orderOf, awaiting, activeOf, hpOf, healthShown, DISCLOSURE, FIGHT, NO_FIGHT, type Act, type Combatant } from "./fight";
import type { Event } from "../../core/types";

let n = 0;
const ev = (a: Act): Event =>
  ({ id: `e${String(++n)}`, kind: FIGHT, seq: n, by: "d1", at: n, data: a } as unknown as Event);

const goblin = (id: string): Act => ({
  act: "stage", id, name: "Goblin",
  source: { kind: "creature", statblock: "fc-goblin", max: 7, ac: 15 },
});

describe("staging a fight", () => {
  it("starts with nothing, in the phase before it runs", () => {
    expect(fightFrom([])).toEqual(NO_FIGHT);
    expect(fightFrom([]).phase).toBe("staging");
  });

  it("puts a creature on the table", () => {
    const f = fightFrom([ev(goblin("g1"))]);
    expect(f.combatants).toHaveLength(1);
    expect(f.combatants[0]?.name).toBe("Goblin");
  });

  it("makes three goblins three rows, not one row with a count", () => {
    /* The moment one is bloodied and another is not, a count cannot say so —
       and "goblin 2 is nearly down" is a thing a DM says out loud. */
    const f = fightFrom([ev(goblin("g1")), ev(goblin("g2")), ev(goblin("g3"))]);
    expect(f.combatants.map((c) => c.name)).toEqual(["Goblin", "Goblin 2", "Goblin 3"]);
  });

  it("numbers each kind separately", () => {
    const orc: Act = { act: "stage", id: "o1", name: "Orc",
      source: { kind: "creature", statblock: "fc-orc", max: 15, ac: 13 } };
    const f = fightFrom([ev(goblin("g1")), ev(orc), ev(goblin("g2"))]);
    expect(f.combatants.map((c) => c.name)).toEqual(["Goblin", "Orc", "Goblin 2"]);
  });

  it("takes one off again without disturbing the others", () => {
    const f = fightFrom([ev(goblin("g1")), ev(goblin("g2")), ev({ act: "unstage", id: "g1" })]);
    expect(f.combatants.map((c) => c.id)).toEqual(["g2"]);
  });

  it("has not rolled initiative, which is not the same as rolling zero", () => {
    /* Knowing who the table is still waiting on is the whole reason a fight
       has a staging phase rather than starting when somebody says roll. */
    expect(fightFrom([ev(goblin("g1"))]).combatants[0]?.initiative).toBeNull();
  });
});

describe("what the players are shown", () => {
  it("stages a creature hidden, so putting it on the table is not narrating it", () => {
    /* A creature that appears on every player's screen the instant it is
       staged has spoiled the encounter before it starts. */
    expect(fightFrom([ev(goblin("g1"))]).combatants[0]?.disclosure).toBe("hidden");
  });

  it("is a ladder in order, not a set of options", () => {
    expect([...DISCLOSURE]).toEqual(["hidden", "present", "vague", "exact"]);
  });

  it("slides up per creature, so the dragon can stay a rumour", () => {
    const f = fightFrom([
      ev(goblin("g1")), ev(goblin("g2")),
      ev({ act: "disclose", id: "g1", to: "vague" }),
    ]);
    expect(f.combatants[0]?.disclosure).toBe("vague");
    expect(f.combatants[1]?.disclosure).toBe("hidden");
  });

  it("hides a hidden creature from players and never from the DM", () => {
    const [c] = fightFrom([ev(goblin("g1"))]).combatants;
    expect(visibleTo(false, c as Combatant)).toBe(false);
    expect(visibleTo(true, c as Combatant)).toBe(true);
  });

  it("gives numbers only at the top of the ladder", () => {
    const at = (to: string) =>
      fightFrom([ev(goblin("g1")), ev({ act: "disclose", id: "g1", to: to as never })]).combatants[0] as Combatant;
    expect(showsNumbers(false, at("present"))).toBe(false);
    expect(showsNumbers(false, at("vague"))).toBe(false);
    expect(showsNumbers(false, at("exact"))).toBe(true);
    /* And the DM always, whatever the ladder says. */
    expect(showsNumbers(true, at("hidden"))).toBe(true);
  });
});

describe("naming", () => {
  it("leaves the first one plain", () => {
    expect(nameFor("Goblin", [], "fc-goblin")).toBe("Goblin");
  });

  it("counts only its own kind", () => {
    const orc = { source: { kind: "creature", statblock: "fc-orc" } } as Combatant;
    expect(nameFor("Goblin", [orc], "fc-goblin")).toBe("Goblin");
  });
});

describe("clearing", () => {
  it("puts everything back, and the log still says what happened", () => {
    const f = fightFrom([ev(goblin("g1")), ev({ act: "clear" })]);
    expect(f).toEqual(NO_FIGHT);
  });
});

/* Ported from V1's `combat.ts` — sortOrder, beginCombat and advance. The
   reasons are V1's; the tests are written against V2's derived order. */
describe("initiative, and the order it settles into", () => {
  const pc = (id: string, name: string): Act =>
    ({ act: "stage", id, name, source: { kind: "character", character: id } });
  const roll = (id: string, value: number): Act => ({ act: "roll", id, value });

  it("sorts higher initiative first", () => {
    const f = fightFrom([ev(goblin("g1")), ev(pc("c1", "Bree")),
      ev(roll("g1", 12)), ev(roll("c1", 18))]);
    expect(orderOf(f).map((c) => c.id)).toEqual(["c1", "g1"]);
  });

  it("sorts anyone who has not rolled LAST, never as a zero", () => {
    /* A half-rolled order still has to read correctly while the table waits:
       "not yet" is not "rolled badly". */
    const f = fightFrom([ev(goblin("g1")), ev(pc("c1", "Bree")), ev(roll("g1", 3))]);
    expect(orderOf(f).map((c) => c.id)).toEqual(["g1", "c1"]);
    expect(orderOf(f)[1]?.initiative).toBeNull();
  });

  it("breaks a tie by the order the DM staged them, so every device agrees", () => {
    const f = fightFrom([ev(goblin("g1")), ev(goblin("g2")),
      ev(roll("g2", 14)), ev(roll("g1", 14))]);
    expect(orderOf(f).map((c) => c.id)).toEqual(["g1", "g2"]);
  });

  it("names who the table is still waiting on", () => {
    const f = fightFrom([ev(goblin("g1")), ev(pc("c1", "Bree")), ev(roll("g1", 9))]);
    expect(awaiting(f).map((c) => c.id)).toEqual(["c1"]);
  });

  it("moves out of staging on the first roll", () => {
    expect(fightFrom([ev(goblin("g1"))]).phase).toBe("staging");
    expect(fightFrom([ev(goblin("g1")), ev(roll("g1", 9))]).phase).toBe("rolling");
  });
});

describe("running the fight", () => {
  const pc = (id: string, name: string): Act =>
    ({ act: "stage", id, name, source: { kind: "character", character: id } });
  const roll = (id: string, value: number): Act => ({ act: "roll", id, value });
  const three = [ev(goblin("g1")), ev(pc("c1", "Bree")), ev(pc("c2", "Cass")),
    ev(roll("g1", 12)), ev(roll("c1", 18)), ev(roll("c2", 5))];

  it("begins on round one, at the top of the order", () => {
    const f = fightFrom([...three, ev({ act: "begin" })]);
    expect(f.phase).toBe("active");
    expect(f.round).toBe(1);
    expect(activeOf(f)?.id).toBe("c1");
  });

  it("drops anyone who never rolled rather than placing them arbitrarily", () => {
    /* V1's rule: a fight that starts with somebody at a made-up position is
       worse than one that starts without them. They can be staged again. */
    const f = fightFrom([ev(goblin("g1")), ev(pc("c1", "Bree")),
      ev(roll("g1", 12)), ev({ act: "begin" })]);
    expect(f.combatants.map((c) => c.id)).toEqual(["g1"]);
  });

  it("walks down the order one turn at a time", () => {
    let f = fightFrom([...three, ev({ act: "begin" })]);
    expect(activeOf(f)?.id).toBe("c1");
    f = fightFrom([...three, ev({ act: "begin" }), ev({ act: "advance", from: 0 })]);
    expect(activeOf(f)?.id).toBe("g1");
  });

  it("wraps to the top and opens the next round", () => {
    const f = fightFrom([...three, ev({ act: "begin" }),
      ev({ act: "advance", from: 0 }), ev({ act: "advance", from: 1 }),
      ev({ act: "advance", from: 2 })]);
    expect(f.round).toBe(2);
    expect(activeOf(f)?.id).toBe("c1");
  });

  it("ignores a second advance from the same turn, so two devices cannot skip anyone", () => {
    /* The guard V1 carries: `from` is the turn the presser could see. Without
       it, a DM and a player both ending the same turn advance it twice. */
    const f = fightFrom([...three, ev({ act: "begin" }),
      ev({ act: "advance", from: 0 }), ev({ act: "advance", from: 0 })]);
    expect(activeOf(f)?.id).toBe("g1");
    expect(f.round).toBe(1);
  });

  it("will not advance a fight that has not begun", () => {
    const f = fightFrom([...three, ev({ act: "advance", from: 0 })]);
    expect(f.phase).toBe("rolling");
    expect(f.round).toBe(0);
  });
});

/* Ported from V1's `project.ts` creatureDamaged: clamped both ends, and a
   negative amount is healing. V1's reason for the ceiling: "a ghoul patched up
   twice reads 30/22, which is not a state the game has." */
describe("hurting and mending a creature", () => {
  const hurt = (id: string, amount: number): Act => ({ act: "hurt", id, amount });
  const staged = [ev(goblin("g1"))]; // Goblin, max 7

  it("takes damage off its maximum", () => {
    const f = fightFrom([...staged, ev(hurt("g1", 3))]);
    expect(hpOf(f.combatants[0]!)).toEqual({ hp: 4, max: 7 });
  });

  it("cannot be driven below zero, however hard it is hit", () => {
    const f = fightFrom([...staged, ev(hurt("g1", 999))]);
    expect(hpOf(f.combatants[0]!)?.hp).toBe(0);
  });

  it("heals on a negative amount, and never above its maximum", () => {
    const f = fightFrom([...staged, ev(hurt("g1", 5)), ev(hurt("g1", -99))]);
    expect(hpOf(f.combatants[0]!)).toEqual({ hp: 7, max: 7 });
  });

  it("accumulates, so two blows are the sum of them", () => {
    const f = fightFrom([...staged, ev(hurt("g1", 2)), ev(hurt("g1", 3))]);
    expect(hpOf(f.combatants[0]!)?.hp).toBe(2);
  });

  it("leaves a character alone — their hit points are not the fight's to hold", () => {
    /* V1's `Source` union: a creature's hit points live in the fight, a
       character's in the log, on their own sheet. The two cannot disagree
       because there is only ever one of them. */
    const pc: Act = { act: "stage", id: "c1", name: "Bree",
      source: { kind: "character", character: "c1" } };
    const f = fightFrom([ev(pc), ev(hurt("c1", 5))]);
    expect(hpOf(f.combatants[0]!)).toBeNull();
  });
});

describe("what a player is allowed to see of a creature's health", () => {
  const staged = [ev(goblin("g1")), ev({ act: "hurt", id: "g1", amount: 4 })];
  const at = (rung: "hidden" | "present" | "vague" | "exact") =>
    fightFrom([...staged, ev({ act: "disclose", id: "g1", to: rung })]).combatants[0]!;

  it("gives the DM the numbers whatever the rung says", () => {
    expect(healthShown(true, at("hidden"))).toEqual({ kind: "numbers", hp: 3, max: 7 });
  });

  it("gives a player nothing below vague", () => {
    expect(healthShown(false, at("present"))).toEqual({ kind: "none" });
  });

  it("gives a player a WORD at vague, never a number", () => {
    const shown = healthShown(false, at("vague"));
    expect(shown.kind).toBe("word");
    expect(JSON.stringify(shown)).not.toContain("3");
  });

  it("gives a player the numbers only once the DM says exact", () => {
    expect(healthShown(false, at("exact"))).toEqual({ kind: "numbers", hp: 3, max: 7 });
  });
});

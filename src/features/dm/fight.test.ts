import { describe, it, expect } from "vitest";
import { fightFrom, nameFor, visibleTo, showsNumbers, DISCLOSURE, FIGHT, NO_FIGHT, type Act, type Combatant } from "./fight";
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

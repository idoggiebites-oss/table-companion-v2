import { describe, it, expect } from "vitest";
import { stanceFor, combine, describeStance, describeReasons } from "./stance";

const you = (...conditions: string[]) => ({ name: "you", conditions });
const it_ = (...conditions: string[]) => ({ name: "the goblin", conditions });
const roll = (a: string[], t: string[], range: "Melee" | "Ranged" = "Melee") =>
  stanceFor({ attacker: you(...a), target: it_(...t), range });

describe("what the target's condition does to your roll", () => {
  it("hands you advantage when they cannot defend themselves", () => {
    for (const c of ["blinded", "paralyzed", "petrified", "restrained", "stunned", "unconscious"]) {
      expect(roll([], [c]).stance).toBe("advantage");
    }
  });

  it("uses the id the books and the corpus use", () => {
    /* `paralysed` was the spelling until Task 9; a near-miss here drops the
       condition from the rule silently. */
    expect(roll([], ["paralyzed"]).stance).toBe("advantage");
    expect(roll([], ["paralysed"]).stance).toBe("straight");
  });
});

describe("what your own condition does to it", () => {
  it("makes you roll badly whoever you swing at", () => {
    for (const c of ["blinded", "poisoned", "restrained", "frightened"]) {
      expect(roll([c], []).stance).toBe("disadvantage");
    }
  });

  it("counts being prone against you", () => {
    expect(roll(["prone"], []).stance).toBe("disadvantage");
  });
});

describe("prone, the one that cuts both ways", () => {
  /* Easy to hit up close, hard to hit from across the room — and the one
     people get wrong by hand. */
  it("is advantage in melee", () => {
    expect(roll([], ["prone"], "Melee").stance).toBe("advantage");
  });

  it("is disadvantage at range", () => {
    expect(roll([], ["prone"], "Ranged").stance).toBe("disadvantage");
  });
});

describe("being unseen, from both sides", () => {
  it("is advantage when you cannot be seen", () => {
    expect(roll(["invisible"], []).stance).toBe("advantage");
  });

  it("is disadvantage when THEY cannot be seen", () => {
    expect(roll([], ["invisible"]).stance).toBe("disadvantage");
  });
});

describe("the combining rule nobody believes the first time", () => {
  it("cancels any number of each to a straight roll", () => {
    /* Three advantages and one disadvantage is not "mostly advantage". It is
       one d20. Not a tally, not a net. */
    const three = roll(["invisible"], ["prone", "stunned", "blinded"]);
    expect(three.reasons.filter((r) => r.effect === "advantage").length).toBeGreaterThan(2);
    expect(combine([...three.reasons, { effect: "disadvantage", because: "x" }])).toBe("straight");
  });

  it("is straight when there is nothing to say either way", () => {
    expect(roll([], []).stance).toBe("straight");
    expect(roll([], []).reasons).toEqual([]);
  });

  it("is advantage only when nothing pulls the other way", () => {
    expect(roll([], ["prone"]).stance).toBe("advantage");
    expect(roll(["poisoned"], ["prone"]).stance).toBe("straight");
  });
});

describe("saying it in a way that teaches the rule", () => {
  it("names every reason, because 'Advantage' alone teaches nothing", () => {
    const r = roll([], ["prone"]);
    expect(describeReasons(r.stance, r.reasons)).toBe("Advantage: the goblin is prone");
  });

  it("says WHY they cancelled, so the missing advantage is not a mystery", () => {
    const r = roll(["poisoned"], ["prone"]);
    expect(describeReasons(r.stance, r.reasons)).toContain("They cancel");
    expect(describeReasons(r.stance, r.reasons)).toContain("the goblin is prone");
    expect(describeReasons(r.stance, r.reasons)).toContain("you are poisoned");
  });

  it("phrases the attacker as 'you', because it is their screen", () => {
    const r = roll(["blinded"], []);
    expect(describeReasons(r.stance, r.reasons)).toBe("Disadvantage: you are blinded");
  });

  it("still says what to roll when there is no reason at all", () => {
    expect(describeReasons("straight", [])).toBe("Roll one d20");
    expect(describeStance("advantage")).toBe("Roll two d20s and take the higher");
  });
});

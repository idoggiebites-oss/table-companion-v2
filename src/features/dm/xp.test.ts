import { describe, it, expect } from "vitest";
import { progressFrom, levelsOwed, xpOf, XP, type XpAct } from "./xp";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (a: XpAct): Event =>
  ({ id: `e${String(++n)}`, kind: XP, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);
const party = ["bree", "brom"];

describe("experience, and who holds the key to a level", () => {
  it("splits an award evenly", () => {
    /* V1's rule: the RAW total is what a party earns and it is split evenly.
       Awarding the ADJUSTED one roughly doubles progression over a campaign. */
    const p = progressFrom([ev({ act: "award", amount: 500, to: party })]);
    expect(xpOf(p, "bree")).toBe(250);
    expect(xpOf(p, "brom")).toBe(250);
  });

  it("keeps the remainder rather than inventing a point", () => {
    const p = progressFrom([ev({ act: "award", amount: 101, to: party })]);
    expect(xpOf(p, "bree")).toBe(50);
  });

  it("owes nobody a level until a threshold is crossed", () => {
    const p = progressFrom([ev({ act: "award", amount: 400, to: ["bree"] })]);
    expect(levelsOwed(p, "bree", 1)).toBe(1);   // 300 is level 2
    expect(levelsOwed(p, "brom", 1)).toBe(0);
  });

  it("owes more than one when the DM has been generous", () => {
    const p = progressFrom([ev({ act: "award", amount: 3000, to: ["bree"] })]);
    /* 2,700 is level 4, from level 1. */
    expect(levelsOwed(p, "bree", 1)).toBe(3);
  });

  it("owes nothing once the level has been taken", () => {
    const p = progressFrom([ev({ act: "award", amount: 400, to: ["bree"] })]);
    expect(levelsOwed(p, "bree", 2)).toBe(0);
  });

  it("grants a level outright on a milestone, with no arithmetic at all", () => {
    /* A milestone campaign counts nothing, and asking it to would be the app
       insisting on its own model. */
    const p = progressFrom([ev({ act: "milestone", to: party })]);
    expect(xpOf(p, "bree")).toBe(0);
    expect(levelsOwed(p, "bree", 1)).toBe(1);
  });

  it("adds the two routes rather than letting one cancel the other", () => {
    /* A table that awarded experience for a term and then handed out a
       milestone has done both. */
    const p = progressFrom([
      ev({ act: "award", amount: 400, to: ["bree"] }),
      ev({ act: "milestone", to: ["bree"] }),
    ]);
    expect(levelsOwed(p, "bree", 1)).toBe(2);
  });

  it("counts a character's own level as experience already earned", () => {
    /*
     * Characters are made at whatever level the table plays at. Counting an
     * award from zero owed a fifth-level character a level for the next 300
     * experience anybody handed out — found by a journey, not by reasoning.
     */
    const p = progressFrom([ev({ act: "award", amount: 300, to: ["bree"] })]);
    expect(levelsOwed(p, "bree", 5)).toBe(0);
    expect(levelsOwed(p, "bree", 1)).toBe(1);
  });

  it("owes a high-level character one when they actually cross", () => {
    /* Level 5 is 6,500 and level 6 is 14,000. */
    const p = progressFrom([ev({ act: "award", amount: 7500, to: ["bree"] })]);
    expect(levelsOwed(p, "bree", 5)).toBe(1);
  });

  it("owes one on a milestone whatever level they are", () => {
    const p = progressFrom([ev({ act: "milestone", to: ["bree"] })]);
    expect(levelsOwed(p, "bree", 5)).toBe(1);
  });

  it("takes an award back when the DM typed a zero too many", () => {
    const p = progressFrom([
      ev({ act: "award", amount: 5000, to: ["bree"] }),
      ev({ act: "unaward", amount: 4500, to: ["bree"] }),
    ]);
    expect(xpOf(p, "bree")).toBe(500);
  });

  it("never goes below nothing, or un-takes a level already spent", () => {
    /* Choosing a subclass took somebody an evening. Correcting a number the
       DM typed does not reach back into that. */
    const p = progressFrom([
      ev({ act: "award", amount: 400, to: ["bree"] }),
      ev({ act: "unaward", amount: 9000, to: ["bree"] }),
    ]);
    expect(xpOf(p, "bree")).toBe(0);
    expect(levelsOwed(p, "bree", 2)).toBe(0);
  });
});

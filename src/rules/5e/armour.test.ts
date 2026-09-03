import { describe, it, expect } from "vitest";
import { armourClass, isArmoured, type Worn } from "./armour";
import { BLANK, type Scores } from "./abilities";

const at = (dex: number, str = 10): Scores => ({ ...BLANK, dex, str });

const LEATHER: Worn = { name: "Leather Armor", kind: "light", ac: 11 };
const STUDDED: Worn = { name: "Studded Leather Armor", kind: "light", ac: 12 };
const SCALE: Worn = { name: "Scale Mail", kind: "medium", ac: 14, maxDex: 2, stealthDisadvantage: true };
const CHAIN: Worn = { name: "Chain Mail", kind: "heavy", ac: 16, strMinimum: 13, stealthDisadvantage: true };
const SHIELD: Worn = { name: "Shield", kind: "shield", ac: 2 };

const ac = (worn: readonly Worn[], scores: Scores) => armourClass(worn, scores).value;

describe("armour class, from what is worn", () => {
  it("is ten plus Dexterity with nothing on", () => {
    expect(ac([], at(16))).toBe(13);
    expect(ac([], at(8))).toBe(9);
  });

  it("adds all of Dexterity to light armour", () => {
    expect(ac([LEATHER], at(18))).toBe(15);
    expect(ac([STUDDED], at(18))).toBe(16);
  });

  it("caps Dexterity at two in medium armour", () => {
    expect(ac([SCALE], at(18))).toBe(16);
    expect(ac([SCALE], at(12))).toBe(15);
  });

  /* The case the old sheet got most wrong: a Fighter in chain mail showed 12. */
  it("ignores Dexterity entirely in heavy armour", () => {
    expect(ac([CHAIN], at(18))).toBe(16);
    expect(ac([CHAIN], at(8))).toBe(16);
  });

  it("adds a shield on top of anything, armoured or not", () => {
    expect(ac([SHIELD], at(14))).toBe(14);
    expect(ac([CHAIN, SHIELD], at(10))).toBe(18);
    expect(ac([LEATHER, SHIELD], at(16))).toBe(16);
  });

  /* A character has one body. Summing two suits gives a knight AC 27. */
  it("wears one suit, and takes the best of them", () => {
    expect(ac([LEATHER, CHAIN], at(18))).toBe(16);
    expect(ac([CHAIN, LEATHER], at(18))).toBe(16);
  });

  /* "Best" is best AS WORN: scale mail is 14 to leather's 11, and a Dexterity
     of 20 makes leather the better armour. */
  it("compares suits as worn, not by their printed base", () => {
    expect(ac([LEATHER, SCALE], at(20))).toBe(16);
    expect(ac([LEATHER, SCALE], at(10))).toBe(14);
  });

  it("says whether anything is worn, ignoring a shield on its own", () => {
    expect(isArmoured([])).toBe(false);
    expect(isArmoured([SHIELD])).toBe(false);
    expect(isArmoured([LEATHER, SHIELD])).toBe(true);
  });
});

/*
 * V1's reason, carried: a capped Dexterity bonus is the commonest cause of a
 * player's arithmetic disagreeing with the sheet, and a bare 16 cannot settle
 * it. The number is never shown without the sum that made it.
 */
describe("the sum, in words", () => {
  it("names the armour and the Dexterity it let through", () => {
    expect(armourClass([LEATHER], at(16)).from).toBe("Leather Armor 11 +3 dex");
  });

  it("says when the cap bit, and only when it bit", () => {
    expect(armourClass([SCALE], at(18)).from).toBe("Scale Mail 14 +2 dex (dex capped at +2)");
    expect(armourClass([SCALE], at(12)).from).toBe("Scale Mail 14 +1 dex");
  });

  it("says when Dexterity does not apply at all", () => {
    expect(armourClass([CHAIN], at(18)).from).toBe("Chain Mail 16 (dex does not apply)");
    // Nothing to explain when there was no bonus to lose.
    expect(armourClass([CHAIN], at(10)).from).toBe("Chain Mail 16");
  });

  it("names the shield separately, so both halves are visible", () => {
    expect(armourClass([CHAIN, SHIELD], at(10)).from).toBe("Chain Mail 16 + Shield +2");
    expect(armourClass([SHIELD], at(14)).from).toBe("10 unarmoured +2 dex + Shield +2");
  });

  it("explains the unarmoured case rather than leaving a bare number", () => {
    expect(armourClass([], at(16)).from).toBe("10 unarmoured +3 dex");
    expect(armourClass([], at(6)).from).toBe("10 unarmoured −2 dex");
  });
});

describe("what armour costs you", () => {
  /* Heavy armour you lack the Strength for costs ten feet of speed. */
  it("slows a character too weak for their armour", () => {
    expect(armourClass([CHAIN], at(10, 12)).speedPenalty).toBe(10);
    expect(armourClass([CHAIN], at(10, 13)).speedPenalty).toBe(0);
    expect(armourClass([LEATHER], at(10, 8)).speedPenalty).toBe(0);
  });

  it("carries stealth disadvantage from anything worn", () => {
    expect(armourClass([CHAIN], at(10)).stealthDisadvantage).toBe(true);
    expect(armourClass([LEATHER], at(10)).stealthDisadvantage).toBe(false);
    // Even from a suit that lost the comparison — it is still being worn.
    expect(armourClass([SCALE, SHIELD], at(10)).stealthDisadvantage).toBe(true);
  });
});

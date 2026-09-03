import { describe, it, expect } from "vitest";
import { methods, spent, remaining, canRaise, canLower, POINT_BUDGET, POINT_MAX, STANDARD_ARRAY } from "./pointbuy";
import { BLANK, modifier, signed, ABILITIES, type Scores } from "./abilities";

const scores = (over: Partial<Scores> = {}): Scores => ({ ...BLANK, ...over });

describe("point buy", () => {
  it("starts with the whole budget unspent, and every score at 8", () => {
    expect(spent(BLANK)).toBe(0);
    expect(remaining(BLANK)).toBe(POINT_BUDGET);
    for (const a of ABILITIES) expect(BLANK[a]).toBe(8);
  });

  it("refuses to reach 16, because point buy stops at 15", () => {
    // The concept screen shows 16/14/14/10/12/16 beside "27 / 27 remaining".
    // That spread is neither purchasable nor unspent, and the control has to
    // make it unreachable rather than merely wrong.
    const at15 = scores({ str: POINT_MAX });
    expect(canRaise(at15, "str")).toBe(false);
  });

  it("charges the steep rate above 13", () => {
    expect(remaining(scores({ str: 13 }))).toBe(POINT_BUDGET - 5);
    expect(remaining(scores({ str: 14 }))).toBe(POINT_BUDGET - 7);
    expect(remaining(scores({ str: 15 }))).toBe(POINT_BUDGET - 9);
  });

  it("never lets the budget go negative", () => {
    const heavy = scores({ str: 15, dex: 15, con: 15 });
    expect(remaining(heavy)).toBe(POINT_BUDGET - 27);
    expect(canRaise(heavy, "int")).toBe(false);
  });

  it("will not lower a score below 8", () => {
    expect(canLower(BLANK, "str")).toBe(false);
    expect(canLower(scores({ str: 9 }), "str")).toBe(true);
  });

  it("offers the standard array as six fixed numbers", () => {
    expect([...STANDARD_ARRAY]).toEqual([15, 14, 13, 12, 10, 8]);
  });
});

describe("the licensing exit", () => {
  it("offers two methods, not four greyed ones, without the PHB tables", () => {
    expect(methods(true)).toEqual(["point-buy", "standard-array", "roll", "manual"]);
    expect(methods(false)).toEqual(["roll", "manual"]);
    expect(methods(false)).not.toContain("point-buy");
  });
});

describe("modifiers", () => {
  it("rounds down, including below ten", () => {
    expect(modifier(8)).toBe(-1);
    expect(modifier(10)).toBe(0);
    expect(modifier(11)).toBe(0);
    expect(modifier(15)).toBe(2);
    expect(modifier(20)).toBe(5);
  });

  it("always prints a sign", () => {
    expect(signed(modifier(10))).toBe("+0");
    expect(signed(modifier(8))).toBe("-1");
    expect(signed(modifier(16))).toBe("+3");
  });
});

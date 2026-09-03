import { describe, it, expect } from "vitest";
import { healthStep, VAGUE } from "./vitals";

describe("how hurt somebody looks", () => {
  it("reads full health as unharmed, and nothing else as unharmed", () => {
    expect(healthStep(20, 20)).toBe("unharmed");
    expect(healthStep(19, 20)).toBe("injured");
  });

  it("turns bloodied at half, which is the game's own word for it", () => {
    expect(healthStep(11, 20)).toBe("injured");
    expect(healthStep(10, 20)).toBe("bloodied");
  });

  it("turns near death at a quarter", () => {
    expect(healthStep(6, 20)).toBe("bloodied");
    expect(healthStep(5, 20)).toBe("near");
    expect(healthStep(0, 20)).toBe("near");
  });

  it("says something rather than dividing by zero", () => {
    expect(healthStep(0, 0)).toBe("near");
  });

  it("has a word for every step, because a player never sees the number", () => {
    for (const step of ["unharmed", "injured", "bloodied", "near"] as const) {
      expect(VAGUE[step]).toMatch(/\w/);
    }
  });
});

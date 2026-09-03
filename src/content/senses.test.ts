import { describe, it, expect } from "vitest";
import { sensesFrom, hasSenses, describeSenses, NO_SENSES } from "./senses";

describe("what an ancestry lets a character see", () => {
  it("reads a range out of the trait", () => {
    expect(sensesFrom([{ name: "Darkvision", text: "You can see in dim light within 60 feet." }]).darkvision)
      .toBe(60);
    expect(sensesFrom([{ name: "Superior Darkvision", text: "...within 120 feet of you..." }]).darkvision)
      .toBe(120);
  });

  /*
   * An ancestry whose trait says "Darkvision" and nothing parseable still HAS
   * darkvision. Saying 0 would be worse than saying 60.
   */
  it("falls back to the rulebook's usual rather than to zero", () => {
    expect(sensesFrom([{ name: "Darkvision", text: "You see well in the dark." }]).darkvision).toBe(60);
    expect(sensesFrom([{ name: "Superior Darkvision", text: "" }]).darkvision).toBe(120);
  });

  it("takes the best where two traits both grant it", () => {
    expect(sensesFrom([
      { name: "Darkvision", text: "within 60 feet" },
      { name: "Superior Darkvision", text: "within 120 feet" },
    ]).darkvision).toBe(120);
  });

  it("notices what darkvision costs a drow", () => {
    expect(sensesFrom([{ name: "Sunlight Sensitivity", text: "You have disadvantage..." }])
      .sunlightSensitivity).toBe(true);
  });

  it("reads the rarer senses too", () => {
    const s = sensesFrom([
      { name: "Blindsight", text: "within 10 feet" },
      { name: "Tremorsense", text: "within 30 feet" },
    ]);
    expect(s.blindsight).toBe(10);
    expect(s.tremorsense).toBe(30);
  });

  it("finds nothing where there is nothing", () => {
    expect(sensesFrom([{ name: "Fey Ancestry", text: "You have advantage on saves against being charmed." }]))
      .toEqual(NO_SENSES);
    expect(sensesFrom(undefined)).toEqual(NO_SENSES);
    expect(hasSenses(NO_SENSES)).toBe(false);
  });

  it("says it the way a statblock prints it", () => {
    const drow = sensesFrom([
      { name: "Superior Darkvision", text: "within 120 feet" },
      { name: "Sunlight Sensitivity", text: "disadvantage" },
    ]);
    expect(describeSenses(drow)).toBe("darkvision 120 ft · sunlight sensitivity");
    expect(describeSenses(NO_SENSES)).toBe("");
  });
});

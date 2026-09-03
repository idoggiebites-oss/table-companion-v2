import { describe, it, expect } from "vitest";
import { pileFor } from "./useProse";

/*
 * Which pile a step's prose comes out of. A subclass, a fighting style and a
 * Metamagic option are all class features written the same way, so they share
 * one — the same reasoning that made `findChoices` a single rule.
 */
describe("where a step's prose comes from", () => {
  it("sends both ancestry steps to the same pile", () => {
    expect(pileFor("ancestry")).toBe("race");
    expect(pileFor("subrace")).toBe("race");
  });

  it("sends every class question to the same pile", () => {
    expect(pileFor("subclass")).toBe("choice");
    expect(pileFor("style")).toBe("choice");
    expect(pileFor("picks")).toBe("choice");
  });

  it("knows the steps that have prose of their own", () => {
    expect(pileFor("background")).toBe("background");
    expect(pileFor("feat")).toBe("feat");
    expect(pileFor("spells")).toBe("spell");
  });

  /* A step with nothing to read asks for nothing: no fetch, no control. */
  it("says nothing for a step whose options are not records", () => {
    expect(pileFor("abilities")).toBeNull();
    expect(pileFor("skills")).toBeNull();
    expect(pileFor("equipment")).toBeNull();
    expect(pileFor("identity")).toBeNull();
  });
});

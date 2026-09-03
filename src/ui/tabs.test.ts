import { describe, it, expect } from "vitest";
import { tabsFor, currentOf } from "./tabs";

const ids = (o: Parameters<typeof tabsFor>[0]) => tabsFor(o).map((t) => t.id);

describe("the bar turns with the seat, and stays one bar", () => {
  it("gives the DM a party and no sheet", () => {
    /* V1's model: one navigation whose entries depend on who you are. A DM
       has no Sheet because a DM has no character. */
    expect(ids({ dm: true })).toEqual(["party", "fight", "prep", "characters", "log"]);
  });

  it("gives a player a sheet and no party", () => {
    /* And no Party either: looking after the table is not their job. */
    expect(ids({})).toEqual(["sheet", "characters", "log"]);
  });

  it("draws nothing that is not built", () => {
    /* Home, Companion, Library and More were drawn for weeks and went
       nowhere. Library returns when there is a compendium screen behind it. */
    for (const seat of [{ dm: true }, {}]) {
      for (const gone of ["home", "companion", "library", "more"]) {
        expect(ids(seat)).not.toContain(gone);
      }
    }
  });
});

describe("what a dot means", () => {
  it("marks a sheet that owes something", () => {
    const dot = (waiting: boolean) =>
      tabsFor({ waiting }).find((t) => t.id === "sheet")?.dot;
    expect(dot(false)).toBe(false);
    expect(dot(true)).toBe(true);
  });

  it("marks a party when anybody at the table owes something", () => {
    const dot = (owed: boolean) =>
      tabsFor({ dm: true, owed }).find((t) => t.id === "party")?.dot;
    expect(dot(false)).toBe(false);
    expect(dot(true)).toBe(true);
  });
});

describe("which tab is shown", () => {
  it("keeps the one you asked for when it exists", () => {
    expect(currentOf("sheet", tabsFor({}))).toBe("sheet");
    expect(currentOf("party", tabsFor({ dm: true }))).toBe("party");
    expect(currentOf("fight", tabsFor({ dm: true }))).toBe("fight");
  });

  it("falls back when the seat changes out from under it", () => {
    /*
     * Exactly V1's case: "a seat change can also leave you on a tab the other
     * side does not have." Standing on Party and then sitting down in a
     * character has to land somewhere real, and a bar with nothing marked is
     * a bar that has lost you.
     */
    expect(currentOf("party", tabsFor({}))).toBe("characters");
    expect(currentOf("fight", tabsFor({}))).toBe("characters");
    expect(currentOf("sheet", tabsFor({ dm: true }))).toBe("characters");
  });
});

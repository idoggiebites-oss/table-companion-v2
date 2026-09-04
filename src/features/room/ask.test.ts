import { describe, it, expect } from "vitest";
import { askedFrom, openFor, waitingOn, addressees, ASK, type AskAct, type Ask } from "./ask";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (a: AskAct): Event =>
  ({ id: `e${String(++n)}`, kind: ASK, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);

const party = ["bree", "brom", "wren"];
const table: Ask = { id: "a1", who: [], name: "Perception", ability: "wis", skill: "perception", dc: 14 };
const just: Ask = { id: "a2", who: ["bree"], name: "Stealth", ability: "dex", skill: "stealth" };

describe("the DM asks and the table answers", () => {
  it("asks everybody when nobody is named", () => {
    /* A DM who taps nothing has asked the table, which is what they say most
       of the time — making them tick four names for the common thing would be
       the app charging for its own model. */
    expect(addressees(table, party)).toEqual(party);
    expect(addressees(just, party)).toEqual(["bree"]);
  });

  it("puts the ask in front of everyone it names, and nobody else", () => {
    const s = askedFrom([ev({ act: "ask", ask: just })]);
    expect(openFor(s, "bree", party)?.name).toBe("Stealth");
    expect(openFor(s, "brom", party)).toBeNull();
  });

  it("takes it away once that person has answered, and leaves it for the rest", () => {
    const s = askedFrom([
      ev({ act: "ask", ask: table }),
      ev({ act: "answer", ask: "a1", who: "bree", total: 17 }),
    ]);
    expect(openFor(s, "bree", party)).toBeNull();
    expect(openFor(s, "brom", party)?.name).toBe("Perception");
    expect(s.answers["a1"]?.["bree"]).toBe(17);
  });

  it("treats a pass as an answer, not as an absence", () => {
    /*
     * A DM waiting on four names needs the difference between "no" and "not
     * yet", and a modal you can dismiss into silence gives them neither.
     */
    const s = askedFrom([
      ev({ act: "ask", ask: table }),
      ev({ act: "pass", ask: "a1", who: "wren" }),
    ]);
    expect(s.answers["a1"]?.["wren"]).toBeNull();
    expect(openFor(s, "wren", party)).toBeNull();
    expect(waitingOn(s, table, party)).toEqual(["bree", "brom"]);
  });

  it("says who is still being waited on", () => {
    const s = askedFrom([
      ev({ act: "ask", ask: table }),
      ev({ act: "answer", ask: "a1", who: "bree", total: 9 }),
    ]);
    expect(waitingOn(s, table, party)).toEqual(["brom", "wren"]);
  });

  it("shows one at a time, oldest first", () => {
    /* Two modals stacked over a character sheet is a screen nobody can act on. */
    const s = askedFrom([ev({ act: "ask", ask: table }), ev({ act: "ask", ask: just })]);
    expect(openFor(s, "bree", party)?.id).toBe("a1");
  });

  it("keeps the answers when the DM closes it", () => {
    const s = askedFrom([
      ev({ act: "ask", ask: table }),
      ev({ act: "answer", ask: "a1", who: "bree", total: 12 }),
      ev({ act: "close", ask: "a1" }),
    ]);
    expect(s.open).toHaveLength(0);
    expect(s.answers["a1"]?.["bree"]).toBe(12);
  });

  it("replaces an ask of the same id rather than asking twice", () => {
    const s = askedFrom([
      ev({ act: "ask", ask: table }),
      ev({ act: "ask", ask: { ...table, dc: 18 } }),
    ]);
    expect(s.open).toHaveLength(1);
    expect(s.open[0]?.dc).toBe(18);
  });

  it("carries no DC when the DM did not say one", () => {
    /* Announcing it tells the table how hard something is before anybody
       commits, which is sometimes the point and sometimes exactly not. */
    expect(just.dc).toBeUndefined();
  });
});

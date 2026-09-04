import { describe as group, it, expect } from "vitest";
import { describe } from "./story";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (kind: string, data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: asDevice("d1"), at: 0, data } as unknown as Event);

const names: Record<string, string> = { kira: "Kira", g1: "Goblin 2" };
const nameOf = (id: string) => names[id];

group("the log says what happened", () => {
  it("reads as a sentence, not as an event kind", () => {
    /*
     * The whole complaint. `LogView` printed a sequence number, `sheet.vital`
     * and a device id, so a night read as forty rows of "fight.act d3f9a1".
     */
    expect(describe(ev("sheet.vital", { act: "damage", n: 12, character: "kira" }), nameOf))
      .toBe("Kira took 12");
  });

  it("names the creature when the fight still knows it", () => {
    expect(describe(ev("fight.act", { act: "hurt", id: "g1", amount: 5 }), nameOf))
      .toBe("Goblin 2 took 5");
  });

  it("reads healing as healing, not as negative damage", () => {
    /* One act with the sign flipped is right for the model and wrong for a
       sentence: "Goblin 2 took −4" is not a thing anybody says. */
    expect(describe(ev("fight.act", { act: "hurt", id: "g1", amount: -4 }), nameOf))
      .toBe("Goblin 2 healed 4");
  });

  it("says a condition by its name, in the middle of a sentence", () => {
    expect(describe(ev("sheet.vital", { act: "condition", id: "poisoned", on: true, character: "kira" }), nameOf))
      .toBe("Kira is poisoned");
    expect(describe(ev("sheet.vital", { act: "condition", id: "poisoned", on: false, character: "kira" }), nameOf))
      .toBe("Kira is no longer poisoned");
  });

  it("draws no row for advancing the turn", () => {
    /* V1's rule, and its reason: "the feed would be nothing but this." */
    expect(describe(ev("fight.act", { act: "advance", from: 0 }), nameOf)).toBeNull();
  });

  it("draws no row for the thirty choices that build one character", () => {
    expect(describe(ev("creation.choose", { step: "class" }), nameOf)).toBeNull();
  });

  it("never prints an undo as a row of its own", () => {
    /* It shows ON the event it undid, struck through — a log that prints its
       own bookkeeping reads as bookkeeping. */
    expect(describe(ev("skip", { target: "e1" }), nameOf)).toBeNull();
  });

  it("falls back to a person rather than an id it cannot resolve", () => {
    expect(describe(ev("sheet.vital", { act: "heal", n: 3, character: "gone" }), nameOf))
      .toBe("Someone healed 3");
    expect(describe(ev("fight.act", { act: "unstage", id: "gone" }), nameOf))
      .toBe("A creature left the table");
  });

  it("says nothing it cannot say truthfully", () => {
    expect(describe(ev("some.future.kind", { act: "whatever" }), nameOf)).toBeNull();
  });
});

group("a character arriving", () => {
  it("draws one row for the arrival, not thirty for the building", () => {
    /* V1 logs "Bree Thorn joined" and nothing else. Printing every choice
       buried a night under "chose a class, chose a background, chose a skill",
       so only the step that NAMES them draws a row — which is also the step
       creation ends on. */
    expect(describe(ev("creation.choose", { step: "class", classes: [] }), nameOf)).toBeNull();
    expect(describe(ev("creation.choose", { step: "identity", identity: { name: "Bree Thorn" } }), nameOf))
      .toBe("Bree Thorn joined");
  });

  it("says nothing for an unnamed identity", () => {
    expect(describe(ev("creation.choose", { step: "identity", identity: {} }), nameOf)).toBeNull();
  });
});

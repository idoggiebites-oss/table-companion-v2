import { describe, it, expect } from "vitest";
import { fightFrom, orderOf, activeOf, FIGHT, type Act } from "./fight";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (a: Act): Event =>
  ({ id: `e${String(++n)}`, kind: FIGHT, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);

describe("arriving in a fight already running", () => {
  /* Distinct statblocks, or `nameFor` numbers the second one "Bram 2" —
     correct behaviour for two goblins, noise in a test about turn order. */
  const creature = (statblock: string) =>
    ({ kind: "creature" as const, statblock, max: 10, ac: 10 });
  const running = (): Act[] => [
    { act: "stage", id: "a", name: "Aria", source: creature("a") },
    { act: "stage", id: "b", name: "Bram", source: creature("b") },
    { act: "roll", id: "a", value: 20 },
    { act: "roll", id: "b", value: 5 },
    { act: "begin" },
    { act: "advance", from: 0 },
  ];

  it("does not take the turn from whoever is having it", () => {
    /*
     * The measured bug. `turn` indexes a DERIVED order, so a creature landing
     * ABOVE the current one shifted everybody down and the pointer kept its
     * number: Aria on 20, Bram on 5, Bram up; a goblin arrives on 15 and the
     * order becomes Aria, goblin, Bram — with `turn` still 1, which is now the
     * goblin. Bram's go was taken and never came back, and a DM could do it
     * from the staging screen mid-fight, which is when reinforcements arrive.
     */
    const before = fightFrom(running().map(ev));
    expect(activeOf(before)?.name).toBe("Bram");

    const arrive: Act[] = [
      { act: "stage", id: "g", name: "Gob", source: { kind: "creature", statblock: "y", max: 7, ac: 15 } },
      { act: "roll", id: "g", value: 15 },
    ];
    const after = fightFrom([...running(), ...arrive].map(ev));
    expect(orderOf(after).map((c) => c.name)).toEqual(["Aria", "Gob", "Bram"]);
    expect(activeOf(after)?.name).toBe("Bram");
  });

  it("keeps the turn when the arrival lands below it", () => {
    const late: Act[] = [
      { act: "stage", id: "g", name: "Gob", source: { kind: "creature", statblock: "y", max: 7, ac: 15 } },
      { act: "roll", id: "g", value: 1 },
    ];
    const after = fightFrom([...running(), ...late].map(ev));
    expect(activeOf(after)?.name).toBe("Bram");
  });

  it("moves on when the one whose go it is leaves the table", () => {
    /* Their turn is over, and whoever slid into the empty slot is up. */
    const after = fightFrom([...running(), { act: "unstage", id: "b" } as Act].map(ev));
    expect(orderOf(after).map((c) => c.name)).toEqual(["Aria"]);
    expect(activeOf(after)?.name).toBe("Aria");
  });

  it("leaves a fight that has not begun alone", () => {
    const both: Act[] = [
      { act: "stage", id: "a", name: "Aria", source: creature("a") },
      { act: "stage", id: "b", name: "Bram", source: creature("b") },
    ];
    const staged = fightFrom(both.map(ev));
    expect(staged.turn).toBe(0);
    expect(activeOf(staged)).toBeNull();
  });
});

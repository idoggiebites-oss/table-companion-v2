import { describe, it, expect } from "vitest";
import { onTurn, onRolling } from "./nudge";
import { fightFrom, FIGHT, type Act } from "./fight";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (a: Act): Event =>
  ({ id: `e${String(++n)}`, kind: FIGHT, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);

const goblin: Act = { act: "stage", id: "g1", name: "Goblin",
  source: { kind: "creature", statblock: "fc-goblin", max: 7, ac: 15 } };
const bree: Act = { act: "stage", id: "c1", name: "Bree",
  source: { kind: "character", character: "c1" } };

describe("whose phone should buzz when the turn comes round", () => {
  it("buzzes the player whose go it now is", () => {
    const f = fightFrom([ev(bree), ev(goblin),
      ev({ act: "roll", id: "c1", value: 20 }), ev({ act: "roll", id: "g1", value: 5 }),
      ev({ act: "begin" })]);
    expect(onTurn(f)?.to).toBe("c1");
    expect(onTurn(f)?.title).toBe("Your turn");
  });

  it("says nothing when it is a creature's go", () => {
    /* Nobody is waiting on a phone for the goblin. A notification that
       arrives when nothing is being asked of you teaches people to swipe
       them away without reading. */
    const f = fightFrom([ev(bree), ev(goblin),
      ev({ act: "roll", id: "c1", value: 5 }), ev({ act: "roll", id: "g1", value: 20 }),
      ev({ act: "begin" })]);
    expect(onTurn(f)).toBeNull();
  });

  it("says nothing before the fight has begun", () => {
    expect(onTurn(fightFrom([ev(bree)]))).toBeNull();
  });
});

describe("who the table is waiting on to roll", () => {
  it("buzzes the players who have not rolled", () => {
    const f = fightFrom([ev(bree), ev(goblin), ev({ act: "roll", id: "g1", value: 12 })]);
    expect(onRolling(f).map((x) => x.to)).toEqual(["c1"]);
  });

  it("leaves out anyone who already has", () => {
    const f = fightFrom([ev(bree), ev({ act: "roll", id: "c1", value: 9 })]);
    expect(onRolling(f)).toEqual([]);
  });

  it("never asks a creature to roll — that is the DM's to enter", () => {
    const f = fightFrom([ev(goblin), ev(bree), ev({ act: "roll", id: "c1", value: 9 })]);
    expect(onRolling(f)).toEqual([]);
  });

  it("says nothing once the fight is running", () => {
    const f = fightFrom([ev(bree), ev({ act: "roll", id: "c1", value: 9 }), ev({ act: "begin" })]);
    expect(onRolling(f)).toEqual([]);
  });
});

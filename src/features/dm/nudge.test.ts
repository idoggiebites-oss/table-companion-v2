import { describe, it, expect } from "vitest";
import { onTurn, onRolling, onAsked } from "./nudge";
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

describe("the DM asking for a roll", () => {
  it("buzzes everybody it names, and nobody else", () => {
    /*
     * The third of V1's three, and the one it could not build: the other two
     * are the table waiting on you in a FIGHT, and this is the DM waiting on
     * you at any moment at all.
     */
    const one = onAsked(
      { id: "a1", who: ["bree"], name: "Stealth", ability: "dex" },
      ["bree", "brom"],
    );
    expect(one.map((n) => n.to)).toEqual(["bree"]);
  });

  it("buzzes the whole table when nobody was named", () => {
    const all = onAsked({ id: "a1", who: [], name: "Perception", ability: "wis" }, ["bree", "brom"]);
    expect(all.map((n) => n.to)).toEqual(["bree", "brom"]);
  });

  it("says what the roll is, not that there is one", () => {
    /* "The DM wants a roll" tells you to open the app; "Perception check — DC
       14" tells you what is about to happen. */
    const [n] = onAsked({ id: "a1", who: [], name: "Perception", ability: "wis", dc: 14 }, ["bree"]);
    expect(n?.body).toBe("Perception check — DC 14");
  });

  it("says nothing about a difficulty the DM kept to themselves", () => {
    const [n] = onAsked({ id: "a1", who: [], name: "Perception", ability: "wis" }, ["bree"]);
    expect(n?.body).toBe("Perception check");
  });

  it("calls a saving throw a saving throw", () => {
    const [n] = onAsked(
      { id: "a1", who: [], kind: "save", name: "Dexterity", ability: "dex", dc: 15 }, ["bree"],
    );
    expect(n?.body).toBe("Dexterity saving throw — DC 15");
  });
});

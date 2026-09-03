import { describe, it, expect } from "vitest";
import { isDmOnly, visibleInLog, logFor, mayRevert, BEHIND_THE_SCREEN } from "./visibility";
import { FIGHT, type Act } from "../dm/fight";
import { VITAL } from "../sheet/model";
import { CHOICE } from "../creation/model";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (kind: string, data: Record<string, unknown>, by = "d1"): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: asDevice(by), at: n, data } as Event);
const fight = (a: Act) => ev(FIGHT, a as unknown as Record<string, unknown>);

const goblin: Act = { act: "stage", id: "g1", name: "Chaos-spawn Goblin",
  source: { kind: "creature", statblock: "fc-goblin", max: 7, ac: 15 } };

describe("what a player's log may say", () => {
  it("hides the creature the DM put on the table", () => {
    /* The name alone is the whole of what `hidden` protects. */
    expect(visibleInLog(fight(goblin), false)).toBe(false);
  });

  it("hides the ladder itself", () => {
    /* "The dragon is now vague" tells you there is a dragon. */
    expect(visibleInLog(fight({ act: "disclose", id: "g1", to: "vague" }), false)).toBe(false);
  });

  it("hides a creature quietly losing hit points", () => {
    expect(visibleInLog(fight({ act: "hurt", id: "g1", amount: 4 }), false)).toBe(false);
  });

  it("hides a condition put on something that may not be known to exist", () => {
    expect(visibleInLog(fight({ act: "condition", id: "g1", condition: "prone", on: true }), false)).toBe(false);
  });

  it("SHOWS what the table watched happen", () => {
    /* The audience, not the actor: these are said out loud. */
    for (const a of [
      { act: "roll", id: "g1", value: 12 },
      { act: "begin" },
      { act: "advance", from: 0 },
      { act: "verdict", claim: "k1", lands: true },
    ] as Act[]) {
      expect(visibleInLog(fight(a), false)).toBe(true);
    }
  });

  it("shows a claim, because the player rolled it out loud", () => {
    const claim: Act = { act: "claim", claim: {
      id: "k1", who: "c1", whoName: "Bree", targetId: "g1",
      weapon: "Longsword", toHit: 18, damage: 4, damageType: "slashing" } };
    expect(visibleInLog(fight(claim), false)).toBe(true);
  });

  it("shows a character's own doings — the table watches those too", () => {
    expect(visibleInLog(ev(VITAL, { act: "damage", n: 3 }), false)).toBe(true);
    expect(visibleInLog(ev(CHOICE, { step: "ancestry" }), false)).toBe(true);
  });

  it("treats an unknown act as private, because showing too much is the worse failure", () => {
    expect(isDmOnly(fight({ act: "something-new" } as unknown as Act))).toBe(true);
  });

  it("keeps the known-private list honest rather than letting it rot into a comment", () => {
    for (const act of BEHIND_THE_SCREEN) {
      expect(isDmOnly(fight({ act } as unknown as Act))).toBe(true);
    }
  });

  it("gives the DM everything, because they hold the table together", () => {
    expect(visibleInLog(fight(goblin), true)).toBe(true);
    expect(logFor([fight(goblin), fight({ act: "begin" })], true)).toHaveLength(2);
  });

  it("filters a whole log for a player", () => {
    const log = [fight(goblin), fight({ act: "begin" }), fight({ act: "hurt", id: "g1", amount: 2 })];
    expect(logFor(log, false).map((e) => (e.data as Record<string, unknown>)["act"])).toEqual(["begin"]);
  });
});

describe("who may take something back", () => {
  const me = asDevice("mine");

  it("lets the DM undo anything", () => {
    expect(mayRevert(ev(FIGHT, { act: "begin" }, "theirs"), true, me)).toBe(true);
  });

  it("lets a player undo what their own device did", () => {
    expect(mayRevert(ev(VITAL, { act: "damage", n: 1 }, "mine"), false, me)).toBe(true);
  });

  it("does not let a player undo somebody else's — that is a conversation, not a button", () => {
    expect(mayRevert(ev(VITAL, { act: "damage", n: 1 }, "theirs"), false, me)).toBe(false);
  });
});

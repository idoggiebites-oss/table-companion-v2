import { describe, it, expect } from "vitest";
import { fightFrom, activeOf, FIGHT, type Act } from "./fight";
import { spentBy, hasReaction, legendaryUsed, FRESH } from "./economy";
import { mayTake } from "../../content/legendary";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (a: Act): Event =>
  ({ id: `e${String(++n)}`, kind: FIGHT, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);
const creature = (statblock: string) =>
  ({ kind: "creature" as const, statblock, max: 20, ac: 12 });

/** A dragon on 20 and a knight on 10, dragon up. */
const running: Act[] = [
  { act: "stage", id: "drag", name: "Dragon", source: creature("d") },
  { act: "stage", id: "kn", name: "Knight", source: creature("k") },
  { act: "roll", id: "drag", value: 20 },
  { act: "roll", id: "kn", value: 10 },
  { act: "begin" },
];

describe("what a creature has spent this turn", () => {
  it("starts with everything in hand", () => {
    expect(spentBy(fightFrom(running.map(ev)), "drag")).toEqual(FRESH);
  });

  it("tracks the three separately, per creature", () => {
    /*
     * The whole reason this exists. V1: without it "a DM running six goblins
     * tracked 'has that one used its bonus action' in their head, six times,
     * every round."
     */
    const f = fightFrom(([...running,
      { act: "spend", id: "drag", kind: "action", on: true },
      { act: "spend", id: "drag", kind: "bonus", on: true },
    ] as Act[]).map(ev));
    expect(spentBy(f, "drag")).toEqual({ action: true, bonus: true, reaction: false });
    expect(spentBy(f, "kn")).toEqual(FRESH);
  });

  it("hands one back without going through the log", () => {
    /* A DM mis-taps. Correcting a checkbox mid-turn is not a thing the table's
       history should carry an undo for. */
    const f = fightFrom(([...running,
      { act: "spend", id: "drag", kind: "action", on: true },
      { act: "spend", id: "drag", kind: "action", on: false },
    ] as Act[]).map(ev));
    expect(spentBy(f, "drag").action).toBe(false);
  });

  it("is idempotent, because two devices may say it at once", () => {
    const twice = fightFrom(([...running,
      { act: "spend", id: "drag", kind: "action", on: true },
      { act: "spend", id: "drag", kind: "action", on: true },
    ] as Act[]).map(ev));
    expect(spentBy(twice, "drag").action).toBe(true);
  });

  it("gives it all back when that creature's turn opens again", () => {
    const f = fightFrom(([...running,
      { act: "spend", id: "drag", kind: "action", on: true },
      { act: "advance", from: 0 },   // knight up
      { act: "advance", from: 1 },   // wraps to the dragon, round 2
    ] as Act[]).map(ev));
    expect(f.round).toBe(2);
    expect(activeOf(f)?.name).toBe("Dragon");
    expect(spentBy(f, "drag")).toEqual(FRESH);
  });

  it("leaves everybody else's alone when a turn opens", () => {
    const f = fightFrom(([...running,
      { act: "spend", id: "kn", kind: "reaction", on: true },
      { act: "advance", from: 0 },   // the knight's own turn opens
    ] as Act[]).map(ev));
    expect(hasReaction(f, "kn")).toBe(true);
  });

  it("keeps a reaction spent across somebody else's turn", () => {
    /* The exception that proves the per-turn rule: a reaction is spent on
       another creature's go and comes back when yours opens, not when theirs
       ends. */
    const f = fightFrom(([...running,
      { act: "spend", id: "kn", kind: "reaction", on: true },
    ] as Act[]).map(ev));
    expect(hasReaction(f, "kn")).toBe(false);
  });
});

describe("legendary actions", () => {
  it("counts down across other people's turns", () => {
    const f = fightFrom(([...running,
      { act: "advance", from: 0 },  // the knight's turn — when they are taken
      { act: "legendary", id: "drag", cost: 1 },
      { act: "legendary", id: "drag", cost: 2 },
    ] as Act[]).map(ev));
    expect(legendaryUsed(f, "drag")).toBe(3);
  });

  it("comes back at the start of the creature's own turn, not the round's end", () => {
    /*
     * The half of the rule people get backwards. `content/legendary.ts` has
     * held `mayTake` with it since the content layer was written, and nothing
     * called it — 702 shipped creatures have legendary actions.
     */
    const spent = fightFrom(([...running,
      { act: "advance", from: 0 },
      { act: "legendary", id: "drag", cost: 3 },
    ] as Act[]).map(ev));
    expect(mayTake({ budget: 3, spent: legendaryUsed(spent, "drag"), isTheirTurn: false })).toBe(false);

    const back = fightFrom(([...running,
      { act: "advance", from: 0 },
      { act: "legendary", id: "drag", cost: 3 },
      { act: "advance", from: 1 },  // the dragon's turn opens
    ] as Act[]).map(ev));
    expect(legendaryUsed(back, "drag")).toBe(0);
  });

  it("refuses one on the creature's own turn", () => {
    /* "A dragon that legendary-acts on its own turn is taking four actions
       instead of one." */
    const f = fightFrom(running.map(ev));
    expect(activeOf(f)?.id).toBe("drag");
    expect(mayTake({ budget: 3, spent: legendaryUsed(f, "drag"), isTheirTurn: true })).toBe(false);
  });

  it("starts a fight with nothing spent, whatever was pressed while staging", () => {
    const f = fightFrom(([
      ...running.slice(0, 4),
      { act: "spend", id: "drag", kind: "action", on: true },
      { act: "begin" },
    ] as Act[]).map(ev));
    expect(spentBy(f, "drag")).toEqual(FRESH);
  });
});

import { describe, it, expect } from "vitest";
import { holdingsFrom, purseOf, heldBy, HOLD, type HoldAct } from "./holdings";
import { formatCoins, splitCoins, parseCoins } from "../../rules/5e/money";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (a: HoldAct): Event =>
  ({ id: `e${String(++n)}`, kind: HOLD, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);
const rope = { itemId: "rope-hempen-50-feet", name: "Rope, hempen (50 feet)", qty: 1 };
const potions = { itemId: "potion-of-healing", name: "Potion of Healing", qty: 5 };

describe("coins, held as copper", () => {
  it("adds and takes", () => {
    const h = holdingsFrom([
      ev({ act: "coins", who: "bree", copper: 1500 }),
      ev({ act: "coins", who: "bree", copper: -500 }),
    ]);
    expect(purseOf(h, "bree")).toBe(1000);
    expect(formatCoins(purseOf(h, "bree"))).toBe("10 gp");
  });

  it("cannot be overdrawn", () => {
    /* A DM taking more than somebody has means they have nothing, not that
       they owe. */
    const h = holdingsFrom([
      ev({ act: "coins", who: "bree", copper: 100 }),
      ev({ act: "coins", who: "bree", copper: -900 }),
    ]);
    expect(purseOf(h, "bree")).toBe(0);
  });

  it("shows the coins somebody would actually hand over", () => {
    /* Never electrum or platinum: a purse that turns the 10 gp you were just
       handed into "1 pp" starts a rules argument in the middle of a shop. */
    expect(splitCoins(1550)).toEqual({ gp: 15, sp: 5 });
    expect(formatCoins(1550)).toBe("15 gp 5 sp");
    expect(formatCoins(0)).toBe("0 cp");
    /* Platinum converts on the way IN and is never shown on the way out. */
    expect(formatCoins(parseCoins("2 pp") ?? 0)).toBe("20 gp");
  });
});

describe("a thing changing hands", () => {
  it("leaves one and joins the other", () => {
    const h = holdingsFrom([
      ev({ act: "move", from: "bree", to: "brom", itemId: potions.itemId, name: potions.name, qty: 2 }),
    ]);
    expect(heldBy(h, "bree", [potions])).toEqual([{ ...potions, qty: 3 }]);
    expect(heldBy(h, "brom", [])).toEqual([{ ...potions, qty: 2 }]);
  });

  it("is gone rather than shown as none left", () => {
    const h = holdingsFrom([
      ev({ act: "move", from: "bree", to: "brom", itemId: rope.itemId, name: rope.name, qty: 1 }),
    ]);
    expect(heldBy(h, "bree", [rope])).toEqual([]);
  });

  it("never says somebody owns minus one of something", () => {
    /* A character can give away a rope creation never recorded. The honest
       answer is that they have none, not −1. */
    const h = holdingsFrom([
      ev({ act: "move", from: "bree", to: "brom", itemId: rope.itemId, name: rope.name, qty: 3 }),
    ]);
    expect(heldBy(h, "bree", [rope])).toEqual([]);
  });

  it("arrives from nowhere when the DM hands it out", () => {
    /* Loot, a reward, a thing the party found: no `from` at all. */
    const h = holdingsFrom([
      ev({ act: "move", to: "bree", itemId: rope.itemId, name: rope.name, qty: 1 }),
    ]);
    expect(heldBy(h, "bree", [])).toEqual([rope]);
  });

  it("leaves the table when the DM takes it back", () => {
    const h = holdingsFrom([
      ev({ act: "move", from: "bree", itemId: potions.itemId, name: potions.name, qty: 5 }),
    ]);
    expect(heldBy(h, "bree", [potions])).toEqual([]);
  });

  it("leaves what creation gave them alone", () => {
    /* `stacksOf` is a true statement about how they STARTED, and what happens
       afterwards is a different fact — so it folds on top rather than editing
       history. */
    const h = holdingsFrom([]);
    expect(heldBy(h, "bree", [rope, potions])).toEqual([rope, potions]);
  });
});

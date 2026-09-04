import { describe, it, expect } from "vitest";
import {
  blankNpc, describeStock, inStock, isNamed, isUnlimited, peopleFrom, sellOne,
  stockId, UNLIMITED, NPC, type Npc, type StockEntry,
} from "./npc";
import { isDmOnly } from "../room/visibility";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (kind: string, data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: asDevice("d1"), at: n, data } as Event);
const npc = (a: Record<string, unknown>) => ev(NPC, a);

const rope: StockEntry = { itemId: "rope", name: "Rope", price: 100, qty: UNLIMITED };
const breastplate: StockEntry = { itemId: "breastplate", name: "Breastplate", price: 40000, qty: 1 };

const halbrek: Npc = { ...blankNpc("n1"), name: "Halbrek the Fence", role: "shopkeeper" };

describe("an NPC", () => {
  it("needs only a name to be worth keeping — everything else defaults away", () => {
    expect(isNamed(blankNpc("n1"))).toBe(false);
    expect(isNamed({ ...blankNpc("n1"), name: "Halbrek" })).toBe(true);
    expect(isNamed({ ...blankNpc("n1"), name: "   " })).toBe(false);
  });

  it("is notes-first: stats are absent by default, not zeroed out", () => {
    /* `blankNpc` never sets `stats`. A record that never rolls anything
       should not have to carry an invented AC of 0 to be valid. */
    expect("stats" in blankNpc("n1")).toBe(false);
  });
});

describe("the trader flag", () => {
  it("defaults off, with an empty shelf — most people never sell anything", () => {
    const b = blankNpc("n1");
    expect(b.trader).toBe(false);
    expect(b.stock).toEqual([]);
  });

  it("is independent of stock: a non-trader can still carry stock data", () => {
    /* The flag decides whether the SCREEN opens a shelf, not whether the
       record is allowed to hold one — the same reasoning as `describeStock`
       and `sellOne` below, which know nothing about `trader` at all. */
    const quiet: Npc = { ...halbrek, trader: false, stock: [rope] };
    expect(describeStock(quiet.stock[0]!)).toBe("1 gp");
  });
});

describe("describing stock", () => {
  it("shows just the price when the supply is endless", () => {
    expect(describeStock(rope)).toBe("1 gp");
    expect(isUnlimited(rope)).toBe(true);
    expect(inStock(rope)).toBe(true);
  });

  it("counts down a limited entry", () => {
    expect(describeStock(breastplate)).toBe("400 gp · 1 left");
    expect(isUnlimited(breastplate)).toBe(false);
  });

  it("is out of stock at zero, not before", () => {
    expect(inStock({ ...breastplate, qty: 0 })).toBe(false);
    expect(inStock({ ...breastplate, qty: 1 })).toBe(true);
  });
});

describe("selling one down", () => {
  it("never runs an unlimited entry out", () => {
    expect(sellOne([rope], "rope")).toEqual([rope]);
  });

  it("decrements a limited entry", () => {
    const two = { ...breastplate, qty: 2 };
    expect(sellOne([two], "breastplate")).toEqual([{ ...two, qty: 1 }]);
  });

  it("removes the row once the last one sells", () => {
    expect(sellOne([breastplate], "breastplate")).toEqual([]);
  });

  it("leaves every other row untouched", () => {
    expect(sellOne([rope, breastplate], "rope")).toEqual([rope, breastplate]);
  });
});

describe("a hand-typed stock id", () => {
  it("slugs the name, so re-adding it updates the same row", () => {
    expect(stockId("Rope")).toBe("rope");
    expect(stockId("A Tarnished Key")).toBe("a-tarnished-key");
  });

  it("falls back rather than collapse to an empty key", () => {
    expect(stockId("   ")).not.toBe("");
  });
});

describe("keeping and forgetting", () => {
  it("keeps a saved NPC", () => {
    expect(peopleFrom([npc({ act: "save", npc: halbrek })]).npcs).toEqual([halbrek]);
  });

  it("replaces on the same id rather than accumulating a second record", () => {
    const edited = { ...halbrek, notes: "owes the party a favour" };
    const people = peopleFrom([
      npc({ act: "save", npc: halbrek }),
      npc({ act: "save", npc: edited }),
    ]);
    expect(people.npcs).toEqual([edited]);
  });

  it("lets one go", () => {
    const people = peopleFrom([
      npc({ act: "save", npc: halbrek }),
      npc({ act: "forget", id: "n1" }),
    ]);
    expect(people.npcs).toEqual([]);
  });
});

describe("log privacy", () => {
  it("keeps both acts behind the DM's screen", () => {
    /* A shopkeeper the DM just wrote down is prep, not something the table
       watched happen — whichever of the two acts fires. */
    expect(isDmOnly(npc({ act: "save", npc: halbrek }))).toBe(true);
    expect(isDmOnly(npc({ act: "forget", id: "n1" }))).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Clock, live, order, isUndone } from "./log";
import { fold } from "./fold";
import { asDevice, type Event } from "./types";

const clock = (name = "a") => new Clock(asDevice(name));

/** A toy reducer. `core` has no domain; the domain supplies one of these. */
const count = (s: number, e: Event) => (e.kind === "tick" ? s + 1 : s);

const shuffle = <T,>(xs: readonly T[], seed: number): T[] => {
  const out = [...xs];
  let r = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    const j = r % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

const logOf = (n: number, c = clock()) => Array.from({ length: n }, () => c.issue("tick"));

describe("the log replays", () => {
  it("state is the fold of the events", () => {
    expect(fold(logOf(5), count, 0)).toBe(5);
  });

  it("folds to the same state whatever order the events arrived in", () => {
    // The property sync depends on: six devices, six arrival orders, one state.
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), fc.integer({ min: 1, max: 1e6 }), (n, seed) => {
        const events = logOf(n);
        expect(fold(shuffle(events, seed), count, 0)).toBe(fold(events, count, 0));
      }),
    );
  });

  it("orders identically on every device", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), fc.integer({ min: 1, max: 1e6 }), (n, seed) => {
        const events = logOf(n);
        expect(order(shuffle(events, seed)).map((e) => e.id)).toEqual(order(events).map((e) => e.id));
      }),
    );
  });
});

describe("undo is an append, never a deletion", () => {
  it("keeps the event and hides it", () => {
    const c = clock();
    const events = [...logOf(3, c)];
    const target = events[1]!;
    events.push(c.undo(target.id));

    expect(events).toHaveLength(4);
    expect(events.some((e) => e.id === target.id)).toBe(true); // still there
    expect(isUndone(events, target.id)).toBe(true); // and not counted
    expect(fold(events, count, 0)).toBe(2);
  });

  it("never shortens the log, for any sequence of undos", () => {
    fc.assert(
      fc.property(fc.array(fc.nat({ max: 9 }), { maxLength: 12 }), (targets) => {
        const c = clock();
        const events: Event[] = logOf(10, c);
        const before = events.length;
        for (const t of targets) events.push(c.undo(events[t]!.id));
        expect(events.length).toBe(before + targets.length);
        expect(live(events).length).toBeLessThanOrEqual(before);
      }),
    );
  });

  it("undoing the same event twice is the same as once", () => {
    const c = clock();
    const events = logOf(3, c);
    const t = events[0]!.id;
    const once = [...events, c.undo(t)];
    const twice = [...once, c.undo(t)];
    expect(fold(twice, count, 0)).toBe(fold(once, count, 0));
  });

  it("undoing an undo is redo, and the chain alternates", () => {
    // A marker can itself be skipped. Resolved newest-first, so an odd number
    // of links hides the event and an even number restores it.
    const c = clock();
    const events: Event[] = logOf(1, c);
    const target = events[0]!.id;
    let last = c.undo(target);
    events.push(last);
    for (let links = 1; links <= 6; links++) {
      expect(isUndone(events, target)).toBe(links % 2 === 1);
      last = c.undo(last.id);
      events.push(last);
    }
  });

  it("skips an event that has not arrived yet", () => {
    // Devices catch up out of order. The fold must not depend on arrival.
    const c = clock();
    const events = logOf(2, c);
    const undo = c.undo(events[0]!.id);
    expect(fold([undo, ...events], count, 0)).toBe(1);
  });
});

describe("the clock", () => {
  it("issues unique ids and a rising sequence", () => {
    const events = logOf(50);
    expect(new Set(events.map((e) => e.id)).size).toBe(50);
    expect(events.every((e, i) => i === 0 || e.seq > events[i - 1]!.seq)).toBe(true);
  });

  it("advances past what another device has already said", () => {
    const a = clock("a");
    const theirs = logOf(5, a);
    const b = clock("b");
    b.witness(theirs);
    const mine = b.issue("tick");
    expect(mine.seq).toBeGreaterThan(theirs.at(-1)!.seq);
  });

  it("never orders by the wall clock", () => {
    // A phone with a wrong clock must not reorder the table's history.
    const c = clock();
    const first = c.issue("tick", {}, 9_000_000);
    const second = c.issue("tick", {}, 1_000);
    expect(order([second, first]).map((e) => e.id)).toEqual([first.id, second.id]);
  });
});

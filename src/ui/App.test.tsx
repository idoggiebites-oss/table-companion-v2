import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../tests/phone";
import { App } from "./App";
import { Clock, live } from "../core/log";
import { openLog } from "../core/persist";
import { fold } from "../core/fold";
import { asDevice, type Event } from "../core/types";
import "../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const db = () => `tc-test-${Math.random().toString(36).slice(2)}`;
const settle = () => new Promise((r) => setTimeout(r, 60));
const tap = (p: Phone, name: string) =>
  [...p.doc.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent) === name)!.click();

/**
 * Events, seeded straight into the store.
 *
 * There used to be an "Append" button on the log screen and these tests
 * pressed it. It was Slice 1's debug rig on a screen a player opens, so it is
 * gone — and a test that needs a long log should not need a button in the
 * product to make one. The events are real `tick`s, the same thing that button
 * wrote, put where it would have put them.
 */
const seed = async (name: string, n: number) => {
  const store = await openLog(name);
  const clock = new Clock(asDevice("seed"));
  await store.append(Array.from({ length: n }, () => clock.issue("tick", {})));
  store.close();
};

/** The app opens on the hub; the log is a screen away. */
const toLog = async (p: Phone) => { tap(p, "Log"); await settle(); };

describe("the shell, on the reference phone", () => {
  it("puts every tap target at 44px", async () => {
    const name = db();
    await seed(name, 1);
    phone = await mountPhone(<App dbName={name} />);
    await settle();
    expect(phone.smallTargets()).toEqual([]); // the hub
    await toLog(phone);
    expect(phone.smallTargets()).toEqual([]); // and the log
  });

  it("fits one screen with nothing in the log", async () => {
    phone = await mountPhone(<App dbName={db()} />);
    await settle();
    expect(phone.screens()).toBeLessThanOrEqual(1.0);
  });

  it("holds its chrome however long the log gets", async () => {
    // A list is allowed to scroll; the header and the action bar are not
    // allowed to leave. You may never scroll to find out what you can do.
    const name = db();
    await seed(name, 40);
    phone = await mountPhone(<App dbName={name} />);
    await settle();
    await toLog(phone);
    const foot = phone.doc.querySelector("footer")!.getBoundingClientRect();
    const head = phone.doc.querySelector("header")!.getBoundingClientRect();
    expect(head.top).toBeGreaterThanOrEqual(0);
    expect(foot.bottom).toBeLessThanOrEqual(844);
    expect(phone.doc.querySelectorAll('[data-testid="event"]')).toHaveLength(40);
  });

  it("paints a real ground in both themes", async () => {
    for (const theme of ["light", "dark"] as const) {
      phone?.destroy();
      phone = await mountPhone(<App dbName={db()} />, theme);
      const bg = phone.doc.defaultView!.getComputedStyle(phone.doc.body).backgroundColor;
      // Parchment, not paper — see DESIGN.md.
      expect(bg).toBe(theme === "light" ? "rgb(250, 247, 242)" : "rgb(19, 20, 22)");
    }
  });
});

describe("the log, through the screen", () => {
  it("shows an undone event still sitting there", async () => {
    const name = db();
    await seed(name, 2);
    phone = await mountPhone(<App dbName={name} />);
    await settle();
    await toLog(phone);

    tap(phone, "Undo: Marked the log");
    await settle();

    const rows = [...phone.doc.querySelectorAll('[data-testid="event"]')];
    /*
     * Two rows, one struck through. The undo marker is no longer a row of its
     * own — V1's rule, and the reason is that a log which prints its own
     * bookkeeping reads as bookkeeping: "the marker shows on the event it
     * undid, not on its own". Nothing was removed; the tick is still there,
     * struck through, which is what makes "undo is not deletion" credible.
     */
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.getAttribute("data-undone") === "yes")).toHaveLength(1);
  });

  it("survives being closed and reopened", async () => {
    const name = db();
    await seed(name, 3);
    phone = await mountPhone(<App dbName={name} />);
    await settle();
    await toLog(phone);

    phone.destroy();
    phone = await mountPhone(<App dbName={name} />);
    await settle();
    await toLog(phone);

    expect(phone.doc.querySelectorAll('[data-testid="event"]')).toHaveLength(3);
  });
});

describe("replay", () => {
  it("folds a campaign-sized log inside one frame", async () => {
    const c = new Clock(asDevice("bench"));
    const events: Event[] = Array.from({ length: 1000 }, () => c.issue("tick"));
    for (let i = 0; i < 100; i++) events.push(c.undo(events[i * 9]!.id));

    const reduce = (n: number, e: Event) => (e.kind === "tick" ? n + 1 : n);
    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      fold(events, reduce, 0);
      runs.push(performance.now() - t);
    }
    const best = Math.min(...runs);
    expect(live(events)).toHaveLength(900);
    // Measured at 0.20ms best-of-5 in headless Chromium on an M-series Mac.
    // The guard is 5ms: 25x headroom, but tight enough that an accidental
    // O(n^2) in `live` would trip it. This is a regression guard, not a phone
    // number — a phone is slower and this has never run on one.
    expect(best).toBeLessThan(5);
    console.log(`  fold(1100 events) best of 5: ${best.toFixed(2)}ms`);
  });
});

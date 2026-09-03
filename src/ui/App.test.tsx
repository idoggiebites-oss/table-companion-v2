import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../tests/phone";
import { App } from "./App";
import { Clock, live } from "../core/log";
import { fold } from "../core/fold";
import { asDevice, type Event } from "../core/types";
import "../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const db = () => `tc-test-${Math.random().toString(36).slice(2)}`;
const settle = () => new Promise((r) => setTimeout(r, 60));
const tap = (p: Phone, name: string) =>
  [...p.doc.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent) === name)!.click();

/** The app opens on the hub; the log is a screen away. */
const toLog = async (p: Phone) => { tap(p, "Log"); await settle(); };

describe("the shell, on the reference phone", () => {
  it("puts every tap target at 44px", async () => {
    phone = await mountPhone(<App dbName={db()} />);
    await settle();
    expect(phone.smallTargets()).toEqual([]); // the hub
    await toLog(phone);
    tap(phone, "Append");
    await settle();
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
    phone = await mountPhone(<App dbName={db()} />);
    await settle();
    await toLog(phone);
    for (let i = 0; i < 40; i++) tap(phone, "Append");
    await settle();
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
    phone = await mountPhone(<App dbName={db()} />);
    await settle();
    await toLog(phone);
    tap(phone, "Append");
    tap(phone, "Append");
    await settle();

    tap(phone, "Undo event 1");
    await settle();

    const rows = [...phone.doc.querySelectorAll('[data-testid="event"]')];
    // Three rows: two ticks and the undo marker. Nothing was removed.
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.getAttribute("data-undone") === "yes")).toHaveLength(1);
    expect(phone.doc.body.textContent).toContain("1 live");
  });

  it("survives being closed and reopened", async () => {
    const name = db();
    phone = await mountPhone(<App dbName={name} />);
    await settle();
    await toLog(phone);
    tap(phone, "Append");
    tap(phone, "Append");
    tap(phone, "Append");
    await settle();

    phone.destroy();
    phone = await mountPhone(<App dbName={name} />);
    await settle();
    await toLog(phone);

    expect(phone.doc.querySelectorAll('[data-testid="event"]')).toHaveLength(3);
    expect(phone.doc.body.textContent).toContain("3 live");
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

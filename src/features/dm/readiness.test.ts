import { describe, it, expect } from "vitest";
import { describeReadiness, readinessOf, NOTHING } from "./readiness";
import { blankSession, type Prepared } from "./session";

const none = { encounters: 0, places: 0, people: 0 };
const some = { encounters: 1, places: 0, people: 0 };
const session = (over: Partial<Prepared> = {}): Prepared =>
  ({ ...blankSession("s1"), title: "The Shattered Keep", ...over });

describe("what it is honest to count", () => {
  it("says nothing at all when there is no session", () => {
    /* Not 0% — not started and nought are different facts, and they read
       completely differently to somebody who has just opened the app. */
    expect(readinessOf(null, none)).toEqual(NOTHING);
    expect(describeReadiness(NOTHING)).toBe("Nothing prepared yet.");
  });

  it("but a real session with nothing done IS zero, because that is true", () => {
    const r = readinessOf(session(), none);
    expect(r.percent).toBe(0);
    expect(r.total).toBeGreaterThan(0);
  });

  it("never mentions a thing this app cannot do", () => {
    /*
     * The mockup lists "Boss treasure" and "Session ending notes". There is no
     * loot and no notes screen, so neither may appear: a row that goes nowhere
     * is a dead link, and a percentage that can never reach 100 is a permanent
     * accusation.
     */
    const labels = readinessOf(session(), some).checks.map((c) => c.label.toLowerCase());
    for (const absent of ["treasure", "loot", "quest", "notes", "table", "reference"]) {
      expect(labels.some((l) => l.includes(absent)), absent).toBe(false);
    }
  });

  it("asks whether a thing exists, never how many", () => {
    /*
     * The mockup counts "3 encounters prepared". Three is not a rule of the
     * game or of this table — a social night needs none and a crawl needs
     * eight — so one of anything satisfies it, and the count does not appear.
     */
    const one = readinessOf(session(), { encounters: 1, places: 0, people: 0 });
    const many = readinessOf(session(), { encounters: 9, places: 4, people: 7 });
    expect(one.done).toBe(many.done);
    expect(one.checks.find((c) => c.id === "something")?.label).not.toMatch(/\d/);
  });

  it("counts a place or a person as something prepared, not only a fight", () => {
    for (const have of [
      { encounters: 1, places: 0, people: 0 },
      { encounters: 0, places: 1, people: 0 },
      { encounters: 0, places: 0, people: 1 },
    ]) {
      expect(readinessOf(session(), have).checks.find((c) => c.id === "something")?.done).toBe(true);
    }
    expect(readinessOf(session(), none).checks.find((c) => c.id === "something")?.done).toBe(false);
  });
});

describe("the DM's own lines", () => {
  it("lead, because they are the ones about tonight in particular", () => {
    const r = readinessOf(
      session({ checklist: [{ id: "a", label: "Name the innkeeper", done: false }] }),
      none,
    );
    expect(r.checks[0]?.label).toBe("Name the innkeeper");
    expect(r.checks[0]?.own).toBe(true);
    expect(r.checks.slice(1).every((c) => !c.own)).toBe(true);
  });

  it("count toward the total, ticked or not", () => {
    const two = session({ checklist: [
      { id: "a", label: "One", done: true },
      { id: "b", label: "Two", done: false },
    ] });
    const r = readinessOf(two, none);
    expect(r.total).toBe(5);
    expect(r.done).toBe(1);
    expect(r.percent).toBe(20);
  });
});

describe("what it says", () => {
  it("gives the fraction, because that says what to do next", () => {
    const r = readinessOf(session({ opening: "Previously…", goals: ["Reach the keep"] }), some);
    expect(describeReadiness(r)).toBe("3 of 3 ready");
    expect(r.percent).toBe(100);
  });

  it("reaches 100 on a session that is genuinely finished", () => {
    /* If it cannot be finished, it is an accusation rather than an overview. */
    const r = readinessOf(
      session({
        opening: "Previously…", goals: ["Reach the keep"],
        checklist: [{ id: "a", label: "Name the innkeeper", done: true }],
      }),
      some,
    );
    expect(r.percent).toBe(100);
  });
});

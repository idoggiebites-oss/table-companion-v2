import { describe, it, expect } from "vitest";
import { blankSession, isNamed, sessionsFrom, SESSION, type Prepared } from "./session";
import { isDmOnly } from "../room/visibility";
import { sessions as playedSessions } from "../room/recap";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (kind: string, data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: asDevice("d1"), at: n, data } as Event);
const session = (a: Record<string, unknown>) => ev(SESSION, a);

const heist: Prepared = { ...blankSession("s1"), title: "The Vault Job", number: 3, date: "2026-09-10" };

describe("a planned session", () => {
  it("needs only a title to be worth keeping", () => {
    expect(isNamed(blankSession("s1"))).toBe(false);
    expect(isNamed({ ...blankSession("s1"), title: "The Vault Job" })).toBe(true);
    expect(isNamed({ ...blankSession("s1"), title: "   " })).toBe(false);
  });
});

describe("saving and forgetting one", () => {
  it("keeps it", () => {
    expect(sessionsFrom([session({ act: "save", session: heist })]).sessions[0]?.title)
      .toBe("The Vault Job");
  });

  it("and lets it go", () => {
    expect(sessionsFrom([
      session({ act: "save", session: heist }),
      session({ act: "forget", id: "s1" }),
    ]).sessions).toEqual([]);
  });

  it("overwrites rather than duplicating when it is edited", () => {
    const s = sessionsFrom([
      session({ act: "save", session: heist }),
      session({ act: "save", session: { ...heist, title: "The Vault Job, Reprise" } }),
    ]).sessions;
    expect(s).toHaveLength(1);
    expect(s[0]?.title).toBe("The Vault Job, Reprise");
  });
});

describe("what a player may read about it", () => {
  it("nothing — a session plan is prep from end to end, like a scene", () => {
    expect(isDmOnly(session({ act: "save", session: heist }))).toBe(true);
    expect(isDmOnly(session({ act: "forget", id: "s1" }))).toBe(true);
  });
});

describe("the OTHER session, `recap.ts`'s", () => {
  it("is unaffected by a session.act event in the log — it derives from gaps, not this kind", () => {
    /*
     * The whole point of naming this `Prepared`: a `session.act` event must
     * not change what `recap.ts` thinks a played night looked like. If it
     * did, the two would be conflated exactly the way the brief forbids.
     */
    const log = [
      { ...session({ act: "save", session: heist }), at: 0 },
      { ...ev("fight.act", { act: "begin" }), at: 1000 },
    ];
    expect(playedSessions(log)).toHaveLength(1);
    expect(playedSessions(log)[0]?.events).toHaveLength(2); // includes the session.act event verbatim
  });
});

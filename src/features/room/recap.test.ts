import { describe, it, expect } from "vitest";
import { andList, inWords, isEmpty, recapOf, sessions, spelled, whenWas, SESSION_GAP_MS } from "./recap";
import { logFor } from "./visibility";
import { FIGHT } from "../dm/fight";
import { VITAL } from "../sheet/model";
import { CHOICE } from "../creation/model";
import { TAKE } from "../progression/model";
import { SCENE } from "../dm/scene";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const at = (ms: number, kind: string, data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: asDevice("d1"), at: ms, data } as Event);
const HOUR = 3_600_000;
const names: Record<string, string> = { b1: "Kira", b2: "Bel", b3: "Sam" };
const nameOf = (id: string) => names[id] ?? id;
const one = (events: readonly Event[]) => recapOf(sessions(events)[0]!, nameOf);

describe("where a session ends", () => {
  it("splits on a gap and not on a long night", () => {
    /* A game past midnight is one session; a week later is not. There is no
       "end the session" button, because that is one more thing to forget. */
    const long = [at(0, VITAL, {}), at(5 * HOUR, VITAL, {}), at(5.9 * HOUR, VITAL, {})];
    expect(sessions(long)).toHaveLength(1);
    expect(sessions([...long, at(5.9 * HOUR + SESSION_GAP_MS + 1, VITAL, {})])).toHaveLength(2);
  });

  it("reads the log forwards, whatever order it arrives in", () => {
    const s = sessions([at(200, VITAL, {}), at(100, VITAL, {}), at(300, VITAL, {})]);
    expect(s[0]?.startedAt).toBe(100);
    expect(s[0]?.endedAt).toBe(300);
  });
});

describe("the shape of a night", () => {
  it("says where, how many fights, and who took the worst of it", () => {
    const r = one([
      at(1, FIGHT, { act: "room", room: { light: "dark", terrain: ["difficult"] } }),
      at(2, FIGHT, { act: "begin" }),
      at(3, VITAL, { act: "damage", n: 7, character: "b1" }),
      at(4, VITAL, { act: "damage", n: 11, character: "b2" }),
      at(5, FIGHT, { act: "begin" }),
    ]);
    expect(r.lines).toContain("You fought in dark, difficult ground.");
    expect(r.lines).toContain("Two fights.");
    expect(r.lines).toContain("The hardest hit of the night landed on Bel, for 11.");
    expect(r.counts).toContainEqual({ label: "Damage taken", value: "18" });
  });

  it("names who went down, and who did not get back up", () => {
    const r = one([
      at(1, VITAL, { act: "death", result: "failure", character: "b1" }),
      at(2, VITAL, { act: "death", result: "success", character: "b2" }),
      at(3, VITAL, { act: "death", result: "failure", character: "b1" }),
      at(4, VITAL, { act: "death", result: "failure", character: "b1" }),
    ]);
    expect(r.lines).toContain("Kira and Bel went down — and Kira did not get back up.");
  });

  it("counts three failures the way the sheet does, and no fewer", () => {
    const r = one([
      at(1, VITAL, { act: "death", result: "failure", character: "b1" }),
      at(2, VITAL, { act: "death", result: "failure", character: "b1" }),
      at(3, VITAL, { act: "death", result: "clear", character: "b1" }),
    ]);
    expect(r.lines).toContain("Kira went down.");
    expect(r.lines.join(" ")).not.toContain("did not get back up");
  });

  it("says what a night left behind", () => {
    /* Exhaustion is the one condition that survives a long rest, so it is the
       only thing here still true when the table sits down again. */
    const r = one([
      at(1, VITAL, { act: "exhaustion", n: 2, character: "b3" }),
      at(2, VITAL, { act: "rest", length: "long" }),
      at(3, VITAL, { act: "rest", length: "short" }),
      at(4, TAKE, { klass: "fighter", classLevel: 4, hp: 7, character: "b1" }),
    ]);
    expect(r.lines).toContain("Sam finished the night exhausted.");
    expect(r.lines).toContain("Kira levelled.");
    expect(r.counts).toContainEqual({ label: "Rests", value: "1 short, 1 long" });
  });

  it("does not call making a character levelling up", () => {
    /*
     * Creation's "what level are you starting at?" reduces to the same `level`
     * step a sheet would, so reading that made every newly rolled character
     * "level up" on the night it was made. Taking a level is its own event.
     */
    const r = one([at(1, CHOICE, { step: "level", level: 3, character: "b1" })]);
    expect(r.lines.join(" ")).not.toContain("levelled");
    expect(isEmpty(r)).toBe(true);
  });

  it("says nothing at all about a night where nothing happened", () => {
    /* The app was opened and closed. A recap that manufactured a sentence out
       of that would teach the table to stop believing the ones that matter. */
    expect(isEmpty(one([at(1, VITAL, { act: "temp", n: 0, character: "b1" })]))).toBe(true);
  });
});

describe("what it refuses to say", () => {
  it("invents no experience, no loot and no natural twenty", () => {
    /*
     * V1 reads all three off events V2 does not record. A claim carries a
     * TOTAL with the player's modifier already inside it, so the die is not
     * recoverable — and guessing at somebody's best moment of the night is
     * the worst thing on that list to get wrong.
     */
    const r = one([
      at(1, FIGHT, { act: "claim", claim: { id: "c1", who: "b1", whoName: "Kira",
        targetId: "g1", weapon: "Longsword", toHit: 20, damage: 8, damageType: "slashing" } }),
      at(2, FIGHT, { act: "verdict", claim: "c1", lands: true }),
    ]);
    const all = [...r.lines, ...r.counts.map((c) => c.value)].join(" ").toLowerCase();
    expect(all).not.toContain("twenty");
    expect(all).not.toContain("xp");
    expect(all).not.toContain("loot");
  });

  it("is built from the log it is HANDED, so a player's recap is a player's log", () => {
    /*
     * The whole per-reader design. `logFor` has already removed the DM's prep,
     * so a scene prepared behind the screen cannot reach a player's recap
     * sideways — and the room the DM set live still can, because the table
     * watched that happen.
     */
    const events = [
      at(1, SCENE, { act: "prepare", scene: { id: "s1", name: "The cellar",
        room: { light: "dark", terrain: [] } } }),
      at(2, FIGHT, { act: "stage", id: "g1", name: "Ghoul",
        source: { kind: "creature", statblock: "ghoul", max: 22, ac: 12 } }),
      at(3, FIGHT, { act: "room", room: { light: "dark", terrain: [] } }),
      at(4, FIGHT, { act: "begin" }),
    ];
    const player = recapOf(sessions(logFor(events, false))[0]!, nameOf);
    expect(player.lines).toContain("You fought in dark.");
    expect(player.lines).toContain("One fight.");
    expect(player.lines.join(" ")).not.toContain("cellar");

    /* And the DM's own recap is built the same way, from more events. */
    const dm = recapOf(sessions(logFor(events, true))[0]!, nameOf);
    expect(dm.lines).toEqual(player.lines);
  });
});

describe("saying it out loud", () => {
  it("spells small numbers, because 3 fights reads like a spreadsheet", () => {
    expect(inWords(3)).toBe("three");
    expect(inWords(11)).toBe("11");
    expect(spelled(1, "fight")).toBe("one fight");
    expect(spelled(2, "fight")).toBe("two fights");
  });

  it("joins names the way a person would", () => {
    expect(andList([])).toBe("");
    expect(andList(["Kira"])).toBe("Kira");
    expect(andList(["Kira", "Bel"])).toBe("Kira and Bel");
    expect(andList(["Kira", "Bel", "Sam"])).toBe("Kira, Bel and Sam");
  });

  it("dates a session the way a table refers to one", () => {
    const now = new Date("2026-09-03T20:00:00").getTime();
    const days = (n: number) => now - n * 86_400_000;
    expect(whenWas(now, now)).toBe("today");
    expect(whenWas(days(1), now)).toBe("yesterday");
    expect(whenWas(days(3), now)).toBe("3 days ago");
    expect(whenWas(days(9), now)).toBe("last week");
    expect(whenWas(days(21), now)).toBe("3 weeks ago");
  });
});

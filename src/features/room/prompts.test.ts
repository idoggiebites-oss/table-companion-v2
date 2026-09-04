import { describe, it, expect } from "vitest";
import { promptsFor } from "./prompts";
import { NO_FIGHT, type Fight } from "../dm/fight";
import type { Member } from "../dm/members";
import type { Vitals } from "../sheet/model";
import { EMPTY_DEATHS } from "../../rules/5e/vitals";

const DM_TABS = ["party", "fight", "prep", "characters", "log"];
const PLAYER_TABS = ["sheet", "characters", "log"];

const vitals = (hp: number, max = 24, over: Partial<Vitals> = {}): Vitals => ({
  health: { hp, max, temp: 0, dying: hp === 0, dead: false },
  deaths: EMPTY_DEATHS, conditions: [], exhaustion: 0,
  concentrating: null, inspiration: false, spent: {}, attacks: [],
  ...over,
} as Vitals);

const member = (name: string, over: Partial<Member> = {}): Member => ({
  id: name.toLowerCase(), name, kind: "Fighter 3", hp: 10, max: 24, temp: 0,
  step: "injured", ac: 16, conditions: [], waiting: [], dying: false, dead: false,
  ...over,
} as Member);

const ids = (p: readonly { id: string }[]) => p.map((x) => x.id);

describe("what a player is asked", () => {
  it("says what is true right now, with the number from the log", () => {
    const p = promptsFor({ dm: false, tabs: PLAYER_TABS, fight: NO_FIGHT, vitals: vitals(7) });
    expect(p.map((x) => x.text)).toContain("You are on 7 of 24 hit points.");
    expect(p[0]?.go).toBe("sheet");
  });

  it("says nothing to somebody at full health", () => {
    expect(promptsFor({ dm: false, tabs: PLAYER_TABS, fight: NO_FIGHT, vitals: vitals(24) }))
      .toEqual([]);
  });

  it("does not tell the dead the worst thing twice", () => {
    /* The recap has already said they did not get back up. "You are on 0 of
       24" underneath it is the app saying it again. */
    const dead = vitals(0, 24, { health: { hp: 0, max: 24, temp: 0, dying: false, dead: true } } as Partial<Vitals>);
    expect(ids(promptsFor({ dm: false, tabs: PLAYER_TABS, fight: NO_FIGHT, vitals: dead })))
      .not.toContain("still-hurt");
  });

  it("leads with what is owed right now, in `waitingOn`'s own words", () => {
    /* One phrasing, shared with the sheet and the tab dot. A second one here
       would be a second thing to keep in agreement. */
    const dying = vitals(0, 24, {
      health: { hp: 0, max: 24, temp: 0, dying: true, dead: false },
    } as Partial<Vitals>);
    const p = promptsFor({ dm: false, tabs: PLAYER_TABS, fight: NO_FIGHT, vitals: dying });
    expect(p[0]?.text).toContain("Death saves");
  });
});

describe("what the DM is asked", () => {
  const running: Fight = { ...NO_FIGHT, phase: "active", round: 3 };

  it("names an unfinished fight and the round it is on", () => {
    const p = promptsFor({ dm: true, tabs: DM_TABS, fight: running, scenes: 1, encounters: 1 });
    expect(p.map((x) => x.text)).toContain("A fight is still running — round 3.");
  });

  it("names who is down, because 'somebody' makes you go and look", () => {
    const p = promptsFor({
      dm: true, tabs: DM_TABS, fight: NO_FIGHT, scenes: 1, encounters: 1,
      party: [member("Kira", { dying: true }), member("Bel")],
    });
    expect(p.map((x) => x.text)).toContain("Kira is still down.");
  });

  it("counts down and owed separately, and never both about one person", () => {
    /* Somebody dying already has a prompt; adding "and has something owed"
       about the same person is the same fact twice. */
    const p = promptsFor({
      dm: true, tabs: DM_TABS, fight: NO_FIGHT, scenes: 1, encounters: 1,
      party: [member("Kira", { dying: true, waiting: ["Death saves: 0 of 3 made, 1 of 3 failed."] })],
    });
    expect(ids(p)).toContain("down");
    expect(ids(p)).not.toContain("owed");
  });

  it("says when there is nothing prepared at all", () => {
    const p = promptsFor({ dm: true, tabs: DM_TABS, fight: NO_FIGHT, scenes: 0, encounters: 0 });
    expect(p.map((x) => x.text)).toContain("Nothing is prepared: no places, no encounters.");
  });

  it("and when there is a fight kept but nowhere to put it", () => {
    const p = promptsFor({ dm: true, tabs: DM_TABS, fight: NO_FIGHT, scenes: 0, encounters: 2 });
    expect(p.map((x) => x.text)).toContain("Two encounters kept, and nowhere to put them.");
  });

  it("says nothing when the night is finished and the prep is done", () => {
    expect(promptsFor({ dm: true, tabs: DM_TABS, fight: NO_FIGHT, scenes: 2, encounters: 2 }))
      .toEqual([]);
  });
});

describe("a prompt with nowhere to go is not shown", () => {
  it("drops one whose screen this seat does not have", () => {
    /*
     * V1's PROMPT_TABS rule, and the acceptance criterion. A player has no
     * Prep tab, so a prep prompt must not reach them — the app offering
     * something and then not having it is worse than saying nothing.
     */
    const p = promptsFor({ dm: true, tabs: ["party", "log"], fight: NO_FIGHT, scenes: 0, encounters: 0 });
    expect(ids(p)).not.toContain("nothing-prepared");
  });

  it("drops the fight prompt until a Fight tab exists", () => {
    /* The tab appears only when a fight is running, which is exactly when the
       prompt is true — so this is one rule, checked in one place. */
    const running: Fight = { ...NO_FIGHT, phase: "active", round: 1 };
    expect(ids(promptsFor({ dm: true, tabs: ["party", "prep", "log"], fight: running, scenes: 1, encounters: 1 })))
      .not.toContain("fight-open");
  });
});

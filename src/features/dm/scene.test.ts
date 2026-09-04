import { describe, it, expect } from "vitest";
import {
  blankScene, describeScene, isNamed, openActs, scenesFrom, sortScenes, SCENE, type Scene,
} from "./scene";
import type { Encounter } from "./encounter";
import { fightFrom, FIGHT, type Act } from "./fight";
import { isDmOnly } from "../room/visibility";
import { PREP } from "./encounter";
import { OPEN_GROUND } from "../../rules/5e/terrain";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (kind: string, data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: asDevice("d1"), at: n, data } as Event);
const scene = (s: Record<string, unknown>) => ev(SCENE, s);
const fight = (a: Act) => ev(FIGHT, a as unknown as Record<string, unknown>);

const cellar: Scene = { id: "s1", name: "The cellar", room: OPEN_GROUND };

describe("a place", () => {
  it("needs only a name to be worth keeping", () => {
    expect(isNamed(blankScene("s1"))).toBe(false);
    expect(isNamed({ ...blankScene("s1"), name: "The cellar" })).toBe(true);
    expect(isNamed({ ...blankScene("s1"), name: "   " })).toBe(false);
  });

  it("says what is IN it, not what it is called", () => {
    /* A list where every row repeats its own title tells you nothing. */
    expect(describeScene({ ...blankScene("s1"), name: "The cellar" }))
      .toBe("open ground, nothing waiting");
    expect(describeScene(
      {
        id: "s1", name: "The cellar",
        room: { light: "dark", terrain: ["difficult"] },
        note: "the letter is in the desk",
      },
      "Three ghouls",
    )).toBe("dark · 1 thing about the ground · Three ghouls · a note");
  });

  it("puts the one you just wrote first", () => {
    const a = { ...blankScene("s1"), name: "First" };
    const b = { ...blankScene("s2"), name: "Second" };
    expect(sortScenes([a, b]).map((x) => x.name)).toEqual(["Second", "First"]);
  });
});

describe("preparing and throwing away", () => {
  it("keeps it", () => {
    expect(scenesFrom([scene({ act: "prepare", scene: cellar })]).scenes[0]?.name)
      .toBe("The cellar");
  });

  it("and lets it go", () => {
    expect(scenesFrom([
      scene({ act: "prepare", scene: cellar }),
      scene({ act: "forget", id: "s1" }),
    ]).scenes).toEqual([]);
  });

  it("overwrites rather than duplicating when it is edited", () => {
    const s = scenesFrom([
      scene({ act: "prepare", scene: cellar }),
      scene({ act: "prepare", scene: { ...cellar, name: "The deep cellar" } }),
    ]).scenes;
    expect(s).toHaveLength(1);
    expect(s[0]?.name).toBe("The deep cellar");
  });
});

describe("what a player may read about it", () => {
  it("nothing — preparing a place is prep", () => {
    /* "Prepared the cellar · dark · a note" tells them what is coming. */
    expect(isDmOnly(scene({ act: "prepare", scene: cellar }))).toBe(true);
    expect(isDmOnly(scene({ act: "forget", id: "s1" }))).toBe(true);
  });

  it("nor a kept encounter, which V2 was printing to the table", () => {
    /*
     * The default for a non-fight event is public, and it was quietly wrong
     * for the one kind that is prep from end to end. Fixed at the root rather
     * than per feature, so this holds for places too.
     */
    expect(isDmOnly(ev(PREP, { act: "keep", encounter: { id: "e1" } }))).toBe(true);
  });

  it("but putting one live IS public, because the table can see the room", () => {
    expect(isDmOnly(fight({ act: "room", room: { light: "dark", terrain: [] } }))).toBe(false);
  });
});

describe("the room a fight is fought in", () => {
  it("survives the fight actually starting", () => {
    /*
     * V1's regression, guarded here because V2 can reproduce it: a DM sets the
     * room while the table is still rolling initiative, which is when there is
     * time to. If `begin` rebuilt the fight the room went back to open ground,
     * so it was only ever kept if it was said late.
     */
    const f = fightFrom([
      fight({ act: "stage", id: "c1", name: "Kira",
              source: { kind: "character", character: "b1" }, disclosure: "exact" }),
      fight({ act: "room", room: { light: "dark", terrain: ["difficult"] } }),
      fight({ act: "roll", id: "c1", value: 15 }),
      fight({ act: "begin" }),
    ]);
    expect(f.phase).toBe("active");
    expect(f.room.light).toBe("dark");
  });

  it("and clearing the table takes it back to open ground", () => {
    /* Which is why opening a place must clear FIRST and set the room after. */
    const f = fightFrom([
      fight({ act: "room", room: { light: "dark", terrain: [] } }),
      fight({ act: "clear" }),
    ]);
    expect(f.room).toEqual(OPEN_GROUND);
  });
});

describe("opening one, in a press", () => {
  const ghouls: Encounter = {
    id: "e1", name: "Three ghouls", place: "",
    entries: [{ statblock: "ghoul", name: "Ghoul", count: 3, max: 22, ac: 12, cr: 1, disclosure: "hidden" }],
  };
  const dark: Scene = {
    id: "s1", name: "The cellar", encounter: "e1",
    room: { light: "dark", terrain: ["difficult"] },
  };
  const id = (i: number) => `c${String(i)}`;

  it("clears first and sets the room LAST", () => {
    /*
     * The ordering is the whole guard. `clear` returns `NO_FIGHT`, and
     * `NO_FIGHT` is open ground — so a room set before the clear is wiped, and
     * a place prepared as pitch dark opens in daylight. Which is the exact
     * failure places exist to prevent.
     */
    const acts = openActs(dark, ghouls, id);
    expect(acts[0]).toEqual({ act: "clear" });
    expect(acts[acts.length - 1]).toEqual({ act: "room", room: dark.room });
  });

  it("puts the room and the creatures on the table together", () => {
    const f = fightFrom(openActs(dark, ghouls, id).map((a) => fight(a)));
    expect(f.room).toEqual({ light: "dark", terrain: ["difficult"] });
    expect(f.combatants).toHaveLength(3);
    /* Staged hidden, as anything the DM runs is: opening a place is still
       preparation, not narration. */
    expect(f.combatants.every((c) => c.disclosure === "hidden")).toBe(true);
  });

  it("opens an empty place as an empty table in the room it says", () => {
    const { encounter: _none, ...empty } = dark;
    const f = fightFrom(openActs(empty, undefined, id).map(fight));
    expect(f.combatants).toEqual([]);
    expect(f.room.light).toBe("dark");
  });

  it("and a place with nothing said about the room clears whatever the last one set", () => {
    const before = openActs(dark, ghouls, id).map(fight);
    const f = fightFrom([...before, ...openActs(blankScene("s2"), undefined, id).map(fight)]);
    expect(f.room).toEqual(OPEN_GROUND);
    expect(f.combatants).toEqual([]);
  });
});

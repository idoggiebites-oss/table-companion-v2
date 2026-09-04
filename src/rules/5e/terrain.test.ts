import { describe, it, expect } from "vitest";
import {
  describeRoom, isOpenGround, OPEN_GROUND, roomEffects, type Room,
} from "./terrain";

const room = (r: Partial<Room> = {}): Room => ({ ...OPEN_GROUND, ...r });

describe("what the room does to an attack", () => {
  it("says nothing about an open field", () => {
    expect(roomEffects(OPEN_GROUND, { range: "Melee" })).toEqual([]);
    expect(roomEffects(OPEN_GROUND, { range: "Ranged" })).toEqual([]);
  });

  it("troubles arrows in a gale and not swords", () => {
    /*
     * The narrowness is the point. An app that shrugged and applied
     * disadvantage to everything would be easier to write and wrong often
     * enough that a table stops believing it.
     */
    const gale = room({ terrain: ["wind"] });
    expect(roomEffects(gale, { range: "Ranged" })).toHaveLength(1);
    expect(roomEffects(gale, { range: "Melee" })).toEqual([]);
  });

  it("and underwater the other way round", () => {
    const deep = room({ terrain: ["underwater"] });
    expect(roomEffects(deep, { range: "Melee" })).toHaveLength(1);
    expect(roomEffects(deep, { range: "Ranged" })).toEqual([]);
  });

  it("blinds everyone in fog, whatever they are swinging", () => {
    const fog = room({ terrain: ["obscured"] });
    for (const range of ["Melee", "Ranged"] as const) {
      expect(roomEffects(fog, { range })[0]?.because).toBe("you cannot see through it");
    }
  });

  it("says WHY, never just that it is worse", () => {
    /* "Disadvantage" alone teaches nothing; the reason teaches the rule. */
    expect(roomEffects(room({ terrain: ["unstable"] }), { range: "Melee" }))
      .toEqual([{ effect: "disadvantage", because: "you cannot plant your feet" }]);
  });

  it("carries the dark without ruling on it", () => {
    /*
     * Fighting blind plainly matters, and saying so correctly needs
     * darkvision, which needs senses on a combatant. A guess here would hand
     * disadvantage to the dwarf who can see perfectly well — so the room says
     * "dark" to the table and the table rules on it.
     */
    expect(roomEffects(room({ light: "dark" }), { range: "Melee" })).toEqual([]);
    expect(describeRoom(room({ light: "dark" }))).toBe("dark");
  });
});

describe("saying what the room is", () => {
  it("knows when nothing has been said about it", () => {
    expect(isOpenGround(OPEN_GROUND)).toBe(true);
    expect(isOpenGround(room({ light: "dim" }))).toBe(false);
    expect(isOpenGround(room({ terrain: ["silence"] }))).toBe(false);
  });

  it("reads as a table would say it out loud", () => {
    expect(describeRoom(room({ light: "dark", terrain: ["difficult", "wind"] })))
      .toBe("dark · difficult ground · strong wind");
  });

  it("says nothing at all about bright open ground", () => {
    expect(describeRoom(OPEN_GROUND)).toBe("");
  });
});

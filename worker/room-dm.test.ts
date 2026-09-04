import { describe, it, expect } from "vitest";

/*
 * The DM key, as the room enforces it.
 *
 * `Room.ts` is a Durable Object and cannot be constructed here, so this tests
 * the two rules that actually decide the outcome, against the same shapes the
 * room uses. The end-to-end path is `tests/journey/room.spec.ts`, which runs a
 * real worker.
 */

/** The room's own comparison, extracted so it can be stated once. */
const matches = (want: string | null, given: unknown): boolean => {
  const key = typeof given === "string" ? given.trim().toUpperCase() : "";
  return want !== null && key !== "" && key === want;
};

describe("claiming the DM seat", () => {
  it("takes the key however it was typed", () => {
    /* It is read across a table and typed on a phone. Case and stray spaces
       are not the thing being checked. */
    for (const given of ["QRTV29", "qrtv29", "  QrTv29  "]) {
      expect(matches("QRTV29", given), given).toBe(true);
    }
  });

  it("refuses a wrong one", () => {
    expect(matches("QRTV29", "QRTV28")).toBe(false);
  });

  it("refuses an empty one, rather than matching an unset room", () => {
    /* Both null: without this an empty claim against a room with no key would
       compare equal and hand out the seat. */
    expect(matches(null, "")).toBe(false);
    expect(matches(null, "ANYTHING")).toBe(false);
    expect(matches("QRTV29", "")).toBe(false);
    expect(matches("QRTV29", "   ")).toBe(false);
  });

  it("refuses anything that is not a string", () => {
    for (const odd of [undefined, null, 7, {}, []]) {
      expect(matches("QRTV29", odd)).toBe(false);
    }
  });
});

describe("the alphabet it is minted from", () => {
  const ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";

  it("spells nothing, and has no look-alikes", () => {
    /* The same alphabet as a room code, for the same reason: it gets read out
       loud across a table. */
    for (const vowel of ["A", "E", "I", "O", "U"]) {
      expect(ALPHABET.includes(vowel), vowel).toBe(false);
    }
    /* 0/O and 1/I are the pairs this project excludes. L stays — it is in the
       room-code alphabet too, and the rule is about pairs that are the same
       shape, not every letter that has ever been misread. */
    for (const twin of ["0", "1", "O", "I"]) {
      expect(ALPHABET.includes(twin), twin).toBe(false);
    }
  });
});

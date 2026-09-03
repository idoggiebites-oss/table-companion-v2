import { describe, it, expect } from "vitest";
import { mayEditCharacter, mayEditCreature, DEFAULT_RULES } from "./permissions";

const DM = null;

describe("who may change a character's sheet", () => {
  it("lets a player change their own", () => {
    expect(mayEditCharacter("c1", "c1")).toBe(true);
  });

  it("does not let a player change somebody else's", () => {
    /* Not security — the log would take it. It stops the wrong sheet being
       edited, which is the accident that actually happens at a table. */
    expect(mayEditCharacter("c1", "c2")).toBe(false);
  });

  it("lets the DM change anyone's, by default and on purpose", () => {
    /* Waiting for a player to find the right field mid-combat is slower than
       the DM typing it while narrating, and speed is the point. It is only
       acceptable because every change is attributed and reversible. */
    expect(mayEditCharacter(DM, "c1")).toBe(true);
    expect(DEFAULT_RULES.dmMayEditCharacters).toBe(true);
  });

  it("lets a table turn that off", () => {
    expect(mayEditCharacter(DM, "c1", { dmMayEditCharacters: false })).toBe(false);
  });

  it("still lets a player edit their own when the table has turned the DM off", () => {
    expect(mayEditCharacter("c1", "c1", { dmMayEditCharacters: false })).toBe(true);
  });
});

describe("who may change a creature", () => {
  it("is the DM, always", () => {
    expect(mayEditCreature(DM)).toBe(true);
  });

  it("is never a player — they roll damage, the DM applies it", () => {
    /* The claim seam. A player who could apply their own damage would learn a
       creature's armour class by trial. */
    expect(mayEditCreature("c1")).toBe(false);
  });
});

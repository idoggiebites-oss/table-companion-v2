import { describe, it, expect } from "vitest";
import { castableBy } from "./spells";

const AID = { classes: ["school: abjuration", "cleric", "paladin", "sorcerer (clockwork soul)", "artificer"] };
const FIREBALL = { classes: ["school: evocation", "sorcerer", "wizard", "cleric (light domain)"] };
const SACRED_FLAME = { classes: ["cleric", "wizard (school of invention (ua))"] };
const FIRE_BOLT = { classes: ["school: evocation", "sorcerer", "wizard", "fighter (eldritch knight)"] };

describe("whether this character can cast it", () => {
  it("takes a bare class name", () => {
    expect(castableBy(FIREBALL, "wizard")).toBe(true);
    expect(castableBy(FIREBALL, "cleric")).toBe(false);
  });

  /*
   * `key()` strips parentheses, so "sorcerer (clockwork soul)" became
   * "sorcerer" and put Aid, Bane and Bless on a plain sorcerer's list.
   */
  it("does not let a subclass entry pass as the bare class", () => {
    expect(castableBy(AID, "sorcerer")).toBe(false);
    expect(castableBy(SACRED_FLAME, "wizard")).toBe(false);
    expect(castableBy(FIRE_BOLT, "fighter")).toBe(false);
  });

  /*
   * V1's own example, and the reason a bare-only match is wrong: an exact
   * match hides Fireball from a Light cleric, who genuinely has it. V1 took
   * every unmarked qualifier because its call site did not know the
   * subclass; V2 does, so it can be exact in both directions.
   */
  it("gives a subclass what its subclass grants, and nobody else", () => {
    expect(castableBy(FIREBALL, "cleric", "Light Domain")).toBe(true);
    expect(castableBy(FIREBALL, "cleric", "Life Domain")).toBe(false);
    expect(castableBy(AID, "sorcerer", "Clockwork Soul")).toBe(true);
    expect(castableBy(FIRE_BOLT, "fighter", "Eldritch Knight")).toBe(true);
  });

  /* The qualifier is matched the same loose way an answer is anywhere else:
     "Evocation" answers "School of Evocation". */
  it("matches a subclass however it was written down", () => {
    const spell = { classes: ["wizard (school of evocation)"] };
    expect(castableBy(spell, "wizard", "Evocation")).toBe(true);
    expect(castableBy(spell, "wizard", "School of Evocation")).toBe(true);
    expect(castableBy(spell, "wizard", "Necromancy")).toBe(false);
  });

  /* A record saved by an older import must not be able to blank the screen. */
  it("tolerates a spell with no class list at all", () => {
    expect(castableBy({}, "wizard")).toBe(false);
    expect(castableBy({ classes: [] }, "wizard")).toBe(false);
  });

  it("says no when there is no class to ask about", () => {
    expect(castableBy(FIREBALL, "")).toBe(false);
  });
});

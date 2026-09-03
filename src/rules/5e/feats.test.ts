import { describe, it, expect } from "vitest";
import { meets, blocked, effectsOf, variantAbility, type Aspirant } from "./feats";
import { BLANK } from "./abilities";

const who = (over: Partial<Aspirant> = {}): Aspirant =>
  ({ scores: BLANK, casts: false, race: "Human", ...over });

describe("whether a character qualifies for a feat", () => {
  it("checks an ability minimum", () => {
    expect(meets("Strength 13 or higher", who({ scores: { ...BLANK, str: 14 } }))).toEqual({ ok: true });
    const no = meets("Strength 13 or higher", who({ scores: { ...BLANK, str: 12 } }));
    expect(blocked(no)).toBe(true);
    expect((no as { why: string }).why).toBe("Needs Strength 13.");
  });

  it("takes either where the feat asks for one of two", () => {
    const p = "Intelligence or Wisdom 13 or higher";
    expect(meets(p, who({ scores: { ...BLANK, int: 13, wis: 8 } }))).toEqual({ ok: true });
    expect(meets(p, who({ scores: { ...BLANK, int: 8, wis: 13 } }))).toEqual({ ok: true });
    expect(blocked(meets(p, who({ scores: { ...BLANK, int: 8, wis: 8 } })))).toBe(true);
  });

  it("checks whether they can cast at all", () => {
    expect(meets("The ability to cast at least one spell", who({ casts: true }))).toEqual({ ok: true });
    expect(blocked(meets("The ability to cast at least one spell", who()))).toBe(true);
  });

  /* "Elf (Drow)" against "Wood Elf" — any named race matching is enough. */
  it("checks a race, loosely", () => {
    expect(meets("Elf or Half-Elf", who({ race: "Wood Elf" }))).toEqual({ ok: true });
    expect(meets("Elf (Drow)", who({ race: "Elf, Drow / Dark" }))).toEqual({ ok: true });
    expect(blocked(meets("Halfling", who({ race: "Mountain Dwarf" })))).toBe(true);
  });

  /*
   * The whole disposition of this module: blocking on a guess stops somebody
   * taking a feat they are entitled to, and the table can always say no while
   * the app saying no is the end of it.
   */
  it("allows what it cannot check, and says what it could not check", () => {
    const v = meets("Proficiency with a martial weapon", who());
    expect(v.ok).toBe(true);
    expect((v as { unverified: string }).unverified).toBe("Proficiency with a martial weapon");
    expect(blocked(v)).toBe(false);
  });

  it("allows a feat that asks for nothing", () => {
    expect(meets("", who())).toEqual({ ok: true });
  });
});

describe("what taking a feat does to the numbers", () => {
  /*
   * Resilient is the only feat in the game that grants a saving throw, and it
   * is the reason anybody takes it. Leaving it unapplied makes the sheet
   * quietly wrong about the number the player took the feat FOR.
   */
  it("reads a Resilient variant's save and its point", () => {
    expect(effectsOf({
      name: "Resilient (Constitution)",
      text: "Increase the chosen ability score by 1. You gain proficiency in saving throws using the chosen ability.",
    })).toEqual({ increase: "con", saveProficiency: "con" });
  });

  it("reads a half-feat that names its own ability", () => {
    expect(effectsOf({ name: "Actor", text: "Increase your Charisma score by 1, to a maximum of 20." }))
      .toEqual({ increase: "cha" });
  });

  /* "Increase your Intelligence or Wisdom score by 1" — the variant says which. */
  it("takes the variant's answer where the feat offers two", () => {
    expect(effectsOf({
      name: "Observant (Wisdom)",
      text: "Increase your Intelligence or Wisdom score by 1.",
    })).toEqual({ increase: "wis" });
  });

  it("gives nothing for a feat that changes no number", () => {
    expect(effectsOf({ name: "Alert", text: "You gain a +5 bonus to initiative." })).toEqual({});
  });

  it("finds the ability a variant names, and only an ability", () => {
    expect(variantAbility("Resilient (Dexterity)")).toBe("dex");
    expect(variantAbility("Elemental Adept (Fire)")).toBeNull();
    expect(variantAbility("Alert")).toBeNull();
  });
});

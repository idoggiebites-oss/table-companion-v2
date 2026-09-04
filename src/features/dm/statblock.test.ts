import { describe, it, expect } from "vitest";
import {
  abilityMod, actionNumbers, isActionable, modifierList, sensesText, speedText,
} from "./statblock";

describe("what counts as something to do", () => {
  it("is an entry that names dice or a to-hit", () => {
    expect(isActionable({ name: "Bite", attackBonus: 14 })).toBe(true);
    expect(isActionable({ name: "Fire Breath", damage: [{ dice: "18d6", type: "fire" }] })).toBe(true);
  });

  it("is not a trait, however dangerous the trait is", () => {
    /* Regeneration is a fact about the creature, not a thing you announce.
       V1's rule, and the reason traits stay prose. */
    expect(isActionable({ name: "Regeneration", desc: "The troll regains 10 hit points." })).toBe(false);
  });

  it("is not Multiattack, which names no dice of its own", () => {
    /*
     * The line the app was quietest about. It is dropped from nearly every
     * statblock in the game, and it is not an attack — it says how many times
     * to make one. So it must be present and must read as prose.
     */
    expect(isActionable({ name: "Multiattack", desc: "The dragon makes three attacks." })).toBe(false);
  });
});

describe("the numbers, without throwing anything", () => {
  it("puts the to-hit before the damage", () => {
    expect(actionNumbers({
      name: "Bite", attackBonus: 14, damage: [{ dice: "2d10+8", type: "piercing" }],
    })).toBe("+14 to hit · 2d10+8 piercing");
  });

  it("prints a negative to-hit with a real minus sign", () => {
    expect(actionNumbers({ name: "Flail", attackBonus: -1 })).toBe("−1 to hit");
  });

  it("carries damage with no attack roll behind it", () => {
    /* A breath weapon has no to-hit at all — 4,000-odd actions in the corpus
       ask for a saving throw instead. The dice still have to show. */
    expect(actionNumbers({ name: "Fire Breath", damage: [{ dice: "18d6", type: "Fire" }] }))
      .toBe("18d6 fire");
  });

  it("says nothing at all about a trait", () => {
    expect(actionNumbers({ name: "Regeneration" })).toBe("");
  });
});

describe("reading the fields as they are actually shaped", () => {
  it("prints the speed values, not their keys", () => {
    /* The corpus files the whole line under a single `walk` key on all 6,633
       creatures, so printing key and value would say "walk walk 40 ft.". */
    expect(speedText({ walk: "walk 40 ft., climb 40 ft., fly 80 ft." }))
      .toBe("walk 40 ft., climb 40 ft., fly 80 ft.");
  });

  it("takes senses from a string or from notes, because both ship", () => {
    expect(sensesText("darkvision 60 ft.")).toBe("darkvision 60 ft.");
    expect(sensesText({ notes: "blindsight 60 ft., darkvision 120 ft." }))
      .toBe("blindsight 60 ft., darkvision 120 ft.");
    expect(sensesText(null)).toBe("");
  });

  it("signs saves and skills, and says nothing when there are none", () => {
    expect(modifierList({ dex: 6, con: 13 })).toBe("dex +6, con +13");
    expect(modifierList(null)).toBe("");
  });

  it("gives the modifier a DM adds, not the score they read", () => {
    expect(abilityMod(27)).toBe("+8");
    expect(abilityMod(10)).toBe("+0");
    expect(abilityMod(3)).toBe("−4");
  });
});

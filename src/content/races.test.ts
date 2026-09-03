import { describe, it, expect } from "vitest";
import { freeBonusFrom, freeSkillsFrom, grantsFeatFrom, type Trait } from "./races";

const asi = (text: string): Trait[] => [{ name: "Ability Score Increase", text }];

describe("the ability points an ancestry leaves to you", () => {
  /* A half-elf: +2 Charisma fixed, two more of their own choosing. V2 applied
     the fixed half and dropped the rest, arriving two points short. */
  it("reads a half-elf's two free points", () => {
    expect(freeBonusFrom(asi("Your Charisma score increases by 2, and two different ability scores of your choice increase by 1.")))
      .toEqual({ count: 2, each: 1, distinct: true });
  });

  it("reads a variant human's, which has no fixed half at all", () => {
    expect(freeBonusFrom(asi("Two different ability scores of your choice increase by 1.")))
      .toEqual({ count: 2, each: 1, distinct: true });
  });

  it("reads a single point, and notices when they need not differ", () => {
    expect(freeBonusFrom(asi("One ability score of your choice increases by 1.")))
      .toEqual({ count: 1, each: 1, distinct: false });
  });

  /*
   * The fixed half is already structural. Reading it here too would give a
   * dwarf two free points they were never offered.
   */
  it("offers nothing when the ancestry decides for you", () => {
    expect(freeBonusFrom(asi("Your Constitution score increases by 2."))).toBeNull();
    expect(freeBonusFrom(asi("Your Dexterity score increases by 2, and your Intelligence score increases by 1."))).toBeNull();
  });

  it("offers nothing when there is no such trait", () => {
    expect(freeBonusFrom([{ name: "Darkvision", text: "You can see in dim light." }])).toBeNull();
    expect(freeBonusFrom(undefined)).toBeNull();
  });
});

describe("the skill an ancestry leaves to you", () => {
  it("reads a half-elf's two", () => {
    expect(freeSkillsFrom([{ name: "Skill Versatility", text: "You gain proficiency in two skills of your choice." }]))
      .toBe(2);
  });

  it("reads a variant human's one", () => {
    expect(freeSkillsFrom([{ name: "Skills", text: "You gain proficiency in one skill of your choice." }])).toBe(1);
  });

  it("counts none when the ancestry names the skill itself", () => {
    // A granted skill is not a choice — it arrives with the trait.
    expect(freeSkillsFrom([{ name: "Keen Senses", text: "You have proficiency in the Perception skill." }])).toBe(0);
    expect(freeSkillsFrom(undefined)).toBe(0);
  });
});

describe("the feat a variant human is given", () => {
  it("sees it stated either way round", () => {
    expect(grantsFeatFrom([{ name: "Feat", text: "You gain one feat of your choice." }])).toBe(true);
    expect(grantsFeatFrom([{ name: "Boon", text: "At 1st level you gain a feat of your choice." }])).toBe(true);
  });

  it("does not see one where there is none", () => {
    expect(grantsFeatFrom([{ name: "Darkvision", text: "You can see in dim light." }])).toBe(false);
    expect(grantsFeatFrom(undefined)).toBe(false);
  });
});

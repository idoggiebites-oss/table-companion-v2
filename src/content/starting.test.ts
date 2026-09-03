import { describe, it, expect } from "vitest";
import { startingOf, NO_START } from "./starting";

const FIGHTER = [{
  level: 1,
  name: "Starting Fighter",
  text: [
    "As a 1st-level Fighter, you begin play with 10 + your Constitution modifier hit points.",
    "",
    "You are proficient with the following items, in addition to any proficiencies provided by your race or background.",
    "",
    "\t• Armor: light armor, medium armor, heavy armor, shields",
    "\t• Weapons: simple weapons, martial weapons",
    "\t• Tools: none",
    "\t• Skills: Choose 2 from Acrobatics, Athletics, History, Insight, Intimidation, Perception, Survival",
    "",
    "You begin play with the following equipment, in addition to any equipment provided by your background.",
    "",
    "\t• (a) chain mail or (b) leather armor, longbow, and arrows (20)",
    "\t• (a) a martial weapon and a shield or (b) two martial weapons",
    "\t• (a) a dungeoneer's pack or (b) an explorer's pack",
    "\t• A shield and a holy symbol",
    "",
    "Source:\tPlayer's Handbook (2014) p. 72",
  ].join("\n"),
}];

describe("what a class hands a first-level character", () => {
  const s = startingOf(FIGHTER);

  /* V2 asked everybody for two skills, which is the Fighter's answer given to
     eleven other classes. A Rogue chooses four. */
  it("reads the count and the list the book states", () => {
    expect(s.skillCount).toBe(2);
    expect(s.skills).toEqual([
      "Acrobatics", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival",
    ]);
  });

  it("reads what the class can wear and swing", () => {
    expect(s.armor).toEqual(["light armor", "medium armor", "heavy armor", "shields"]);
    expect(s.weapons).toEqual(["simple weapons", "martial weapons"]);
  });

  it("reads 'none' as nothing rather than as a tool called none", () => {
    expect(s.tools).toEqual({ known: [], choose: 0 });
  });

  it("turns a lettered line into the options it offers", () => {
    expect(s.gear[0]!.options).toEqual(["chain mail", "leather armor, longbow, and arrows (20)"]);
    expect(s.gear[1]!.options).toEqual(["a martial weapon and a shield", "two martial weapons"]);
  });

  /* A quantity is not an option. Matching brackets loosely made "(20)" one. */
  it("does not read a quantity as a lettered option", () => {
    expect(s.gear[0]!.options).toHaveLength(2);
    expect(s.gear.flatMap((g) => g.options)).not.toContain("20");
  });

  it("keeps a line with no choice as a single grant", () => {
    const last = s.gear[3]!;
    expect(last.options).toEqual(["A shield and a holy symbol"]);
  });

  it("finds four lines and no more", () => {
    expect(s.gear).toHaveLength(4);
  });
});

describe("the shapes that are not the boilerplate", () => {
  /* A caveat is not an option: "(if proficient)" is one bracket and not one
     letter, and it belongs to the option it qualifies. */
  it("keeps a parenthetical caveat attached to its option", () => {
    const s = startingOf([{
      name: "Starting Cleric",
      text: "You begin play with the following equipment, in addition to any equipment provided by your background.\n\n\t• (a) scale mail, (b) leather armor, or (c) chain mail (if proficient)",
    }]);
    expect(s.gear[0]!.options).toEqual(["scale mail", "leather armor", "chain mail (if proficient)"]);
  });

  /* The artificer's armour line. Read as a grant it handed over a sentence
     instead of offering two suits of armour. */
  it("reads an unlettered 'your choice of A or B' as a choice", () => {
    const s = startingOf([{
      name: "Starting Artificer",
      text: "You begin play with the following equipment, in addition to any equipment provided by your background.\n\n\t• your choice of studded leather armor or scale mail\n\t• any two simple weapons of your choice",
    }]);
    expect(s.gear[0]!.options).toEqual(["studded leather armor", "scale mail"]);
    // "of your choice" without an "or" is still one thing you are given.
    expect(s.gear[1]!.options).toEqual(["any two simple weapons of your choice"]);
  });

  /*
   * "leather armor" ends in "or". Stripping a trailing separator without
   * requiring a space before it offered the Ranger "leather arm" — and only
   * when the option came last on its line, which is why the Cleric's identical
   * armour read correctly and hid it.
   */
  it("strips the separator without eating a word that ends in one", () => {
    const s = startingOf([{
      name: "Starting Ranger",
      text: "You begin play with the following equipment, in addition to any equipment provided by your background.\n\n\t• (a) scale mail or (b) leather armor\n\t• (a) plate armor, (b) hide armor, or (c) a suit of armor",
    }]);
    expect(s.gear[0]!.options).toEqual(["scale mail", "leather armor"]);
    expect(s.gear[1]!.options).toEqual(["plate armor", "hide armor", "a suit of armor"]);
  });

  it("reads a spelled-out count", () => {
    const s = startingOf([{ name: "Starting Bard", text: "\t• Skills: Choose three from Athletics, Acrobatics" }]);
    expect(s.skillCount).toBe(3);
  });

  /*
   * A class with no Starting feature offers nothing, and the builder says so.
   * Handing a homebrew class a longsword it never mentioned is worse.
   */
  it("offers nothing for a class that states nothing", () => {
    expect(startingOf([{ name: "Rage", text: "You fly into a rage." }])).toEqual(NO_START);
    expect(startingOf([])).toEqual(NO_START);
  });
});

import { describe, it, expect } from "vitest";
import { traitsOf } from "./traits";

// Exactly as the shipped file lists a High Elf.
const HIGH_ELF = [
  "Description", "Slender and Graceful", "A Timeless Perspective",
  "Hidden Woodland Realms", "Exploration and Adventure", "Elf Names",
  "Ability Score Increase", "Age", "Alignment", "Size", "Speed",
  "Darkvision", "Keen Senses", "Fey Ancestry", "Trance",
  "Elf Weapon Training", "Cantrip", "Languages", "Extra Language",
];

describe("what an ancestry grants", () => {
  it("takes the traits that do something, not the prose about them", () => {
    expect(traitsOf(HIGH_ELF).slice(0, 4)).toEqual([
      "Darkvision", "Keen Senses", "Fey Ancestry", "Trance",
    ]);
  });

  it("drops the flavour headings that come before the numbers", () => {
    expect(traitsOf(HIGH_ELF)).not.toContain("Slender and Graceful");
    expect(traitsOf(HIGH_ELF)).not.toContain("Elf Names");
  });

  it("drops the boilerplate every race repeats", () => {
    for (const dull of ["Age", "Alignment", "Size", "Speed", "Languages", "Ability Score Increase"]) {
      expect(traitsOf(HIGH_ELF)).not.toContain(dull);
    }
  });

  it("copes with a race that never says Speed", () => {
    expect(traitsOf(["Description", "Darkvision", "Languages"])).toEqual(["Darkvision"]);
  });

  it("returns nothing rather than guessing when there is nothing", () => {
    expect(traitsOf([])).toEqual([]);
    expect(traitsOf(["Age", "Size", "Speed"])).toEqual([]);
  });
});

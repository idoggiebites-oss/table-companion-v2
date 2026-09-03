import { describe, it, expect } from "vitest";
import { portraitFor } from "./portraits";

describe("which face an ancestry wears", () => {
  it("keeps the hyphen, because the file has one", () => {
    // `names.key()` strips hyphens — right for matching a compendium name,
    // wrong for matching "half-elf.jpg" or "elf-shadar-kai.jpg".
    expect(portraitFor("Half-Elf")).toBe("/art/ancestry/half-elf.jpg");
    expect(portraitFor("Elf", "Shadar-kai")).toBe("/art/ancestry/elf-shadar-kai.jpg");
  });

  it("reads the compendium's own words for a lineage", () => {
    expect(portraitFor("Elf", "Drow / Dark")).toBe("/art/ancestry/elf-dark.jpg");
    expect(portraitFor("Dwarf", "Duergar / Gray")).toBe("/art/ancestry/dwarf-duergar.jpg");
    expect(portraitFor("Gnome", "Deep")).toBe("/art/ancestry/gnome-deep.jpg");
  });

  it("shows nothing rather than a sibling's face", () => {
    // An Astral Elf has no portrait. Lending it the drow's puts a stranger in
    // front of somebody who made a choice.
    expect(portraitFor("Elf", "Astral")).toBeUndefined();
    expect(portraitFor("Bullywug")).toBeUndefined();
  });

  it("uses the chosen face for an ancestry that has none of its own", () => {
    // The lineage that sorts first is the Duergar; a dwarf is a hill dwarf.
    expect(portraitFor("Dwarf")).toBe("/art/ancestry/dwarf-hill.jpg");
    expect(portraitFor("Halfling")).toBe("/art/ancestry/halfling-lightfoot.jpg");
    expect(portraitFor("Elf")).toBe("/art/ancestry/elf-high.jpg");
  });
});

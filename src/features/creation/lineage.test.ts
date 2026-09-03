import { describe, it, expect } from "vitest";
import { groupAncestries, hasLineages, baseName, lineageLabel, isVariant } from "./lineage";

const race = (name: string) => ({ id: name.toLowerCase().replace(/\W+/g, "-"), name });

// Shaped exactly like the shipped file: inverted names, no plain "Dwarf".
const REAL = [
  "Dwarf, Hill", "Dwarf, Mountain", "Dwarf, Duergar / Gray (Legacy)", "Dwarf, Mark of Warding",
  "Elf, High", "Elf, Wood", "Elf, Drow / Dark",
  "Elf, Eladrin (DMG)", "Elf, Eladrin (MTF)", "Elf, Eladrin (Legacy)",
  "Dragonborn", "Dragonborn, Chromatic", "Dragonborn, Gem",
  "Human", "Human, Variant", "Human, Mark of Finding", "Human, Mark of Handling",
  "Human, Mark of Making", "Human, Mark of Passage", "Human, Mark of Sentinel",
  "Tiefling", "Tiefling, Variants",
  "Aarakocra (DMG)", "Aarakocra (MTF)",
].map(race);

describe("ancestries are grouped, because the file does not group them", () => {
  it("finds an ancestry that has no record of its own", () => {
    // There is no "Dwarf" row anywhere. It exists only as a shared prefix.
    const ancestries = groupAncestries(REAL);
    const dwarf = ancestries.find((a) => a.name === "Dwarf")!;
    expect(dwarf).toBeDefined();
    expect(REAL.some((r) => r.name === "Dwarf")).toBe(false);
    expect(dwarf.lineages).toHaveLength(3);
  });

  it("keeps a bare record as one lineage among its variants", () => {
    const dragon = groupAncestries(REAL).find((a) => a.name === "Dragonborn")!;
    expect(dragon.lineages.map((l) => l.name)).toContain("Dragonborn");
    expect(dragon.lineages).toHaveLength(3);
  });

  it("gives a lineage step only where there is more than one way to be it", () => {
    const by = (n: string) => groupAncestries(REAL).find((a) => a.name === n);
    expect(hasLineages(by("Elf"))).toBe(true);
    expect(hasLineages(by("Dwarf"))).toBe(true);
    // Human is just Human. Its twelve grouped records are one base, one
    // Variant and ten dragonmarks, none of which is a way of being a human.
    expect(hasLineages(by("Human"))).toBe(false);
    expect(hasLineages(by("Tiefling"))).toBe(false);
    expect(hasLineages(by("Aarakocra"))).toBe(false);
  });

  it("strips a provenance marker before grouping", () => {
    expect(baseName("Aarakocra (DMG)")).toBe("Aarakocra");
    expect(baseName("Dwarf, Duergar / Gray (Legacy)")).toBe("Dwarf");
    // Two printings of one lineage are one lineage, not two rows that read
    // identically — which is what the marker strip would otherwise produce.
    const grouped = groupAncestries([race("Elf, High"), race("Elf, High (HB)")]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.lineages).toHaveLength(1);
  });

  it("sets dragonmarks and variants aside rather than deleting them", () => {
    const human = groupAncestries(REAL).find((a) => a.name === "Human")!;
    expect(human.lineages).toHaveLength(1);
    expect(human.variants.map((v) => v.name)).toContain("Human, Variant");
    expect(human.variants.filter((v) => v.name.includes("Mark of"))).toHaveLength(5);
    // Nothing was thrown away: every record is in one list or the other.
    expect(human.lineages.length + human.variants.length).toBe(7);
  });

  it("catches the plural, because the file writes both", () => {
    expect(isVariant("Variant")).toBe(true);
    expect(isVariant("Variants")).toBe(true);
    expect(isVariant("Mark of Warding")).toBe(true);
    expect(isVariant("High")).toBe(false);
    expect(isVariant("Wood")).toBe(false);
  });

  it("deduplicates a lineage printed in several books", () => {
    // Eladrin appears in the DMG, Mordenkainen's and as Legacy. The marker
    // that told them apart is stripped before the label is read, so without
    // this the Elf list shows "Eladrin" three times.
    const elf = groupAncestries(REAL).find((a) => a.name === "Elf")!;
    const labels = elf.lineages.map((l) => lineageLabel("Elf", l.name));
    expect(labels.filter((l) => l === "Eladrin")).toHaveLength(1);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps the first printing when it deduplicates", () => {
    // Input arrives in publication order, so the survivor is the earliest.
    const elf = groupAncestries(REAL).find((a) => a.name === "Elf")!;
    const eladrin = elf.lineages.find((l) => lineageLabel("Elf", l.name) === "Eladrin")!;
    expect(eladrin.name).toBe("Elf, Eladrin (DMG)");
  });

  it("names a lineage by what is left once the ancestry is known", () => {
    expect(lineageLabel("Dwarf", "Dwarf, Hill")).toBe("Hill");
    expect(lineageLabel("Elf", "Elf, Drow / Dark")).toBe("Drow / Dark");
    /* The plain row stays selectable — without it there is no way to build an
       ordinary dragonborn — but it is named, not labelled with an artefact. */
    expect(lineageLabel("Dragonborn", "Dragonborn")).toBe("Standard");
  });

  it("sorts ancestries by name so a list is findable", () => {
    const names = groupAncestries(REAL).map((a) => a.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

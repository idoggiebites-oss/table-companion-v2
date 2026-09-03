

/**
 * Which portrait belongs to an ancestry or a lineage.
 *
 * The art is filed by caption — `elf-high`, `dwarf-duergar`, `genasi-fire` —
 * and looked up from most specific to least: a High Elf shows the High Elf,
 * an Eladrin shows the Eladrin, and an ancestry with no art of its own falls
 * back to the first of its lineages that has some.
 */
const HAVE: ReadonlySet<string> = new Set([
  "aarakocra", "aasimar-fallen", "aasimar-protector", "aasimar-scourge", "bugbear",
  "dragonborn", "dwarf-duergar", "dwarf-hill", "dwarf-mountain", "elf-dark",
  "elf-eladrin", "elf-high", "elf-sea", "elf-shadar-kai", "elf-wood", "firbolg",
  "genasi-air", "genasi-earth", "genasi-fire", "gith-githyanki", "gith-githzerai",
  "gnome-deep", "gnome-forest", "gnome-rock", "goblin", "half-elf", "half-orc",
  "halfling-lightfoot", "halfling-stout", "hobgoblin", "human", "human-variant",
  "kenku", "kobold", "lizardfolk", "orc", "tabaxi", "tiefling", "triton", "yuan-ti",
]);

/**
 * Hyphens are meaningful here — `half-elf` and `shadar-kai` are the filenames.
 * `names.key()` strips them, which is right for matching a compendium name and
 * wrong for matching a file.
 */
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A few captions do not match the compendium's own words. */
const ALIAS: Readonly<Record<string, string>> = {
  "drow-dark": "dark", "duergar-gray": "duergar", "svirfneblin": "deep",
  "gray-dwarf": "duergar", "pureblood": "",
};

/**
 * The face of an ancestry, where borrowing its first lineage picks badly.
 *
 * "Dwarf" has no portrait of its own, and the lineage that happens to sort
 * first is the Duergar — a grey underdark dwarf standing in for all dwarves.
 * Which face represents an ancestry is an editorial call, not something the
 * sort order knows.
 */
const FACE: Readonly<Record<string, string>> = {
  dwarf: "dwarf-hill",
  elf: "elf-high",
  halfling: "halfling-lightfoot",
  gnome: "gnome-forest",
  aasimar: "aasimar-protector",
  gith: "gith-githyanki",
  genasi: "genasi-fire",
};

export function portraitFor(ancestry: string, lineage?: string): string | undefined {
  const base = slug(ancestry);

  if (lineage !== undefined) {
    const raw = slug(lineage);
    const alias = ALIAS[raw];
    const first = raw.split("-")[0] ?? raw;
    for (const candidate of [`${base}-${raw}`, ...(alias ? [`${base}-${alias}`] : []), `${base}-${first}`]) {
      if (HAVE.has(candidate)) return `/art/ancestry/${candidate}.jpg`;
    }
    // A named lineage with no art of its own shows NOTHING. Lending it a
    // sibling's face puts a drow in front of somebody who chose an astral elf.
    return undefined;
  }

  const chosen = FACE[base];
  if (chosen !== undefined && HAVE.has(chosen)) return `/art/ancestry/${chosen}.jpg`;
  return HAVE.has(base) ? `/art/ancestry/${base}.jpg` : undefined;
}

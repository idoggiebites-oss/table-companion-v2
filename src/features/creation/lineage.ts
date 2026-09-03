import { exact, key } from "../../content/names";

/**
 * Ancestries and their lineages, derived rather than declared.
 *
 * A compendium has no "subrace" field. It files them as separate races with
 * an inverted name — `Dwarf, Hill` and `Dwarf, Mountain` — and there is **no
 * plain `Dwarf` record at all**. So the ancestry list has to be grouped by the
 * part before the comma, and the lineage step is that group.
 *
 * Measured against the shipped file: 88 of 186 official races carry a comma,
 * and 15 base names have more than one variant. Some groups also contain a
 * bare record (`Dragonborn`, `Human`, `Half-Elf`), which is a lineage like any
 * other and is listed alongside its variants rather than standing in for them.
 */
export type Named = { readonly id: string; readonly name: string };

export type Ancestry<T extends Named> = {
  readonly id: string;
  readonly name: string;
  /** The ways to be this ancestry: High Elf, Hill Dwarf. */
  readonly lineages: readonly T[];
  /**
   * Not ways to be it — separate options that share its name. Eberron
   * dragonmarks and Human Variant. Kept, but never the Lineage step: "which
   * kind of Human are you" has one answer, and twelve dragonmarks is not it.
   */
  readonly variants: readonly T[];
};

/**
 * A dragonmark or a named variant, rather than a lineage.
 *
 * Measured against the shipped file: of Human's twelve grouped records, ten
 * are `Mark of …` and one is `Variant`. Removing them leaves one — which is
 * the right number of questions to ask somebody making a human.
 */
export function isVariant(label: string): boolean {
  const l = label.trim().toLowerCase();
  return l.startsWith("mark of ") || /^variants?$/.test(l);
}

/** The part before the comma, with any provenance marker already removed. */
export const baseName = (name: string): string => (exact(name).split(",")[0] ?? "").trim();

/**
 * Ancestries in the order the game published them, not the order of the
 * alphabet.
 *
 * A player's handbook race should not sit below Aarakocra because A comes
 * first. The group takes the earliest publication among its lineages, so Elf
 * ranks by the Player's Handbook even though Sea Elf came much later; ties
 * fall back to the name.
 */
export function groupAncestries<T extends Named>(
  races: readonly T[],
  orderOf: (row: T) => number = () => 0,
): Ancestry<T>[] {
  /*
   * Most lineages invert with a comma — "Dwarf, Hill". A few say "of"
   * instead: the nine Tiefling bloodlines are "Tiefling of Asmodeus".
   *
   * The split is only taken when the stem is ITSELF an ancestry. Measured
   * against the shipped file, 33 shown races contain " of " and only Tiefling
   * qualifies — the other 24 are Eberron dragonmarks ("Human, Mark of
   * Finding") which already group by their comma and must not be re-cut here.
   */
  const commaBases = new Set(races.map((r) => key(baseName(r.name))));
  const stemOf = (name: string): string => {
    const base = baseName(name);
    const stem = base.split(/ of /i)[0]?.trim() ?? base;
    return stem !== base && commaBases.has(key(stem)) ? stem : base;
  };

  const groups = new Map<string, { name: string; rows: T[] }>();
  for (const r of races) {
    const base = stemOf(r.name);
    if (base === "") continue;
    const k = key(base);
    const g = groups.get(k) ?? { name: base, rows: [] };
    g.rows.push(r);
    groups.set(k, g);
  }

  return [...groups.entries()]
    .map(([k, g]) => {
      /* Deduplicate by label. The same lineage is printed in several books —
         Eladrin appears three times (DMG, Mordenkainen's, Legacy) and
         Hobgoblin's base three times — and the provenance marker that told
         them apart is stripped before the label is read. Input arrives in
         publication order, so the first survivor is the first printing. */
      const seen = new Set<string>();
      const lineages: T[] = [];
      const variants: T[] = [];
      for (const row of g.rows) {
        const label = lineageLabel(g.name, row.name);
        const dedupe = key(label);
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        (isVariant(label) ? variants : lineages).push(row);
      }
      return { id: k, name: g.name, lineages, variants };
    })
    .sort((a, b) => {
      const rank = (x: Ancestry<T>) =>
        Math.min(...[...x.lineages, ...x.variants].map(orderOf), Number.MAX_SAFE_INTEGER);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
}

/** The lineage step exists only when there is more than one way to be this. */
export const hasLineages = <T extends Named>(a: Ancestry<T> | undefined): boolean =>
  a !== undefined && a.lineages.length > 1;

/**
 * What the plain entry is called once its group has variants.
 *
 * V1's word, and V1's reason: "Human" and "Human, Variant" both exist and the
 * plain one has to stay reachable. The compendium's own name for that row is
 * the ancestry's name, which read as "Dragonborn (base)" in a list of Gem and
 * Chromatic and Metallic — an artefact, and not a thing anybody calls
 * themselves. It is not a row to DROP: for 27 of the 72 ancestries that ask
 * this question the plain one is the ordinary character, and without it there
 * is no way to build a normal dragonborn or half-elf at all.
 */
export const STANDARD = "Standard";

/** What a lineage is called once the ancestry is already known. */
export function lineageLabel(ancestryName: string, full: string): string {
  const clean = exact(full);
  const comma = clean.indexOf(",");
  if (comma !== -1) return clean.slice(comma + 1).trim();
  const of = /^(.+?) of (.+)$/i.exec(clean);
  if (of !== null && key(of[1]!) === key(ancestryName)) return of[2]!.trim();
  return clean === ancestryName ? STANDARD : clean;
}

/**
 * What a compendium is telling you in parentheses.
 *
 * Ported from V1 with its reasoning intact, because this is the expensive
 * one: two thirds of a complete compendium is somebody else's material, and
 * the person choosing came for the other third.
 */

/** Every parenthetical in the name, in order — some names carry two. */
export function nameMarks(name: string): string[] {
  return [...(name ?? "").matchAll(/\(([^()]{1,30})\)/g)].map((m) => m[1]!);
}

/**
 * Parentheses that are NOT provenance. Two kinds, and reading either as a
 * source is the mistake that hides the game from itself.
 *
 * A choice the file baked into the name: "Resilient (Constitution)", 331 times.
 *
 * And a property of the thing: "(Rare)", "(Very Rare)", "(Legendary)" — 1,499
 * magic items. Reading those as provenance hides every magic item in the game
 * the moment the switch points at equipment, and it looks exactly like the
 * switch working.
 */
const AXES = new Set([
  "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
  "acid", "cold", "fire", "lightning", "thunder", "necrotic", "radiant",
  "poison", "psychic", "force", "proficient", "proficient in both",
  "common", "uncommon", "rare", "very rare", "legendary", "artifact", "epic",
]);

/**
 * Measured against the shipped item file: of 1,533 items whose name carries a
 * rarity, 49 also carry a second parenthetical. 37 of those are real
 * publishers — (Ryoko), (Matthew Mercer), (Valda), (Grim Hollow). The other
 * twelve are a quantity or a category: "Sunwing Crossbow Bolts (Rare) (20)",
 * "Hammerhead Ship (Uncommon) (Vehicle)". A number is never a publisher.
 */
const CATEGORIES = new Set(["vehicle", "mount", "vessel"]);

export function isAxis(mark: string): boolean {
  const m = mark.trim().toLowerCase();
  if (AXES.has(m)) return true;
  if (/^\d+$/.test(m)) return true;
  return CATEGORIES.has(m);
}

/** The first parenthetical that is not an axis — "HB", "TP", "UA", a setting. */
export function sourceMark(name: string): string | null {
  return nameMarks(name).find((m) => !isAxis(m)) ?? null;
}

/** Nothing in brackets that is not a choice. */
export function isCore(name: string): boolean {
  return sourceMark(name) === null;
}

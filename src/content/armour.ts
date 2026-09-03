import type { Worn, Kind } from "../rules/5e/armour";

/**
 * The armour a line of an equipment list names.
 *
 * A class states its starting gear as prose — "(a) chain mail or (b) leather
 * armor, longbow, and arrows (20)", "A shield and a holy symbol" — and the
 * build stores the line the person chose, in the book's own words. So the
 * armour has to be found IN a sentence rather than looked up by id.
 *
 * Longest name first, and a matched span is consumed: "studded leather armor"
 * contains "leather armor", and matching short-first dresses a rogue in the
 * wrong suit and then counts the same garment twice.
 *
 * Nothing that is not matched is worn. A line naming armour this table has
 * never heard of leaves the character unarmoured, which is visible on the
 * sheet — better than a guess that is invisible.
 */
export type Armour = Worn & { readonly id: string };

/** Longest first, so a name that contains another is tried before it. */
export const byLength = (a: Armour, b: Armour): number => b.name.length - a.name.length;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function armourIn(line: string, table: readonly Armour[]): Armour[] {
  let rest = ` ${norm(line)} `;
  const found: Armour[] = [];
  for (const a of [...table].sort(byLength)) {
    const want = ` ${norm(a.name)} `;
    const at = rest.indexOf(want);
    if (at < 0) continue;
    found.push(a);
    // Consume it, so "studded leather armor" cannot also yield "leather armor".
    rest = `${rest.slice(0, at)} ${rest.slice(at + want.length)}`;
  }
  return found;
}

/** Every suit and shield the chosen lines name, across the whole list. */
export const wornFrom = (lines: readonly string[], table: readonly Armour[]): Armour[] =>
  lines.flatMap((l) => armourIn(l, table));

/**
 * Barding is armour for a mount, and a quarter of the table is barding. A
 * character never wears it, and a line saying "leather barding" is tack.
 */
export const isBarding = (name: string): boolean => /\bbarding\b/i.test(name);

/**
 * V1's discriminator, and it is two fields, not one: `category === "armor"`
 * says this is armour at all, and `armorCategory` says which of the three
 * shapes — or that it is a shield, which is neither worn nor compared.
 */
export const isArmourRow = (category: string | undefined): boolean =>
  (category ?? "").trim().toLowerCase() === "armor";

export const kindOf = (category: string | undefined): Kind | null => {
  const c = (category ?? "").trim().toLowerCase();
  return c === "light" || c === "medium" || c === "heavy" || c === "shield" ? c : null;
};

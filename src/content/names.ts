/**
 * Three spellings per name, because a compendium writes subraces inverted
 * ("Dwarf, Hill") and files fighting styles as feats
 * ("Fighting Style: Archery"). A lookup that compares raw names misses both.
 */

/** As written, trimmed. */
export const strict = (n: string): string => (n ?? "").trim();

/** Without the provenance parentheses. */
export const exact = (n: string): string =>
  strict(n).replace(/\s*\([^()]{1,30}\)/g, "").trim();

/** Comparison key: uninverted, unprefixed, lowercase, punctuation-free. */
export function key(n: string): string {
  let s = exact(n).toLowerCase();
  const colon = s.indexOf(":");
  if (colon !== -1) s = s.slice(colon + 1);
  const comma = s.indexOf(",");
  if (comma !== -1) s = `${s.slice(comma + 1).trim()} ${s.slice(0, comma).trim()}`;
  return s.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

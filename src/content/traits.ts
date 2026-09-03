/**
 * What an ancestry actually grants.
 *
 * A compendium race carries one long list mixing three things: flavour
 * headings ("Slender and Graceful", "Hidden Woodland Realms"), the statistical
 * boilerplate every race repeats (Ability Score Increase, Age, Alignment,
 * Size, Speed), and the traits that do something — Darkvision, Fey Ancestry,
 * Trance.
 *
 * Only the third kind is worth showing before a choice, and the file marks the
 * boundary itself: the mechanical traits come after `Speed`.
 */
const BOILERPLATE = /^(description|ability score increase|age|alignment|size|speed|languages?|extra language|.* names)$/i;

export function traitsOf(names: readonly string[]): string[] {
  const speed = names.findIndex((n) => /^speed$/i.test(n.trim()));
  const after = speed === -1 ? names : names.slice(speed + 1);
  return after.map((n) => n.trim()).filter((n) => n !== "" && !BOILERPLATE.test(n));
}

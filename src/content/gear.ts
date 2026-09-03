/**
 * A phrase in an equipment line, and whether it names a thing or a decision.
 *
 * Ported in shape from V1's `domain/starting-gear.ts`. A class states its
 * starting gear as prose — "(a) a martial weapon and a shield or (b) two
 * martial weapons" — and V2 recorded the whole line and stopped. **18 of the
 * 89 equipment options across the thirteen classes name a CATEGORY**, so a
 * fighter walked away carrying "a martial weapon" and no martial weapon.
 *
 * Two outcomes per phrase, and the second is the point:
 *
 *   category — "any simple weapon" is a decision, not a thing, so this
 *              carries the filter to ask with
 *   plain    — anything else, kept exactly as the book wrote it. V1's note:
 *              "an arcane focus" is a real item the list does not enumerate,
 *              and a wizard who ends up without one because a parser shrugged
 *              is worse off than one holding something labelled in words.
 */

export type Category = {
  readonly qty: number;
  /** What the picker should offer: martial melee weapons, say. */
  readonly weapon: "Simple" | "Martial";
  readonly range?: "Melee" | "Ranged";
  /** What is being asked for: "martial weapon", "simple melee weapon". */
  readonly label: string;
};

const WORDS: Readonly<Record<string, number>> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, twenty: 20,
};

/** Curly apostrophes and stray whitespace, which the text is full of. */
const tidy = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

/*
 * "any martial weapon", "two martial weapons", "any simple melee weapon".
 * Anchored, so "a light crossbow and crossbow bolts (20)" is not a category —
 * it names a specific weapon and reading it as a filter would ask a question
 * the book already answered.
 */
const CATEGORY = /^(?:any\s+)?(simple|martial)\s*(melee|ranged)?\s*weapons?$/i;

/**
 * The phrases in one option: commas and "and" separate things.
 *
 * The comma is consumed first, so "…, and arrows (20)" leaves a fragment that
 * still begins with "and" — stripped here rather than left to every caller.
 */
export const phrasesIn = (option: string): string[] =>
  tidy(option)
    .split(/,\s*|\s+and\s+/i)
    .map((p) => p.trim().replace(/^(?:and|or)\s+/i, "").trim())
    .filter(Boolean);

/** What this phrase asks for, or null when it names a thing. */
export function categoryOf(phrase: string): Category | null {
  let text = tidy(phrase).replace(/^(?:and|or)\s+/i, "");
  let qty = 1;

  const numeric = /^(\d+)\s+(.*)$/.exec(text);
  if (numeric !== null) {
    qty = Number(numeric[1]);
    text = numeric[2]!;
  } else {
    const word = /^(\w+)\s+(.*)$/.exec(text);
    const n = word === null ? undefined : WORDS[word[1]!.toLowerCase()];
    if (word !== null && n !== undefined) {
      qty = n;
      text = word[2]!;
    }
  }

  const m = CATEGORY.exec(text);
  if (m === null) return null;
  const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1).toLowerCase();
  return {
    qty,
    weapon: cap(m[1]!) as "Simple" | "Martial",
    ...(m[2] === undefined ? {} : { range: cap(m[2]) as "Melee" | "Ranged" }),
    // Uniform, because "a martial weapon" loses its article to the quantity
    // and "any martial weapon" would otherwise keep its "any".
    label: text.replace(/^any\s+/i, ""),
  };
}

/** Every decision an option leaves open. */
export const categoriesIn = (option: string): Category[] =>
  phrasesIn(option).map(categoryOf).filter((c): c is Category => c !== null);

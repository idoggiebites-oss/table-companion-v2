import { bucketOf, type Item, type Stack } from "../../rules/5e/items";
import { phrasesIn } from "../../content/gear";
import type { Build } from "../creation/model";

/**
 * What a character is carrying, out of what creation wrote down.
 *
 * Creation records the book's own words — "Leather armor, two daggers, and
 * thieves' tools" — because resolving "two martial weapons" into two item
 * records is the player's decision and not the app's. The sheet needs records,
 * so the resolution happens HERE, against the catalogue this screen loads
 * anyway, rather than making the builder pull 133KB it has no use for.
 *
 * Anything the catalogue cannot name is kept as written. V1's reason, and it
 * still holds: "an arcane focus" is a real item the list does not enumerate,
 * and a wizard who ends up without one because a parser shrugged is worse off
 * than one holding something labelled in plain words.
 */

const WORDS: Readonly<Record<string, number>> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, twenty: 20,
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Exact name first.
 *
 * "chain mail" also substring-matches "barding: chain mail", and "leather
 * armor" matches "studded leather armor" — picking the longer one because it
 * happened to sort first would arm every fighter wrongly.
 */
export function findItem(name: string, catalogue: readonly Item[]): Item | undefined {
  const want = norm(name);
  if (want === "") return undefined;
  /* The books count in plurals — "two daggers", "two handaxes" — and the
     catalogue names one of a thing. Both spellings are tried, exact first. */
  const forms = [want, want.replace(/e?s$/, ""), `${want}s`].filter((w) => w !== "");
  for (const w of forms) {
    const exact = catalogue.find((i) => norm(i.name) === w);
    if (exact !== undefined) return exact;
  }
  // Then the shortest containing match, which is the least surprising one.
  for (const w of forms) {
    const near = catalogue.filter((i) => norm(i.name).includes(w));
    const best = near.sort((a, b) => a.name.length - b.name.length)[0];
    if (best !== undefined) return best;
  }
  return undefined;
}

/** "two daggers" → 2 × dagger. "arrows (20)" → 20 × arrow. */
export function readPhrase(phrase: string, catalogue: readonly Item[]): Stack | null {
  let text = phrase.trim().replace(/^(?:and|or)\s+/i, "");
  if (text === "") return null;
  let qty = 1;

  // A trailing "(20)" is a count, which is how the books write ammunition.
  const paren = /^(.*?)\s*\((\d+)\)\s*$/.exec(text);
  if (paren !== null) { qty = Number(paren[2]); text = paren[1]!; }

  const numeric = /^(\d+)\s+(.*)$/.exec(text);
  if (numeric !== null) { qty = Number(numeric[1]); text = numeric[2]!; }
  else {
    const word = /^(\w+)\s+(.*)$/.exec(text);
    const n = word === null ? undefined : WORDS[word[1]!.toLowerCase()];
    if (word !== null && n !== undefined) { qty = n; text = word[2]!; }
  }

  const found = findItem(text, catalogue);
  return found === undefined
    // Kept by name so nothing is silently dropped.
    ? { itemId: `said:${norm(text)}`, name: text.trim(), qty }
    : { itemId: found.id, name: found.name, qty };
}

/** Same thing twice is one stack of two, not two stacks. */
export function merge(stacks: readonly Stack[]): Stack[] {
  const by = new Map<string, Stack>();
  for (const s of stacks) {
    const had = by.get(s.itemId);
    by.set(s.itemId, had === undefined ? s : { ...had, qty: had.qty + s.qty });
  }
  return [...by.values()];
}

/**
 * Everything the character has, from every door: the class's equipment lines,
 * the weapons chosen to settle a category, and whatever has been picked up
 * since.
 */
export function stacksOf(build: Build, catalogue: readonly Item[]): Stack[] {
  const fromLines = build.equipment.flatMap((line) =>
    phrasesIn(line).map((p) => readPhrase(p, catalogue)).filter((s): s is Stack => s !== null));
  const fromWeapons = build.weapons
    .map((w) => readPhrase(w, catalogue))
    .filter((s): s is Stack => s !== null);
  return merge([...fromLines, ...fromWeapons, ...build.stacks]);
}

/** The stacks under one tab, in the catalogue's own order. */
export const inBucket = (
  stacks: readonly Stack[],
  catalogue: readonly Item[],
  bucket: string,
): Stack[] => stacks.filter((s) => {
  const i = catalogue.find((x) => x.id === s.itemId);
  // Something the catalogue never named is gear: it is a thing in a bag.
  return i === undefined ? bucket === "gear" : bucketOf(i) === bucket;
});

/**
 * What is in hand and on the body when nobody has said otherwise.
 *
 * Creation resolves armour into `worn` — that is what the sheet's armour
 * class reads — but it records no EQUIPPED SET, so the figure started empty
 * and the first thing put on rebuilt `worn` from a set that had never held
 * the armour. A fighter equipping a crossbow lost their chain mail and four
 * points of armour class with it.
 *
 * So the set is seeded from what creation already decided: the armour it
 * resolved, and the weapons it was told to carry.
 */
export function equippedOf(build: Build, catalogue: readonly Item[]): readonly string[] {
  if (build.equipped.length > 0) return build.equipped;
  const ids: string[] = [];
  for (const w of build.worn) {
    const found = findItem(w.name, catalogue);
    if (found !== undefined) ids.push(found.id);
  }
  for (const w of build.weapons) {
    const found = findItem(w, catalogue);
    if (found !== undefined && !ids.includes(found.id)) ids.push(found.id);
  }
  return ids;
}

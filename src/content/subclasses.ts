import { provenanceOf } from "./source";
import type { Entry } from "./schema";

/**
 * Subclasses, derived from a class's own feature list.
 *
 * A compendium has no subclass records. It states them inside the class as
 * features named `"<Grant>: <Subclass>"` — `Arcane Tradition: School of
 * Abjuration`, `Sacred Oath: Oath of Devotion`.
 *
 * **The level is not derived from the features.** Taking the earliest such
 * feature gives Fighter and Paladin a "subclass" of Fighting Style at level 1,
 * and Ranger one of Deft Explorer. The level a class chooses its path is rules
 * knowledge; the list of paths is data.
 */
export type Feature = { readonly level?: number; readonly name?: string; readonly text?: string };

export type ClassRecord = {
  readonly id?: string;
  readonly name?: string;
  readonly features?: readonly Feature[];
};

const SPLIT = /^([^:]{2,40}):\s+(.+)$/;
const sourceLine = (text: string): string | undefined =>
  /Source:\s*([^\n]+)/.exec(text ?? "")?.[1]?.trim();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unqualify = (s: string) => s.replace(/\s*\([^()]*\)\s*$/, "").trim();

/**
 * The content of the LAST balanced parenthetical, or undefined.
 *
 * A regex cannot do this: `\(([\s\S]*)\)$` is greedy and reads
 * "Charm Animals and Plants (Nature Domain) (Theurgy (UA) V2)" as one group
 * beginning at the first bracket. Counted from the end instead.
 */
function lastParen(name: string): string | undefined {
  const s = name.trimEnd();
  if (!s.endsWith(")")) return undefined;
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ")") depth += 1;
    else if (s[i] === "(") {
      depth -= 1;
      if (depth === 0) return s.slice(i + 1, -1);
    }
  }
  return undefined;
}

/**
 * A class's own provenance, read from its features.
 *
 * The class record carries no `Source:` line; its features do. V1 never looked,
 * and so filed Blood Hunter ("Tasha's Hideous Leftovers (Indie)") and Illrigger
 * ("The Illrigger Revised (Third Party)") alongside the twelve.
 *
 * The `Starting <Class>` feature is the class speaking about itself, so it is
 * asked first. Falling back to the commonest source is only for classes whose
 * opening feature names none — and it must not be the primary rule: a cleric's
 * list holds 198 subclasses, so the commonest source in it is somebody's
 * homebrew, which quietly removed the Cleric from the game.
 */
export function classSource(klass: ClassRecord): string {
  const features = klass.features ?? [];
  // "Starting X" only. "Multiclass X" is boilerplate quoting the Player's
  // Handbook's multiclassing rules, and every homebrew class carries one —
  // which filed Blood Hunter and Redeemer (Tanares) under the PHB.
  const starting = features.find(
    (f) => /^Starting /.test(f.name ?? "") && sourceLine(f.text ?? "") !== undefined,
  );
  if (starting !== undefined) return starting.text ?? "";

  // Counted per publication, not per line: "Leftovers p. 10" and
  // "Leftovers p. 11" are one source, and keying on the raw line makes every
  // page its own source so a single PHB reference wins with a count of one.
  const tally = new Map<string, { n: number; text: string }>();
  for (const f of features) {
    const line = sourceLine(f.text ?? "");
    if (line === undefined) continue;
    const key = line.replace(/\s*p\.\s*\d+/i, "").trim();
    const seen = tally.get(key);
    if (seen === undefined) tally.set(key, { n: 1, text: f.text ?? "" });
    else seen.n += 1;
  }
  let best: { n: number; text: string } | undefined;
  for (const v of tally.values()) if (best === undefined || v.n > best.n) best = v;
  return best?.text ?? "";
}

export function grantName(klass: ClassRecord, level: number): string | null {
  for (const f of klass.features ?? []) {
    if (f.level !== level) continue;
    const m = SPLIT.exec(f.name ?? "");
    if (m) return m[1]!.trim();
  }
  return null;
}

/**
 * Every path this class offers at the level it chooses one.
 *
 * Two passes, because a subclass's own features wear the same prefix as the
 * feature that declares it: `Martial Archetype: Champion` declares a path,
 * while `Martial Archetype: Knighthood (Purple Dragon Knight)` is a feature OF
 * one. A candidate whose name ends in a parenthetical naming another candidate
 * is a feature, not a path.
 */
export function pathsOf(klass: ClassRecord, level: number): Entry[] {
  const seen = new Set<string>();
  const candidates: { name: string; feature: Feature }[] = [];
  for (const f of klass.features ?? []) {
    if (f.level !== level) continue;
    const m = SPLIT.exec(f.name ?? "");
    if (!m) continue;
    const name = m[2]!.trim();
    if (seen.has(slug(name))) continue;
    seen.add(slug(name));
    candidates.push({ name, feature: f });
  }

  const paths = new Set(candidates.map((c) => slug(unqualify(c.name))));
  return candidates
    .filter((c) => {
      const qualifier = lastParen(c.name);
      if (qualifier === undefined) return true;
      return !paths.has(slug(unqualify(qualifier)));
    })
    .map((c) => ({
      id: slug(c.name),
      name: c.name,
      kind: "subclass" as const,
      // The defining feature carries the source. "Matthew Mercer - Gunslinger
      // Martial Archetype" IS a source line, and a Gunslinger is not something
      // the game printed — only a positive book match can tell you that.
      provenance: provenanceOf(c.name, c.feature.text ?? ""),
    }));
}

/**
 * The fighting styles a class offers, and the level it offers them.
 *
 * Same shape as a path — the class states them as its own features, named
 * `Fighting Style: Archery`, carrying their own markers and Source lines. So
 * the list is data and needs no table: a Fighter's holds the six from the
 * Player's Handbook, the five from Tasha's, two from Unearthed Arcana and
 * thirty-odd homebrew, and provenance sorts and hides them the same way it
 * does everywhere else.
 *
 * Unlike a subclass, the LEVEL is data too, and stated plainly: a Fighter's
 * are all at 1, a Paladin's and Ranger's at 2. The lowest is the one the
 * builder asks about — a Champion picks a second at 10, which is a level-up
 * question and not a creation one.
 */
export function stylesOf(klass: ClassRecord): { level: number; options: Entry[] } | null {
  const styles = (klass.features ?? []).filter((f) => /^Fighting Style:\s/.test(f.name ?? ""));
  if (styles.length === 0) return null;
  const level = Math.min(...styles.map((f) => f.level ?? 1));

  const seen = new Set<string>();
  const options: Entry[] = [];
  for (const f of styles) {
    if ((f.level ?? 1) !== level) continue;
    const name = (f.name ?? "").replace(/^Fighting Style:\s*/, "").trim();
    const id = slug(name);
    if (name === "" || seen.has(id)) continue;
    seen.add(id);
    options.push({ id, name, kind: "feat", provenance: provenanceOf(name, f.text ?? "") });
  }
  return options.length > 0 ? { level, options } : null;
}

/**
 * The choices a class makes about itself.
 *
 * Ported from V1's `domain/subclass.ts`. A compendium marks none of this
 * structurally — it hides it in the feature list, where "Divine Domain" is the
 * question and "Divine Domain: Knowledge Domain" is one answer, with the
 * features it grants suffixed "(Knowledge Domain)".
 *
 * That shape covers more than subclasses. A fighter's Fighting Style, a
 * sorcerer's Metamagic and a warlock's Pact Boon are written the same way, so
 * ONE reading answers all of them rather than a special case each — which is
 * what V2 had, and why a sorcerer was never asked about Metamagic and a
 * warlock never about their Pact Boon.
 *
 * A head only counts as a CHOICE when the class also has a plain feature of
 * exactly that name — the question itself — and at least two answers. Without
 * that test, "Channel Divinity: Turn Undead" looks like a decision when it is
 * the only thing on offer.
 */

export type ClassFeature = {
  readonly level?: number | undefined;
  readonly name?: string | undefined;
  readonly text?: string | undefined;
};

export type ChoiceOption = {
  /** As it should be READ: "Gloom Stalker", "Evocation". */
  readonly name: string;
  /**
   * As the file WROTE it, marker and all: "Bog Phantom (HB)".
   *
   * The display name has the trailing parenthetical stripped, which is right
   * for a menu and quietly fatal for provenance: every homebrew archetype came
   * out looking like the game's own, so a ranger was offered sixty-four
   * subclasses of which fifty-six were somebody else's.
   */
  readonly full: string;
  readonly level: number;
};

/**
 * The one question that has a screen of its own.
 *
 * Named once because two places need it and must agree: the step that asks it,
 * and the general "what does your class ask?" screen that must therefore NOT.
 * A question with a dedicated screen asked in both places is asked twice.
 */
export const STYLE = "Fighting Style";

export type ChoicePoint = {
  /** "Divine Domain", "Fighting Style", "Metamagic". */
  readonly of: string;
  /** The level at which the class asks. */
  readonly level: number;
  readonly options: readonly ChoiceOption[];
};

const SPLIT = /^(.{3,40}?):\s+(.+)$/;

/**
 * The OUTERMOST trailing parenthetical, which is not the innermost.
 *
 * A class table names subclass features as "Rallying Cry (Purple Dragon
 * Knight (Banneret))". Reading the innermost group gives "Banneret", which
 * matches no option and made the feature look class-wide — so a fighter
 * reaching 3 was told they gained a hundred and fifty features belonging to
 * subclasses they had not taken.
 */
export function outerParen(name: string): string | null {
  const t = (name ?? "").trim();
  if (!t.endsWith(")")) return null;
  let depth = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ")") depth++;
    else if (t[i] === "(") {
      depth--;
      if (depth === 0) return t.slice(i + 1, -1).trim();
    }
  }
  return null;
}

/**
 * Whose feature this is, given the options that actually exist.
 *
 * A trailing parenthetical is only an owner if it names one: "Action Surge
 * (one use)" is a plain class feature, and a rule that read every
 * parenthetical as a subclass would drop it from what you just gained.
 */
export function ownerOf(name: string, options: ReadonlySet<string>): string | null {
  const inner = outerParen(name);
  if (inner === null) return null;
  for (const o of options) {
    if (inner === o || inner.startsWith(`${o} (`) || inner.startsWith(`${o}(`)) return o;
  }
  return null;
}

export function findChoices(features: readonly ClassFeature[]): ChoicePoint[] {
  const plain = new Map<string, number>();
  for (const f of features) {
    const name = (f.name ?? "").trim();
    if (name !== "" && !SPLIT.test(name)) plain.set(name, f.level ?? 1);
  }

  const grouped = new Map<string, ChoiceOption[]>();
  for (const f of features) {
    const m = SPLIT.exec((f.name ?? "").trim());
    if (m === null) continue;
    const head = m[1]!.trim();
    if (!plain.has(head)) continue;
    // "Divine Domain: Knowledge Domain (Knowledge Domain)" would double up.
    const option = m[2]!.replace(/\s*\([^()]*\)\s*$/, "").trim();
    if (option === "") continue;
    const at = grouped.get(head) ?? [];
    if (!at.some((o) => o.name === option)) {
      at.push({ name: option, full: m[2]!.trim(), level: f.level ?? 1 });
    }
    grouped.set(head, at);
  }

  return [...grouped.entries()]
    .filter(([, options]) => options.length >= 2)
    .map(([of, options]) => ({
      of,
      level: plain.get(of) ?? Math.min(...options.map((o) => o.level)),
      options: [...options].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.level - b.level || a.of.localeCompare(b.of));
}

/** The ones a character at this level has been asked. */
export const choicesBy = (points: readonly ChoicePoint[], level: number): ChoicePoint[] =>
  points.filter((p) => p.level <= level);

/**
 * Whether a recorded answer names this option.
 *
 * The answer is written down in more than one way: a character built here
 * stores "Life Domain", one imported stores whatever its file said. Comparing
 * exactly loses a cleric their own domain features, which is worse than
 * showing a few extra — so the match is loose in two named places and nowhere
 * else. A trailing label ("life" answers "Life Domain") and a leading one
 * across "of" ("Evocation" answers "School of Evocation"). Matching any shared
 * last word would hand a Hunter every feature of the Trophy Hunter.
 */
export function answers(answer: string, option: string): boolean {
  const a = answer.trim().toLowerCase();
  const o = option.trim().toLowerCase();
  if (a === "" || o === "") return false;
  if (a === o) return true;
  if (o.startsWith(`${a} `) || a.startsWith(`${o} `)) return true;
  const across = (whole: string, tail: string) =>
    new RegExp(`\\bof (the )?${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`).test(whole);
  return across(o, a) || across(a, o);
}

/** Rows a compendium writes that are not features. */
const STRUCTURE = /^(starting|multiclass)\b/i;

/**
 * What THIS character has, out of everything the class can be.
 *
 * A complete compendium's ranger table carries every archetype ever written
 * for it — 372 feature names by level 8, of which 22 belong to the character
 * holding the sheet.
 */
export function ownFeatures(
  features: readonly ClassFeature[],
  { level, answered }: { level: number; answered: readonly string[] },
): { level: number; names: string[] }[] {
  const options = new Set(findChoices(features).flatMap((p) => p.options.map((o) => o.name)));
  const mine = answered.filter((a) => a.trim() !== "");

  const byLevel = new Map<number, string[]>();
  const said = new Set<string>();
  for (const f of features) {
    const name = (f.name ?? "").trim();
    const at = f.level ?? 1;
    if (name === "" || at > level) continue;
    if (STRUCTURE.test(name)) continue;
    // "Divine Domain: Life Domain" is the question being answered, not a
    // feature. The answer shows up as the features it granted.
    if (/^.{3,40}?:\s/.test(name)) continue;
    const owner = ownerOf(name, options);
    if (owner !== null && !mine.some((a) => answers(a, owner))) continue;
    const key = `${String(at)}|${name.replace(/\s*\([^()]*\)\s*$/, "").trim().toLowerCase()}`;
    if (said.has(key)) continue;
    said.add(key);
    byLevel.set(at, [...(byLevel.get(at) ?? []), name]);
  }
  return [...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([l, names]) => ({ level: l, names }));
}

/**
 * What an ancestry leaves to you.
 *
 * Ported from V1's `domain/races.ts`, which existed because of a measured
 * bug: the builder applied the fixed half of a racial bonus and silently
 * dropped the rest, so a half-elf arrived two points short of what the book
 * says — on the one screen whose whole job is showing consequences. V2 had
 * the same hole, and worse: a Variant Human's `abilityBonuses` is `{}`, so
 * they arrived with no bonuses at all.
 *
 * 66 of 605 ancestries leave ability points to the player, 32 leave a skill,
 * and 4 grant a feat outright.
 *
 * The phrasing is near-boilerplate, which is what makes reading it safe, and
 * anything unrecognised yields no choice rather than a guessed one.
 */

export type Trait = { readonly name?: string; readonly text?: string };

export type FreeBonus = {
  /** How many abilities they raise. */
  readonly count: number;
  /** By how much, each. Always 1 in the rules as written. */
  readonly each: number;
  /** Whether they must be different abilities. They always are, in practice. */
  readonly distinct: boolean;
};

const WORDS: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3 };

/**
 * "Two different ability scores of your choice increase by 1."
 *
 * The trait states the FIXED half in the same sentence, and the compendium
 * already carries that structurally as `abilityBonuses` — so only the "of
 * your choice" clause is read here, and the fixed part is never counted twice.
 */
export function freeBonusFrom(traits: readonly Trait[] | undefined): FreeBonus | null {
  for (const t of traits ?? []) {
    if (!/ability score increase/i.test(t.name ?? "")) continue;
    const m = /\b(one|two|three)\b\s+(different\s+)?abilit(?:y|ies)[^.]{0,40}?of your choice[^.]{0,30}?by\s+(\d)/i
      .exec(t.text ?? "");
    if (m) {
      return {
        count: WORDS[m[1]!.toLowerCase()] ?? 1,
        each: Number(m[3]) || 1,
        distinct: m[2] !== undefined,
      };
    }
  }
  return null;
}

/** A skill the ancestry lets them choose — a variant human's, a half-elf's two. */
export function freeSkillsFrom(traits: readonly Trait[] | undefined): number {
  for (const t of traits ?? []) {
    const name = (t.name ?? "").toLowerCase();
    if (!/^skills?$|skill versatility/.test(name)) continue;
    const m = /\b(one|two|three)\b\s+skills?\b/i.exec(t.text ?? "");
    if (m) return WORDS[m[1]!.toLowerCase()] ?? 1;
  }
  return 0;
}

/** A feat the ancestry grants at level one — a variant human's, a custom lineage's. */
export const grantsFeatFrom = (traits: readonly Trait[] | undefined): boolean =>
  (traits ?? []).some((t) =>
    /you gain one feat of your choice|gain a feat of your choice/i.test(`${t.name ?? ""} ${t.text ?? ""}`));

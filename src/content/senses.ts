/**
 * What an ancestry lets a character see.
 *
 * Ported from V1's `domain/senses.ts`. Read off the traits, because that is
 * where the file puts it — there is no structured field for any of this in any
 * compendium the app reads. V2 showed the trait NAMES and derived nothing, so
 * a sheet never said how far its owner could see in the dark.
 */

export type Trait = { readonly name?: string; readonly text?: string };

export type Senses = {
  /** Feet of darkvision. 0 for none, 60 usual, 120 for superior. */
  readonly darkvision: number;
  /** Drow and their kin: disadvantage in direct sunlight. */
  readonly sunlightSensitivity: boolean;
  /** Rarer, and rarely mechanised: kept because the sheet should say it. */
  readonly blindsight: number;
  readonly tremorsense: number;
  readonly truesight: number;
};

export const NO_SENSES: Senses = {
  darkvision: 0, sunlightSensitivity: false, blindsight: 0, tremorsense: 0, truesight: 0,
};

/** "…within 60 feet of you…" — the number is always stated in the trait. */
const feetIn = (text: string, fallback: number): number => {
  const m = /(\d{2,3})\s*(?:feet|ft)/i.exec(text ?? "");
  return m === null ? fallback : Number(m[1]);
};

/**
 * A range that cannot be found falls back to the rulebook's usual rather than
 * to zero: an ancestry whose trait says "Darkvision" and nothing parseable
 * still has darkvision, and saying 0 would be worse than saying 60.
 */
export function sensesFrom(traits: readonly Trait[] | undefined): Senses {
  let out = { ...NO_SENSES };
  for (const t of traits ?? []) {
    const name = (t.name ?? "").toLowerCase();
    const text = t.text ?? "";

    if (/superior darkvision/.test(name)) {
      out = { ...out, darkvision: Math.max(out.darkvision, feetIn(text, 120)) };
    } else if (/darkvision/.test(name)) {
      out = { ...out, darkvision: Math.max(out.darkvision, feetIn(text, 60)) };
    }
    if (/sunlight sensitivity|light sensitivity/.test(name)) out = { ...out, sunlightSensitivity: true };
    if (/blindsight/.test(name)) out = { ...out, blindsight: feetIn(text, 10) };
    if (/tremorsense/.test(name)) out = { ...out, tremorsense: feetIn(text, 30) };
    if (/truesight/.test(name)) out = { ...out, truesight: feetIn(text, 30) };
  }
  return out;
}

/** Whether anything here is worth a line on the sheet. */
export const hasSenses = (s: Senses): boolean =>
  s.darkvision > 0 || s.sunlightSensitivity || s.blindsight > 0 || s.tremorsense > 0 || s.truesight > 0;

/** One line, the way a statblock prints it. */
export function describeSenses(s: Senses): string {
  const parts: string[] = [];
  if (s.truesight > 0) parts.push(`truesight ${String(s.truesight)} ft`);
  if (s.blindsight > 0) parts.push(`blindsight ${String(s.blindsight)} ft`);
  if (s.tremorsense > 0) parts.push(`tremorsense ${String(s.tremorsense)} ft`);
  if (s.darkvision > 0) parts.push(`darkvision ${String(s.darkvision)} ft`);
  if (s.sunlightSensitivity) parts.push("sunlight sensitivity");
  return parts.join(" · ");
}

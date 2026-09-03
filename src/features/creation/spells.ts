import type { Entry, SpellEntry } from "../../content/schema";
import type { Option } from "../../ui/step/Choices";
import { castableBy } from "../../content/spells";
import { toOption, type Loaded } from "./loaded";

/**
 * Which spells this character may take, in the three shapes the screens want.
 *
 * All three go through `castableBy`, so the creation list and the level-up
 * list cannot drift apart — which they had, one matching bare class names and
 * the other running them through `key()`, which strips parentheses and so read
 * "sorcerer (clockwork soul)" as "sorcerer".
 */
export function spellsFrom(loaded: Loaded, keep: <T extends Entry>(rows: readonly T[]) => T[]) {
  const spells = keep(loaded.spells).filter((s) => !s.isFeature);
  const label = (sp: SpellEntry) =>
    sp.level === 0 ? (sp.school === "" ? "cantrip" : `${sp.school} cantrip`) : `level ${String(sp.level)}`;

  /** Cantrips for a class, or all of them for one the compendium never names. */
  const forClass = (klass: string | null, subclass: string | null = null): SpellEntry[] => {
    const cantrips = spells.filter((s) => s.level === 0);
    if (klass === null) return cantrips;
    const mine = cantrips.filter((s) => castableBy(s, klass, subclass));
    // A screen with nothing on it is worse than a long one.
    return mine.length === 0 ? cantrips : mine;
  };

  /** Spells of exactly one level. 0 is cantrips. */
  const spellOptions = (klass: string, subclass: string | null, level: number): readonly Option[] =>
    spells
      .filter((sp) => sp.level === level && castableBy(sp, klass, subclass))
      .map((sp) => toOption(sp, label(sp)));

  /** Everything a caster could learn at a level — up to what they can cast. */
  const spellsAt = (klass: string, level: number, subclass: string | null = null): readonly Option[] => {
    const top = Math.min(9, Math.ceil(level / 2));
    return spells
      .filter((sp) => sp.level <= top && castableBy(sp, klass, subclass))
      .map((sp) => toOption(sp, label(sp)));
  };

  return { forClass, spellOptions, spellsAt };
}

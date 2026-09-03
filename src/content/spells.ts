import { answers } from "./choicepoints";

/**
 * Compendiums file class FEATURES under spells — invocations, maneuvers,
 * metamagic, runes, infusions, elemental disciplines. In the shipped file that
 * is **1,539 of 3,443 entries, 1,409 of them claiming level 0**, so a warlock
 * browsing cantrips gets a wall of invocations before a single spell.
 *
 * Two signals, and both are needed. Most carry no school, which no real spell
 * omits. The rest announce their category before a colon — and some of those
 * DO have a school: 166 do, across seven prefixes (Elemental Discipline,
 * Infusion, Splicer Augment, Dark Ritual, Arcane Shot, Suppressing Ki, Death
 * Powers), and every one of them is a feature rather than a spell.
 *
 * The prefix is deliberately not a whitelist. Enumerating the categories
 * misses 45 entries in this corpus alone, and the next compendium invents its
 * own. Measured both ways: the open rule finds 1,539 and the enumerated one
 * 1,494, with nothing caught by the enumeration that the open rule misses.
 *
 * Hidden by default rather than discarded: they are real things somebody
 * tracks, just not from a spell list.
 */
export function isClassFeature(spell: { name: string; school?: string }): boolean {
  return (spell.school ?? "").trim() === "" || /^[^:]{1,40}:\s/.test(spell.name ?? "");
}

/**
 * Whether this character can cast it.
 *
 * A compendium lists every class AND subclass that grants a spell — "wizard",
 * "cleric (light domain)", "sorcerer (clockwork soul)", "wizard (school of
 * invention (ua))". Three readings, two of them wrong:
 *
 *   - An exact bare match alone hides Fireball from a Light cleric, who
 *     genuinely has it. V1 says so, and rejected it.
 *   - `key()`, which strips parentheses, turns "sorcerer (clockwork soul)"
 *     into "sorcerer" and put Aid, Bane and Bless on a plain sorcerer's list.
 *   - V1 took the middle road — any unmarked qualifier counts — because its
 *     call site did not know the character's subclass.
 *
 * V2 does know it. So a qualified entry counts only when the character
 * actually took that subclass, which is strictly better than either: a Light
 * cleric gets Fireball, a Life cleric does not, and no plain sorcerer is
 * offered a Clockwork Soul's spells.
 */
export function castableBy(
  spell: { readonly classes?: readonly string[] },
  klass: string,
  subclass: string | null = null,
): boolean {
  const want = klass.trim().toLowerCase();
  if (want === "") return false;
  // Tolerates an absent list: a record saved by an older import must not be
  // able to blank the screen.
  return (spell.classes ?? []).some((raw) => {
    const c = raw.trim().toLowerCase();
    if (c === want) return true;
    if (!c.startsWith(`${want} (`)) return false;
    if (subclass === null) return false;
    // "cleric (light domain)" -> "light domain", which "Light Domain" answers.
    const qualifier = c.slice(want.length + 2, -1);
    return answers(subclass, qualifier);
  });
}

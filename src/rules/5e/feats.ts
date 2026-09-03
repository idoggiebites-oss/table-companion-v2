import { ABILITY_NAME, type Ability, type Scores } from "./abilities";

/**
 * Whether a character qualifies for a feat.
 *
 * Ported from V1's `domain/feats.ts`. V2 offered every feat to everybody —
 * Grappler to a Strength 8 wizard, Elven Accuracy to a dwarf.
 *
 * **Deliberately conservative.** An unrecognised prerequisite reads as allowed
 * with the requirement stated. Blocking on a guess would stop somebody taking
 * a feat they are entitled to, and being wrong in that direction is worse: the
 * table can always say no, but the app saying no is the end of it.
 */
export type Aspirant = {
  readonly scores: Scores;
  /** Whether they can cast anything at all. */
  readonly casts: boolean;
  /** "Wood Elf", "Mountain Dwarf". Free text, because a compendium's is too. */
  readonly race: string;
};

export type Verdict =
  | { readonly ok: true }
  /** Checked, and they do not have it. */
  | { readonly ok: false; readonly why: string }
  /** Not checkable here. Stated, never blocked. */
  | { readonly ok: true; readonly unverified: string };

const ABILITY_WORDS: Readonly<Record<string, Ability>> = {
  strength: "str", dexterity: "dex", constitution: "con",
  intelligence: "int", wisdom: "wis", charisma: "cha",
};

const RACE_WORDS = [
  "dwarf", "elf", "halfling", "human", "dragonborn", "gnome", "half-elf",
  "half-orc", "tiefling", "orc", "goblin", "aasimar", "genasi", "tabaxi",
];

/** Races a prerequisite names, matched loosely — "Elf (Drow)" against "Wood Elf". */
function isRace(prereq: string, race: string): boolean {
  const mine = race.toLowerCase();
  // "Elf or Half-Elf", "Elf (Drow)" — any named race matching is enough.
  return prereq.toLowerCase()
    .split(/\s+or\s+|,/)
    .map((p) => p.replace(/\(.*?\)/g, "").trim())
    .some((n) => n.length > 2 && mine.includes(n));
}

export function meets(prerequisite: string, who: Aspirant): Verdict {
  const p = (prerequisite ?? "").trim();
  if (p === "") return { ok: true };
  const low = p.toLowerCase();

  // "Strength 13 or higher", "Intelligence or Wisdom 13 or higher"
  const score = /(\d{1,2})\s*(?:or higher)?\s*$/.exec(low);
  const named = Object.keys(ABILITY_WORDS).filter((w) => low.includes(w));
  if (score !== null && named.length > 0) {
    const need = Number(score[1]);
    const enough = named.some((w) => who.scores[ABILITY_WORDS[w]!] >= need);
    return enough
      ? { ok: true }
      : { ok: false, why: `Needs ${named.map((w) => ABILITY_NAME[ABILITY_WORDS[w]!]).join(" or ")} ${String(need)}.` };
  }

  if (/cast at least one spell|spellcasting/.test(low)) {
    return who.casts ? { ok: true } : { ok: false, why: "Needs to be able to cast a spell." };
  }

  if (RACE_WORDS.some((r) => low.includes(r))) {
    return isRace(p, who.race) ? { ok: true } : { ok: false, why: `Only for a ${p}.` };
  }

  // A fighting style, a proficiency, a subclass feature — real requirements
  // this app does not model. Said out loud rather than enforced or hidden.
  return { ok: true, unverified: p };
}

/** Whether a verdict should stop the taking of it. */
export const blocked = (v: Verdict): v is { ok: false; why: string } => !v.ok;

/**
 * What taking a feat does to the numbers.
 *
 * Half-feats raise an ability by one, and Resilient — alone in the game —
 * grants a saving throw proficiency. The compendium ships these pre-split by
 * their own choice: not "Resilient" with a dropdown but `Resilient (Strength)`
 * and five siblings, so the answer is already in the name.
 *
 * Leaving the save unapplied makes the sheet quietly wrong about the number
 * the player took the feat FOR.
 */
export type FeatEffects = {
  readonly increase?: Ability;
  readonly saveProficiency?: Ability;
};

const ABILITY_BY_NAME: Readonly<Record<string, Ability>> = {
  strength: "str", dexterity: "dex", constitution: "con",
  intelligence: "int", wisdom: "wis", charisma: "cha",
};

/** The ability a variant names, when it names one: "Resilient (Dexterity)". */
export function variantAbility(name: string): Ability | null {
  for (const m of (name ?? "").matchAll(/\(([^()]{1,30})\)/g)) {
    const a = ABILITY_BY_NAME[m[1]!.trim().toLowerCase()];
    if (a !== undefined) return a;
  }
  return null;
}

export function effectsOf(feat: { readonly name?: string; readonly text?: string }): FeatEffects {
  const text = (feat.text ?? "").toLowerCase();
  const named = variantAbility(feat.name ?? "");

  // "Increase the chosen ability score by 1" — the variant says which.
  const chosen = /increase the chosen ability score by 1/.test(text);
  // "Increase your Charisma score by 1" — the feat says which, no variant.
  const fixed = /increase your (\w+) score by 1/.exec(text);
  // "Increase your Intelligence or Wisdom score by 1" — the variant says which.
  const either = /increase your \w+ or \w+ score by 1/.test(text);

  let increase: Ability | undefined;
  if (chosen || either) increase = named ?? undefined;
  else if (fixed !== null) increase = ABILITY_BY_NAME[fixed[1]!] ?? undefined;

  const save = /proficiency in saving throws using the chosen ability/.test(text) && named !== null
    ? named
    : undefined;

  return {
    ...(increase === undefined ? {} : { increase }),
    ...(save === undefined ? {} : { saveProficiency: save }),
  };
}

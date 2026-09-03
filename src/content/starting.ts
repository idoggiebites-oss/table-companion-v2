/**
 * What a class hands a first-level character.
 *
 * V2 shipped with a three-weapon table hardcoded for four classes, and a flat
 * "choose 2" for skills regardless of who was choosing. The compendium has
 * carried the real answer the whole time, in the class's own `Starting <Class>`
 * feature — 54 of 67 classes have one, and all thirteen familiar ones do.
 *
 * The shape is boilerplate, four bullets under two headings:
 *
 *     • Armor: light armor, medium armor, heavy armor, shields
 *     • Weapons: simple weapons, martial weapons
 *     • Tools: none
 *     • Skills: Choose 2 from Acrobatics, Animal Handling, Athletics, ...
 *
 *     • (a) chain mail or (b) leather armor, longbow, and arrows (20)
 *     • (a) a martial weapon and a shield or (b) two martial weapons
 *     • A shield and a holy symbol
 *
 * A bullet with lettered options is a decision. A bullet without them is
 * given. Anything the parse cannot read is left out rather than guessed at,
 * and a class with no `Starting` feature returns nothing at all — the builder
 * then says the class states no starting equipment, which is true and is
 * better than handing a homebrew class a longsword it never mentioned.
 *
 * Compile time only.
 */
import { toolsFromClass, type Granted } from "./proficiencies";

/** One line of the equipment list: either a pick, or a grant. */
export type GearLine = {
  readonly id: string;
  /** More than one when the line is "(a) … or (b) …". Exactly one is a grant. */
  readonly options: readonly string[];
};

export type Starting = {
  /** The skills this class offers, and how many of them. Both from the book. */
  readonly skills: readonly string[];
  readonly skillCount: number;
  readonly armor: readonly string[];
  readonly weapons: readonly string[];
  readonly tools: Granted;
  readonly gear: readonly GearLine[];
};

export const NO_START: Starting = {
  skills: [], skillCount: 0, armor: [], weapons: [], tools: { known: [], choose: 0 }, gear: [],
};

const WORD: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3, four: 4 };

/** The text after a bulleted heading, to the end of its line. */
const bullet = (text: string, heading: string): string =>
  new RegExp(`•\\s*${heading}s?\\s*:\\s*([^\\n]+)`, "i").exec(text)?.[1]?.trim() ?? "";

/** "light armor, medium armor, shields" → three things. "none" → nothing. */
const list = (said: string): string[] =>
  /^none\.?$/i.test(said.trim()) ? []
    : said.split(/,| and /i).map((s) => s.trim().replace(/\.$/, "")).filter(Boolean);

/** "Choose 2 from Acrobatics, Animal Handling, …" */
function readSkills(said: string): { count: number; from: string[] } {
  const m = /choose\s+(\d+|one|two|three|four)\s+from\s+(.+)$/i.exec(said);
  if (!m) return { count: 0, from: list(said) };
  const n = m[1]!;
  return {
    count: /^\d+$/.test(n) ? Number(n) : (WORD[n.toLowerCase()] ?? 2),
    from: list(m[2]!),
  };
}

/*
 * A lettered option is a single letter in brackets. Matching brackets loosely
 * ate "arrows (20)" and "(if proficient)" — the first turned a quantity into
 * an option, the second turned a caveat into one.
 */
const LETTER = /\(([a-h])\)\s*/g;

function readGear(text: string): GearLine[] {
  const after = text.split(/equipment,?\s+in addition to[^\n]*\n/i)[1];
  if (after === undefined) return [];
  const lines = after.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("•"));
  const out: GearLine[] = [];
  for (const [i, raw] of lines.entries()) {
    const line = raw.replace(/^•\s*/, "").trim();
    if (line === "") continue;
    const id = `gear-${i}`;
    if (!LETTER.test(line)) {
      LETTER.lastIndex = 0;
      /*
       * Not every choice is lettered. The artificer's armour line reads "your
       * choice of studded leather armor or scale mail", and read as a grant it
       * handed over a sentence instead of offering two suits of armour.
       */
      const said = /your choice of\s+(.+)$/i.exec(line);
      const both = said && / or /i.test(said[1]!)
        ? said[1]!.split(/,?\s+or\s+/i).map((s) => s.trim()).filter(Boolean)
        : [];
      out.push({ id, options: both.length > 1 ? both : [line] });
      continue;
    }
    LETTER.lastIndex = 0;
    const options = line
      .split(LETTER)
      // The split keeps the captured letters; every other piece is a label.
      .filter((_, n) => n % 2 === 0)
      /*
       * Strip the separator, not the word. "leather armor" ENDS in "or", and
       * a trailing `(?:or)?` with optional whitespace ate it — the Ranger was
       * offered "leather arm". The separator must be preceded by a space or a
       * comma to be a separator at all.
       */
      .map((s) => s.trim().replace(/(?:,\s*|\s+)or\s*$|,\s*$/i, "").trim())
      .filter(Boolean);
    out.push({ id, options: options.length > 0 ? options : [line] });
  }
  return out;
}

export function startingOf(features: readonly { name?: string; text?: string }[]): Starting {
  const f = features.find((x) => /^Starting\s/i.test(x.name ?? ""));
  if (!f?.text) return NO_START;
  const t = f.text;
  const skills = readSkills(bullet(t, "Skill"));
  return {
    skills: skills.from,
    skillCount: skills.count,
    armor: list(bullet(t, "Armor")),
    weapons: list(bullet(t, "Weapon")),
    tools: toolsFromClass(bullet(t, "Tool")),
    gear: readGear(t),
  };
}

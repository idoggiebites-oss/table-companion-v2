import { bookOf, bookOrder, isOfficialSource } from "./books";
import { sourceMark } from "./marks";

/**
 * Where a record came from, resolved once in the build and never re-derived.
 *
 * V1 parsed this at every call site and fixed the resulting bug twice, in two
 * places. Here it is a required field on the record; a screen reads it.
 */
export type Tier = "official" | "ua" | "indie" | "homebrew" | "unknown";

export type Provenance = {
  /** Axis 1 — is this the game's own? */
  readonly tier: Tier;
  /** The publication as the compendium names it. */
  readonly source: string;
  /** Axis 2 — one of the nineteen, or null, which means "elsewhere". */
  readonly book: string | null;
  /** Publication order. Unfiled sorts last. */
  readonly order: number;
};

/**
 * The compendium states the publication in prose, at the end of the text:
 * "Source:\tPlayer's Handbook (2014) p. 110". Every race, feat, background
 * and spell in the shipped file carries one — 5,168 of 5,168. Items and
 * classes carry none, and fall back to the name marker alone.
 */
export function rawSource(text: string): string | null {
  return /Source:\s*([^\n]+)/.exec(text ?? "")?.[1]?.trim() ?? null;
}

export function parseSource(text: string): string | null {
  const raw = rawSource(text);
  if (raw === null) return null;
  return raw
    .replace(/\s*p\.\s*\d+.*$/i, "")   // page reference and anything after it
    .replace(/\s*\((?:homebrew|indie|third[- ]party|hb|tp|ua)\)\s*$/i, "") // classification, not the edition year
    .replace(/[,;]\s*$/, "")            // the file's trailing comma
    .trim();
}

const TIER_MARK: ReadonlyArray<readonly [RegExp, Tier]> = [
  [/\(homebrew\)|\bhomebrew\b/i, "homebrew"],
  [/\(third[- ]party\)|\(indie\)/i, "indie"],
  [/unearthed arcana/i, "ua"],
];

/**
 * A name marker the file's author wrote about THIS record. It beats the prose
 * source line, which a variant inherits from its base: "Dragonborn, Revenant
 * (UA)" carries no text of its own and inherits the base Dragonborn's
 * "Source: Player's Handbook (2014)", so the prose alone files a UA race
 * under the PHB.
 */
const NAMED_TIER: Readonly<Record<string, Tier>> = {
  hb: "homebrew", homebrew: "homebrew",
  tp: "indie", "3pp": "indie", indie: "indie",
  ua: "ua",
};

/**
 * Two independent signals, and they are combined rather than trusted singly:
 * the prose Source line, and the parenthetical marker in the name. A record is
 * the game's own only when NEITHER says otherwise.
 */
export function provenanceOf(name: string, text: string): Provenance {
  const raw = rawSource(text);
  const source = parseSource(text);
  const mark = sourceMark(name);

  let tier: Tier = "unknown";
  if (raw !== null) {
    // Test the RAW line: "Tanares p. 190 (Indie)" loses its marker to the
    // page-reference strip, which is how (Indie) first measured as zero.
    //
    // And a source line is not a claim to be official. Every third-party
    // publication carries one; "Matthew Mercer - Gunslinger Martial Archetype"
    // is a source, and a Gunslinger is not something the game printed.
    tier = isOfficialSource(source ?? "") ? "official" : "indie";
    for (const [re, t] of TIER_MARK) if (re.test(raw)) { tier = t; break; }
  }

  const book = source === null ? null : bookOf(source);

  // The file's own author, about this record, beats an inherited source line.
  const named = mark === null ? undefined : NAMED_TIER[mark.trim().toLowerCase()];
  if (named !== undefined) tier = named;
  else if (mark !== null && tier === "official" && book === null) tier = "homebrew";
  else if (source === null && mark !== null) tier = "homebrew";
  if (source === null && mark === null) tier = "unknown";

  return { tier, source: source ?? "", book, order: bookOrder(book) };
}

/**
 * Is this positively marked as somebody else's?
 *
 * `unknown` is NOT marked. A class record carries no source line and no name
 * marker, so all twelve of the game's own classes resolve to `unknown` — and
 * hiding them was exactly what treating unknown as third-party did. Absence of
 * evidence is not evidence. The markers hide; nothing else does.
 */
export const isMarked = (p: Provenance): boolean =>
  p.tier === "homebrew" || p.tier === "indie" || p.tier === "ua";

/** The game's own material sorts first, everywhere it is listed. */
export const isGames = (p: Provenance): boolean => !isMarked(p);

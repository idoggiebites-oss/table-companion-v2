import type { Build } from "./model";

/** What one source hands over. */
export type Grant = { readonly languages: readonly string[]; readonly tools: readonly string[] };

/** Ancestry, class, background — the three that grant proficiencies. */
export type Source = "race" | "klass" | "background";

export const NO_GRANT: Grant = { languages: [], tools: [] };

/**
 * Everything the character speaks, and everything they can use.
 *
 * Granted plus chosen, the same shape as `scoresOf`. Reading `b.languages`
 * directly gives only what was picked at the proficiencies step — a Human
 * Rogue would show one language and no thieves' tools, having been given
 * Common by their ancestry and the tools twice over.
 */
export const languagesOf = (b: Build): readonly string[] =>
  merge(b.granted.race.languages, b.granted.background.languages, b.languages);

export const toolsOf = (b: Build): readonly string[] =>
  merge(b.granted.klass.tools, b.granted.background.tools, b.granted.race.tools, b.tools);

/** First spelling wins, and nothing repeats. */
function merge(...lists: readonly (readonly string[])[]): string[] {
  const seen = new Map<string, string>();
  for (const list of lists) {
    for (const x of list) {
      const k = x.trim().toLowerCase();
      if (k !== "" && !seen.has(k)) seen.set(k, x.trim());
    }
  }
  return [...seen.values()];
}

import { ALL_LANGUAGES, gather, kindsNamed, resolveTool } from "../../content/proficiencies";
import type { ClassEntry, BackgroundEntry, RaceEntry } from "../../content/schema";
import type { Asking } from "./facts";
import { NO_GRANT, type Grant } from "./proficiency";
import type { Loaded } from "./compendium";

/**
 * One decision about a proficiency, with its own pool.
 *
 * Kept apart rather than merged into one long list, because the pools differ
 * and merging them lets a person spend a Criminal's gaming set on a lute. A
 * Half-Elf Bard with a Criminal background gets three separate questions:
 * two languages, three instruments, one gaming set.
 */
export type Pick = {
  readonly id: string;
  /** "Languages", "Musical instruments" — what is being chosen. */
  readonly label: string;
  readonly count: number;
  readonly options: readonly string[];
  /** Who is asking — "Half-Elf", "Bard", "Criminal". */
  readonly from: string;
};

/** Everything a character speaks and can use, and what is left to decide. */
export type Offer = {
  readonly languages: readonly string[];
  readonly tools: readonly string[];
  readonly picks: readonly Pick[];
};

export const NO_OFFER: Offer = { languages: [], tools: [], picks: [] };


/**
 * What an ancestry, a class and a background between them hand over, and what
 * they leave open.
 *
 * All three at once, because a question is only worth asking once: a Half-Elf
 * who already speaks Elvish should not be offered it again by their
 * background, and a Rogue handed thieves' tools by both their class and their
 * Criminal past holds one set, not two.
 */
/**
 * What one source hands over on its own, for the choice event to carry.
 *
 * Recorded at the moment of choosing, the way an ancestry's ability bonuses
 * are, so that a sheet never needs the compendium open to say what a
 * character speaks — and so that changing a background takes its tools with
 * it rather than leaving them behind.
 */
export function grantFrom(loaded: Loaded): (step: string, id: string) => Grant {
  const toolNames = loaded.tools.map((t) => t.name);
  const named = (xs: readonly string[]) => xs.map((t) => resolveTool(t, toolNames));
  return (step, id) => {
    if (step === "ancestry" || step === "subrace") {
      const r = loaded.races.find((x) => x.id === id);
      return r === undefined ? NO_GRANT : { languages: r.languages.known, tools: [] };
    }
    if (step === "class") {
      const c = loaded.classes.find((x) => x.id === id);
      return c === undefined ? NO_GRANT : { languages: [], tools: named(c.tools.known) };
    }
    if (step === "background") {
      const g = loaded.backgrounds.find((x) => x.id === id)?.grants;
      return g === undefined ? NO_GRANT : { languages: g.namedLanguages, tools: named(g.tools) };
    }
    return NO_GRANT;
  };
}

export function offerFrom(loaded: Loaded): (b: Asking) => Offer {
  const classOf = (id: string | null): ClassEntry | undefined =>
    id === null ? undefined : loaded.classes.find((c) => c.id === id);
  const bgOf = (id: string | null): BackgroundEntry | undefined =>
    id === null ? undefined : loaded.backgrounds.find((b) => b.id === id);
  /* The lineage speaks, not the group: a High Elf's languages are the High
     Elf's. Falling back to the ancestry covers the ones with no lineages. */
  const raceOf = (b: Asking): RaceEntry | undefined =>
    loaded.races.find((r) => r.id === (b.subrace ?? b.race));

  const toolNames = loaded.tools.map((t) => t.name);
  /** The tools in the families a phrase names, or all of them if it names none. */
  const toolsIn = (said: string): string[] => {
    const kinds = kindsNamed(said);
    if (kinds.length === 0) return toolNames;
    return loaded.tools.filter((t) => t.kind !== null && kinds.includes(t.kind)).map((t) => t.name);
  };
  /** "one type of gaming set" → "Gaming set". The label of the question. */
  const titled = (said: string) => said.charAt(0).toUpperCase() + said.slice(1);

  return function offer(b: Asking): Offer {
    const race = raceOf(b);
    const klass = classOf(b.klass);
    const bg = bgOf(b.background);
    const grants = bg?.grants;

    const languages = gather(race?.languages.known, grants?.namedLanguages);
    const tools = gather(
      klass?.tools.known.map((t) => resolveTool(t, toolNames)),
      grants?.tools.map((t) => resolveTool(t, toolNames)),
    );

    const picks: Pick[] = [];
    const langCount = (race?.languages.choose ?? 0) + (grants?.languages ?? 0);
    if (langCount > 0) {
      picks.push({
        id: "languages", label: "Languages", count: langCount,
        options: ALL_LANGUAGES.filter((l) => !languages.includes(l)),
        from: [race?.name, bg?.name].filter(Boolean).join(" and "),
      });
    }
    /* One question per source, because the pools differ. Merged into a
       single "choose 2 tools" a Criminal could spend their gaming set on a
       lute, which the background did not offer. */
    if (klass !== undefined && klass.tools.choose > 0) {
      const said = klass.tools.choiceOf ?? klass.tools.stated ?? "";
      picks.push({
        id: "tools-class", label: titled(said), count: klass.tools.choose,
        options: toolsIn(said).filter((t) => !tools.includes(t)),
        from: klass.name,
      });
    }
    for (const [i, c] of (grants?.toolChoices ?? []).entries()) {
      picks.push({
        id: `tools-background-${String(i)}`, label: titled(c.of), count: c.count,
        options: toolsIn(c.of).filter((t) => !tools.includes(t)),
        from: bg?.name ?? "Background",
      });
    }
    // A question with nothing to answer it is not a question.
    return { languages, tools, picks: picks.filter((p) => p.options.length > 0) };
  };
}

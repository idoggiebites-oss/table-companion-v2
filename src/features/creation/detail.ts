import { lineageLabel, type Ancestry } from "./lineage";
import { facetsOf } from "../../rules/5e/classes";
import type { Loaded } from "./loaded";
import type { Entry } from "../../content/schema";
import type { StepId } from "../../rules/5e/steps";

/**
 * What the detail card says about the option somebody is holding.
 *
 * Lifted out of `compendium.ts` at the module budget, and the budget found the
 * seam rather than an arbitrary line: turning a compendium into a list of
 * offers and deciding what one sentence about an option should say are
 * different jobs, and the second had been sitting inside the first because
 * that is where the data happened to be in scope.
 *
 * The card is asked for — a long press — so everything here answers one
 * question: *what is this, in a line or two?* Never what it costs, never what
 * comes next.
 */
export type Detail = { label: string; lead?: string; lines?: readonly string[] };

export function detailFor(
  step: StepId,
  ids: readonly string[],
  /** A lineage means nothing without the ancestry it belongs to. */
  build: { readonly race: string | null } | undefined,
  from: { byAncestry: Map<string, Ancestry<Entry>>; loaded: Loaded },
): Detail | undefined {
  const id = ids[0];
  if (id === undefined) return undefined;

  if (step === "ancestry" || step === "subrace") {
    const a = step === "ancestry"
      ? from.byAncestry.get(id)
      : from.byAncestry.get(build?.race ?? "");
    if (a === undefined) return undefined;
    const row = step === "subrace"
      ? a.lineages.find((l) => l.id === id) ?? a.lineages[0]
      : a.lineages[0];
    const traits = (row as { traits?: readonly string[] } | undefined)?.traits ?? [];
    const name = step === "subrace" && row !== undefined ? lineageLabel(a.name, row.name) : a.name;
    if (traits.length === 0) return undefined;
    return { label: `${name} traits`, lines: traits };
  }

  /* A skill is its own explanation. "Athletics (Str)" said twice is not a
     second thing learned. */
  if (step === "skills") return undefined;

  const row = [...from.loaded.classes, ...from.loaded.backgrounds].find((e) => e.id === id);
  if (row === undefined) return undefined;

  /*
   * The authored sentence, where there is one.
   *
   * Holding a class used to show its name and the book it came from and
   * nothing whatever about the class. The compendium publishes its
   * `describe/class` pile EMPTY — `compile-content.ts` builds each block from
   * `text` or `description` and a class row carries neither — so `Prose` had
   * nothing to render and correctly drew nothing. Meanwhile Task 22 had
   * already written the one line somebody choosing actually wants, and nothing
   * was reading it.
   *
   * Absent for a class this app ships no judgement about, which is Task 22's
   * own rule: the card then says what it always said, a name and a book,
   * rather than an invented sentence.
   */
  const said = facetsOf(id).says;
  return {
    label: row.name,
    ...(row.provenance.source === "" ? {} : { lead: row.provenance.source }),
    lines: [
      ...(said === undefined ? [] : [said]),
      ...(row.provenance.book === null ? ["Elsewhere"] : []),
    ],
  };
}

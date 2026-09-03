import type { Entry } from "../../content/schema";
import type { Option } from "../../ui/step/Choices";
import { meets, blocked } from "../../rules/5e/feats";
import { castsCantrips } from "../../rules/5e/casting";
import { BLANK, type Scores } from "../../rules/5e/abilities";
import { key } from "../../content/names";
import type { Asking } from "./facts";
import { toOption, type Loaded } from "./loaded";

/*
 * Feats, with what each asks of you.
 *
 * V2 offered every one to everybody — Grappler to a Strength 8 wizard, Elven
 * Accuracy to a dwarf. 498 of 850 state a prerequisite.
 *
 * An unrecognised one is ALLOWED with the requirement said out loud rather
 * than enforced: blocking on a guess stops somebody taking a feat they are
 * entitled to, and the table can always say no while the app saying no is the
 * end of it.
 */
export function featsFrom(loaded: Loaded, keep: <T extends Entry>(rows: readonly T[]) => T[]) {
  return function featOptions(b: Asking, scores: Scores = BLANK): readonly Option[] {
    const aspirant = {
      scores,
      casts: b.klass !== null && castsCantrips(key(b.klass)),
      race: b.subrace ?? b.race ?? "",
    };
    return keep(loaded.feats).map((f) => {
      const v = meets((f as { prerequisite?: string }).prerequisite ?? "", aspirant);
      return {
        ...toOption(f),
        ...(blocked(v) ? { blocked: v.why } : {}),
        ...("unverified" in v ? { role: v.unverified } : {}),
      };
    });
  };
}

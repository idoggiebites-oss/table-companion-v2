import { takeLevel, defaultHp } from "../progression/model";
import type { Build } from "./model";

/**
 * Build the class list by TAKING each level, one at a time, through the same
 * function the level-up screen uses.
 *
 * This is the whole of slice 5's invariant. V1 had a builder that could start
 * a character at seven and a level-up that could grow one to seven, and
 * nothing held the two answers together. Allocating levels here by assignment
 * would recreate exactly that, so it is done by repetition instead.
 */
export function allocate(b: Build, wanted: readonly { readonly id: string; readonly level: number }[]): Build {
  /* `hp` is reset with the classes it belongs to. Allocation re-takes every
     level from scratch, and `takeLevel` appends, so leaving the old rolls in
     place grows the list on every re-answer. Improvements are NOT reset: they
     are the person's own answers, not something allocation synthesises. */
  let next: Build = { ...b, classes: [], hp: [] };
  for (const w of wanted) {
    const kept = b.classes.find((c) => c.id === w.id)?.subclass;
    for (let l = 1; l <= w.level; l++) {
      next = takeLevel(next, {
        klass: w.id, classLevel: l, hp: defaultHp(w.id),
        ...(l === w.level && kept != null ? { subclass: kept } : {}),
      });
    }
  }
  return next;
}

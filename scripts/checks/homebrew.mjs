import { walk, read, lineOf } from "./util.mjs";

/* A made-up item is an Item, and nothing downstream may know otherwise.
   Task 21's acceptance criterion, and a property of the SOURCE rather than of
   any one run: a parallel "is this homebrew" path would pass every
   behavioural test while being the exact thing the feature exists to prevent.

   What this does NOT forbid is reading the "(HB)" marker. That is compendium
   PROVENANCE — `content/marks.ts`, `sourceMark`, the switch for showing other
   people's material — and a made-up item is marked so it flows through that
   same machinery deliberately: the same filters hide it and the same badge
   shows it. Forbidding it would forbid the design. This check was written that
   way first and flagged 51 lines of correct code.

   The real invariant is confinement, and it has two halves:

     1. Only the module, its form and its tests may import from `homebrew.ts`.
        Any other importer is reaching for the concept, and the only reason to
        reach for it is to tell one kind of item from another.

     2. `homebrewFrom` is called EXACTLY ONCE, where the fold is appended to a
        catalogue. A second caller is by definition asking a distinguishing
        question — "is this one of the made-up ones" — which is the branch. */

const MODULE = "src/features/sheet/homebrew.ts";

/** Where the concept is allowed to appear at all. */
const MAY_IMPORT = new Set([
  MODULE,
  "src/features/sheet/homebrew.test.ts",
  /* The form that writes them. It needs the draft type and the translation,
     and it is the one screen whose subject IS homebrew. */
  "src/features/sheet/MakeItem.tsx",
  "src/features/sheet/MakeItem.test.tsx",
  /* The single merge. It lived in `App.tsx` until the sheet's assembly was
     split out at the component budget; it moved with the assembly rather than
     multiplying, which is the thing this check exists to prevent. */
  "src/features/sheet/SheetScreen.tsx",
]);

const IMPORTS = /from\s+"[^"]*\/homebrew"/g;

export function run() {
  const failures = [];
  let callers = [];

  for (const f of walk("src", [".ts", ".tsx"])) {
    if (f === MODULE) continue;
    const src = read(f);

    for (const m of src.matchAll(IMPORTS)) {
      if (MAY_IMPORT.has(f)) continue;
      failures.push(`${f}:${lineOf(src, m.index)} imports from ${MODULE} — nothing downstream may reach for the concept, because the only reason to is to tell one kind of item from another`);
    }

    for (const m of src.matchAll(/\bhomebrewFrom\s*\(/g)) {
      if (f.endsWith(".test.ts") || f.endsWith(".test.tsx")) continue;
      callers.push(`${f}:${lineOf(src, m.index)}`);
    }
  }

  if (callers.length !== 1) {
    failures.push(
      callers.length === 0
        ? `homebrewFrom is never called — made-up items reach no catalogue, so nothing can be equipped or swung`
        : `homebrewFrom is called ${callers.length} times (${callers.join(", ")}) — it belongs in exactly one place, appended to a catalogue. A second caller is asking which items are made up, which is the branch this forbids`,
    );
  }

  return { name: "check-homebrew", failures };
}

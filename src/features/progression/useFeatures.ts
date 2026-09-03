import { useEffect, useState } from "react";
import { loadList } from "../../content/load";
import { ownFeatures, type ClassFeature } from "../../content/choicepoints";
import type { Build } from "../creation/model";

/**
 * The features this character has gained, level by level.
 *
 * Fetched per class and only for the classes they actually have — V1's note:
 * every player's device was pulling four megabytes of spellbook and class
 * tables on load, so a fighter's phone was paying for a wizard's picker. One
 * class file is about 6KB gzipped.
 *
 * Derived rather than stored, because it is a list of names out of the
 * compendium rather than a number the sheet has to be right about on its own.
 * `ownFeatures` does the filtering: a ranger's class table carries 372 feature
 * names by level 8, of which 22 belong to the character holding the sheet.
 */
export function useFeatures(build: Build): { level: number; names: readonly string[] }[] {
  const [rows, setRows] = useState<Readonly<Record<string, readonly ClassFeature[]>>>({});
  const ids = build.classes.map((c) => c.id).join(",");

  useEffect(() => {
    if (ids === "") return;
    let live = true;
    void Promise.all(
      ids.split(",").map(async (id) =>
        [id, await loadList<ClassFeature>(`/content/index/feature/${id}.json`)] as const),
    ).then((pairs) => {
      if (live) setRows(Object.fromEntries(pairs));
    });
    return () => { live = false; };
  }, [ids]);

  return build.classes.flatMap((c) => {
    const features = rows[c.id];
    if (features === undefined) return [];
    /*
     * What the character answered, from every door: the subclass on the class
     * itself, and every other question in `picks`. A feature belonging to an
     * option they did not take is not theirs.
     */
    const answered = [
      ...(c.subclass === null ? [] : [c.subclass]),
      ...Object.entries(build.picks).filter(([k]) => k.startsWith(`${c.id}:`)).map(([, v]) => v),
      build.names["subclass"] ?? "",
    ].filter((x) => x !== "");
    return ownFeatures(features, { level: c.level, answered });
  });
}

import { useEffect, useState } from "react";
import { loadList } from "../../content/load";
import type { StepId } from "../../rules/5e/steps";
import { contentUrl } from "../../content/base";

/** One passage of a record's prose: a trait, a feat, a spell. */
export type Block = { readonly name: string; readonly text: string };

/**
 * Which pile a step's options come out of. A subclass, a fighting style and a
 * Metamagic option are all class features, so they share one.
 */
export function pileFor(step: StepId): string | null {
  switch (step) {
    case "ancestry": case "subrace": return "race";
    case "background": return "background";
    case "feat": return "feat";
    case "spells": return "spell";
    case "subclass": case "style": case "picks": return "choice";
    default: return null;
  }
}

/*
 * Fetched once and kept. A person opens the same trait twice while comparing
 * two ancestries, and paying for it twice is a visible flicker on a phone.
 */
const seen = new Map<string, readonly Block[]>();

/**
 * What an option actually says, fetched when somebody asks and not before.
 *
 * The builder showed names and never what they meant — "Darkvision, Fey
 * Ancestry, Trance", with no way to find out what Trance is. The prose is in
 * the detail chunks, and a race's is 627KB gzipped, so nobody loads that to
 * read one trait. One file each instead: 1.9KB for a race at the median.
 */
export function useProse(step: StepId, id: string | null): {
  blocks: readonly Block[];
  loading: boolean;
} {
  const pile = pileFor(step);
  const key = pile === null || id === null ? null : `${pile}/${id}`;
  const [blocks, setBlocks] = useState<readonly Block[]>(() => (key === null ? [] : seen.get(key) ?? []));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (key === null) { setBlocks([]); return; }
    const had = seen.get(key);
    if (had !== undefined) { setBlocks(had); return; }
    let live = true;
    setLoading(true);
    void loadList<Block>(contentUrl(`describe/${key}.json`)).then((rows) => {
      seen.set(key, rows);
      if (live) { setBlocks(rows); setLoading(false); }
    });
    return () => { live = false; };
  }, [key]);

  return { blocks, loading };
}

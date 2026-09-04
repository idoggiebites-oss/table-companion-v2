import { useEffect, useMemo, useState } from "react";
import { bestiary, describe } from "./creatures";
import { DISCLOSURE, type Disclosure } from "./fight";
import {
  addEntry, setCount, setDisclosure, type Encounter,
} from "./encounter";
import type { CreatureEntry } from "../../content/schema";
import s from "./EncounterBuilder.module.css";

const nextDisclosure = (d: Disclosure): Disclosure =>
  DISCLOSURE[(DISCLOSURE.indexOf(d) + 1) % DISCLOSURE.length]!;

/**
 * The Creatures panel: what is in the fight.
 *
 * It does NOT draw the working. `EncounterEditor` shows that on every tab,
 * because the number is what all the other fields are being adjusted against —
 * and while this file still had its own copy the phone rendered "100 XP" twice,
 * one line under the other. Found by looking.
 *
 * Controlled — it holds no draft of its own. It began as the whole builder and
 * became one tab of `EncounterEditor` when the editor arrived, because the
 * mockup's Creatures tab does exactly what the builder did and two screens
 * that build the same thing is one too many. Splitting it out rather than
 * absorbing it kept both files inside their budgets and left the seam where it
 * already was.
 *
 * Ported from V1's `EncounterBuilder.tsx` (402 lines). What did not come
 * across: the kind/CR-band filter piles, the hand-drawn gauge with its pins
 * and ticks, HP mode (roll vs average — V1 field, never in V2's `Entry`),
 * and "Drop into initiative" (staging a DRAFT straight into combat skips the
 * naming step this task is about, and `Prep.tsx`'s saved-encounter row
 * already does it for anything once it is kept). The band and the working
 * are `rules/5e/encounter.ts`'s job now — `describeTotals` prints the same
 * "raw × multiplier = adjusted, against budget" line V1 drew as a bar.
 *
 * Search is the exact pattern `Staging.tsx` already proved: capped results,
 * the true count said out loud rather than a silent truncation. Written
 * again here rather than extracted, because the two screens differ in what a
 * result DOES on tap — stages a combatant there, adds to a draft group here —
 * and factoring that out is more machinery than the ~10 shared lines save.
 */
export function EncounterBuilder({ draft, onChange, fetcher }: {
  readonly draft: Encounter;
  onChange: (next: Encounter) => void;
  /**
   * How to reach the compendium. Injected so a component test can open this
   * without touching the network — the same door `bestiary`, `statblock` and
   * `pushKey` already leave open, and the reason this screen is testable at a
   * tier whose own config says "no server, no navigation".
   */
  fetcher?: typeof fetch;
}) {
  const [all, setAll] = useState<readonly CreatureEntry[] | null>(null);
  const [q, setQ] = useState("");
  const setDraft = (f: (d: Encounter) => Encounter) => { onChange(f(draft)); };

  /* Pulled when the builder opens, same policy as the bestiary on the fight
     screen: 6,633 rows are not worth fetching for a DM who never opens this. */
  useEffect(() => {
    if (all !== null) return;
    let live = true;
    void bestiary(fetcher).then((rows) => { if (live) setAll(rows); });
    return () => { live = false; };
  }, [all]);

  const want = q.trim().toLowerCase();
  const matches = useMemo(
    () => (all === null || want === "" ? [] : all.filter((c) => c.name.toLowerCase().includes(want))),
    [all, want],
  );
  const found = matches.slice(0, 40);


  return (
      <div className={s.draft} data-testid="builder">
        {all === null && <p className={s.loading}>Loading the bestiary…</p>}

        {all !== null && (
          <>
            <label className={s.field}>
              <span className={s.tag}>Search to add</span>
              <input
                className={s.text} value={q} data-testid="builder-search"
                placeholder="goblin, ogre, wolf…"
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {want !== "" && matches.length > found.length && (
              <p className={s.more}>
                {matches.length} match. Showing the first {found.length} — keep typing.
              </p>
            )}
            {found.length > 0 && (
              <div className={s.picks} data-testid="builder-results">
                {found.map((c) => (
                  <button
                    key={c.id} type="button" className={s.pick} data-testid="builder-hit"
                    onClick={() => {
                      setDraft((d) => addEntry(d, {
                        statblock: c.id, name: c.name, count: 1,
                        max: c.hp, ac: c.ac, cr: c.cr, disclosure: "hidden",
                      }));
                      setQ("");
                    }}
                  >
                    <span className={s.nm}>{c.name}</span>
                    <span className={s.faint}>{describe(c)}</span>
                  </button>
                ))}
              </div>
            )}

            {draft.entries.length > 0 && (
              <>
                <ul className={s.entries} data-testid="builder-entries">
                  {draft.entries.map((x) => (
                    <li className={s.entry} key={x.statblock} data-testid="builder-entry">
                      <span className={s.nm}>{x.name}</span>
                      <span className={s.step}>
                        <button
                          type="button" aria-label={`One fewer ${x.name}`}
                          onClick={() => setDraft((d) => setCount(d, x.statblock, x.count - 1))}
                        >
                          −
                        </button>
                        <span className={s.count}>{x.count}</span>
                        <button
                          type="button" aria-label={`One more ${x.name}`}
                          onClick={() => setDraft((d) => setCount(d, x.statblock, x.count + 1))}
                        >
                          +
                        </button>
                      </span>
                      <button
                        type="button" className={s.chip} aria-label={`${x.name} disclosure`}
                        onClick={() => setDraft((d) => setDisclosure(d, x.statblock, nextDisclosure(x.disclosure)))}
                      >
                        {x.disclosure}
                      </button>
                    </li>
                  ))}
                </ul>

                </>
            )}
          </>
        )}
      </div>
  );
}

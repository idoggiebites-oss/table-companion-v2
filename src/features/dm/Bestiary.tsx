import { useEffect, useMemo, useState } from "react";
import { DmShell } from "./DmShell";
import { bestiary, describe, statblock, CREATURE_KINDS, creatureKind, type CreatureKind, type Statblock } from "./creatures";
import { StatblockView } from "./StatblockView";
import type { CreatureEntry } from "../../content/schema";
import type { Fetcher } from "../../content/load";
import type { ReactNode } from "react";
import s from "./Bestiary.module.css";

/** How many rows a DM is shown before being asked to narrow — see `Staging.tsx`'s own cap. */
const CAP = 60;

/**
 * The bestiary, browsable rather than only searchable-while-staging.
 *
 * V1's `Reference.tsx`, ported: *"a player who can look up the statblock knows
 * the armour class and the hit points, which is exactly what the disclosure
 * ladder exists to withhold."* Same argument `Combatant.tsx`'s per-creature
 * `Book` makes for a staged row — this is that argument's OWN screen, for the
 * 6,633 creatures that are not staged into anything yet. `tabs.ts` puts it
 * behind the DM's seat for the same reason.
 *
 * The index loads on first open, not with the app: 141KB gzipped for a search
 * that most sessions never run. `statblock()` loads per row, per open — one at
 * a time is 1KB at the median, and all 6,633 open at once would be 2.3MB.
 *
 * Two of V1's three filters are ported — the CR ceiling and the kind, the pair
 * this task names. V1's fourth control, a CR-band filter (fodder/standard/
 * deadly/legendary), is dropped: it answers the same "is this a fair fight"
 * question the ceiling does, in a different shape, and a second control for
 * one question is not a decision — it is a duplicate.
 */
export function Bestiary({ nav, fetcher }: { nav?: ReactNode; fetcher?: Fetcher }) {
  const [all, setAll] = useState<readonly CreatureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [maxCr, setMaxCr] = useState<number | "">("");
  const [kind, setKind] = useState<CreatureKind | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  /* 141KB gzipped, pulled when this screen opens and not on the way to it —
     the same policy `Staging.tsx` follows for the same index. */
  useEffect(() => {
    let live = true;
    void bestiary(fetcher).then((rows) => { if (live) { setAll(rows); setLoading(false); } });
    return () => { live = false; };
  }, [fetcher]);

  /* Which pile a creature is in, before anybody reads it — computed once over
     the whole catalogue so the buttons can say how many are behind each. */
  const counts = useMemo(() => {
    const m = new Map<CreatureKind, number>();
    for (const c of all) {
      const k = creatureKind(c.type);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [all]);

  const matches = useMemo(() => {
    const want = q.trim().toLowerCase();
    return all
      /* Name AND type, which is V1's search and the reason its placeholder
         reads "goblin, dragon, undead…" — two of those three are types. A
         name-only filter turns a typed "undead" into no results on a list
         that holds four hundred of them. */
      .filter((c) => want === "" || c.name.toLowerCase().includes(want)
                  || c.type.toLowerCase().includes(want))
      .filter((c) => maxCr === "" || c.cr <= maxCr)
      .filter((c) => kind === null || creatureKind(c.type) === kind);
  }, [all, q, maxCr, kind]);

  const shown = matches.slice(0, CAP);

  return (
    <DmShell title="The bestiary" below={nav}>
      <div className={s.controls}>
        <input
          className={s.search}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loading ? "Loading the bestiary…" : "goblin, dragon, undead…"}
          aria-label="Search the bestiary"
          data-testid="book-search"
        />
        <input
          className={s.crInput}
          type="number" min={0} step={1}
          value={maxCr}
          onChange={(e) => setMaxCr(e.target.value === "" ? "" : Math.max(0, +e.target.value))}
          placeholder="max CR"
          aria-label="Maximum challenge rating"
          data-testid="book-max-cr"
        />
      </div>

      {counts.size > 0 && (
        <div className={s.kinds} role="group" aria-label="Only this kind">
          {CREATURE_KINDS.filter((k) => (counts.get(k) ?? 0) > 0).map((k) => (
            <button
              key={k} type="button" className={s.kind}
              aria-pressed={kind === k} aria-label={`Only ${k}`}
              data-testid="book-kind"
              onClick={() => setKind(kind === k ? null : k)}
            >
              {k} <span className={s.n}>{counts.get(k)}</span>
            </button>
          ))}
        </div>
      )}

      {matches.length > shown.length && (
        <p className={s.more} data-testid="book-more">
          {matches.length} match. Showing the first {shown.length} — search or
          filter to narrow.
        </p>
      )}

      <div className={s.results} data-testid="book-results">
        {shown.map((c) => (
          <Row key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)}
               {...(fetcher === undefined ? {} : { fetcher })} />
        ))}
      </div>
    </DmShell>
  );
}

function Row({ c, open, onToggle, fetcher }: {
  c: CreatureEntry; open: boolean; onToggle: () => void; fetcher?: Fetcher;
}) {
  const [block, setBlock] = useState<Statblock | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!open || block !== null || missing) return;
    let live = true;
    void statblock(c.id, fetcher).then((b) => {
      if (!live) return;
      if (b === null) setMissing(true); else setBlock(b);
    });
    return () => { live = false; };
  }, [open, c.id, block, missing, fetcher]);

  return (
    <div className={s.entry} data-testid="book-row">
      <button type="button" className={s.row} aria-expanded={open} onClick={onToggle}>
        <span className={s.name}>{c.name}</span>
        <span className={s.note}>{describe(c)}</span>
        {(c.legendary > 0 || c.lair) && (
          <span className={s.marks}>
            {c.legendary > 0 && <span className={s.mark}>{c.legendary} legendary</span>}
            {c.lair && <span className={s.mark}>lair</span>}
          </span>
        )}
      </button>
      {/* No `head`: the row directly above already prints `describe()`, and
          passing it again would put "CR 14 · Huge dragon · AC 19 · 195 hp" on
          two consecutive lines. The alignment `StatblockView` prints on its
          own is the half the index row does not carry. */}
      {open && block !== null && <StatblockView block={block} />}
      {/* An SRD-only build ships no detail files at all, so this is a normal
          state rather than an error — see `Combatant.tsx`'s `Book`. */}
      {open && missing && (
        <p className={s.none} data-testid="book-missing">
          No statblock for {c.name} in this build.
        </p>
      )}
    </div>
  );
}

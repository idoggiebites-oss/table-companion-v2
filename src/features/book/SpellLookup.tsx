import { useEffect, useMemo, useState } from "react";
import { spellIndex, spellDetails, describe, levelLabel, type SpellDetail } from "./spellbook";
import type { SpellEntry } from "../../content/schema";
import type { Fetcher } from "../../content/load";
import s from "./SpellLookup.module.css";

/** Same cap as `Bestiary.tsx`, for the same reason: `Staging.tsx`'s own list caps too. */
const CAP = 60;
const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * The spell lookup — Task 48, and V1's `SpellLookup.tsx` ported almost whole:
 * closed until asked for, a search box, chips with counts, a cap with a
 * "showing the first N" line, and a row that opens to read the WHOLE entry
 * rather than a summary of it. V1's own words on that last point stand
 * unchanged: *"Whole, not truncated: the DM is here to rule on it, and the
 * sentence that matters is usually the last one."* — true of a player reading
 * their own spell too, which is why this screen reaches both seats now.
 *
 * Not ported: V1's `SpellRole` classifier, four regexes over the prose that
 * tag a spell "damage / healing / control / utility" so a beginner can filter
 * by what a spell is FOR. It is a real idea, but it is a second, bespoke
 * domain concept this task's three criteria never ask for, and V2 already has
 * a proven filter shape for exactly this screen: `Bestiary.tsx`'s pair of a
 * text search plus one categorical chip set with counts. Level fills the chip
 * role here — ten discrete values, the same shape as Bestiary's kind — so
 * reusing it beats inventing a second filter concept for a lookup tool this
 * task scopes at search-and-read. A "what is this FOR" filter is exactly
 * V1's classifier, ready to port whole on its own task if it is wanted.
 *
 * Also not ported: V1's `HomebrewToggle` / `isCore`. Neither this screen nor
 * `Bestiary.tsx` filters by provenance — V2's merge already folds imported
 * rows into one list at build time (`content/load.ts`'s `loadKind`) rather
 * than asking a screen to separate them back out, and adding a second "which
 * source" axis to a screen that does not have one yet is a new UI concept
 * this task does not ask for.
 */
export function SpellLookup({ fetcher }: { fetcher?: Fetcher }) {
  const [all, setAll] = useState<readonly SpellEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  /* 3,443 rows, 1.2MB raw — pulled when this screen opens and not before, the
     same policy `Bestiary.tsx`'s index follows. */
  useEffect(() => {
    let live = true;
    void spellIndex(fetcher).then((rows) => { if (live) { setAll(rows); setLoading(false); } });
    return () => { live = false; };
  }, [fetcher]);

  /*
   * The 3.9MB prose chunk — fetched once, on the FIRST spell opened, and held
   * here for the rest of the visit. `spellbook.ts`'s header explains why this
   * cannot be per-row the way `Bestiary.tsx`'s `statblock()` is: there is one
   * list, not 3,443 files, so the first spell opened pays for the whole thing
   * regardless of which spell it was, and every spell after that is a lookup
   * in an array already in memory. `details` lives in STATE rather than a
   * module-level cache so a test's injected fetcher never bleeds into another
   * test's — the same reason `Bestiary`'s per-row state is local to its `Row`.
   */
  const [details, setDetails] = useState<readonly SpellDetail[] | null>(null);
  useEffect(() => {
    if (open === null || details !== null) return;
    void spellDetails(fetcher).then(setDetails);
  }, [open, details, fetcher]);

  /* Hidden by default rather than discarded — `content/spells.ts`'s
     `isClassFeature` names exactly this policy: "they are real things
     somebody tracks, just not from a spell list." A DM or player who
     actually wants "Invocation: Agonizing Blast" asks for it with one tap;
     nobody else pays for 1,539 of them sitting in a spell search. */
  const allowed = useMemo(
    () => (showFeatures ? all : all.filter((sp) => !sp.isFeature)),
    [all, showFeatures],
  );

  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const sp of allowed) m.set(sp.level, (m.get(sp.level) ?? 0) + 1);
    return m;
  }, [allowed]);

  const matches = useMemo(() => {
    const want = q.trim().toLowerCase();
    return allowed
      /* Name AND class, mirroring `Bestiary.tsx`'s name-and-type search —
         "wizard" should find what a wizard can cast, not only a spell named
         after one. */
      .filter((sp) => want === "" || sp.name.toLowerCase().includes(want)
                    || sp.classes.some((c) => c.toLowerCase().includes(want)))
      .filter((sp) => level === null || sp.level === level);
  }, [allowed, q, level]);

  const shown = matches.slice(0, CAP);
  const hiddenFeatures = all.length - all.filter((sp) => !sp.isFeature).length;

  return (
    <>
      <div className={s.controls}>
        <input
          className={s.search}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loading ? "Loading the spells…" : "hold person, fireball, wizard…"}
          aria-label="Search spells"
          data-testid="spell-search"
        />
        {hiddenFeatures > 0 && (
          <button
            type="button" className={s.toggle}
            aria-pressed={showFeatures}
            onClick={() => setShowFeatures((v) => !v)}
            data-testid="spell-features-toggle"
          >
            {showFeatures ? "Hide" : "Show"} {hiddenFeatures} class features
          </button>
        )}
      </div>

      {/* Hidden while a search is running.
          Ten chips wrap to five rows on a 390px screen — most of the viewport
          — so a DM who typed "hold person" got one result below the fold and
          a wall of filters above it. The chips are for BROWSING; the moment
          somebody types, they have already said what they want. `Bestiary`
          has fourteen chips in three rows and the same problem in milder
          form; it follows this if a session says so. */}
      {counts.size > 0 && q.trim() === "" && (
        <div className={s.levels} role="group" aria-label="Only this level">
          {LEVELS.filter((lv) => (counts.get(lv) ?? 0) > 0).map((lv) => (
            <button
              key={lv} type="button" className={s.level}
              aria-pressed={level === lv} aria-label={`Only ${levelLabel(lv)}`}
              data-testid="spell-level"
              onClick={() => setLevel(level === lv ? null : lv)}
            >
              {levelLabel(lv)} <span className={s.n}>{counts.get(lv)}</span>
            </button>
          ))}
        </div>
      )}

      {matches.length > shown.length && (
        <p className={s.more} data-testid="spell-more">
          {matches.length} match. Showing the first {shown.length} — search or
          filter to narrow.
        </p>
      )}

      <div className={s.results} data-testid="spell-results">
        {shown.map((sp) => (
          <Row
            key={sp.id} sp={sp} open={open === sp.id}
            onToggle={() => setOpen(open === sp.id ? null : sp.id)}
            detail={details?.find((d) => d.id === sp.id) ?? null}
            stillLoading={open === sp.id && details === null}
          />
        ))}
        {shown.length === 0 && !loading && (
          <p className={s.none} data-testid="spell-empty">Nothing matches.</p>
        )}
      </div>
    </>
  );
}

function Row({ sp, open, onToggle, detail, stillLoading }: {
  sp: SpellEntry; open: boolean; onToggle: () => void;
  detail: SpellDetail | null; stillLoading: boolean;
}) {
  return (
    <div className={s.entry} data-testid="spell-row">
      <button type="button" className={s.row} aria-expanded={open} onClick={onToggle}>
        <span className={s.name}>{sp.name}</span>
        <span className={s.note}>{describe(sp)}</span>
      </button>
      {open && detail !== null && (
        <div className={s.moreInfo} data-testid="spell-detail">
          <p className={s.what}>
            {/* The concentration flag is NOT printed beside the duration.
                The corpus writes the duration as "Concentration, up to 1
                minute", so the two together read "…up to 1 minute ·
                concentration" — the app saying the same word twice in one
                line. Only worth showing when the duration has not said it. */}
            {[detail.time, detail.range, detail.duration,
              detail.concentration && !/concentration/i.test(detail.duration)
                ? "concentration" : "",
              detail.ritual ? "ritual" : ""].filter(Boolean).join(" · ")}
          </p>
          {/* Whole, not truncated — V1's own reasoning, unchanged: the
              person reading this is here to RULE on it or CAST it, and the
              sentence that matters is usually the last one. */}
          <p className={s.text}>{detail.text}</p>
        </div>
      )}
      {open && stillLoading && <p className={s.note} data-testid="spell-loading">Loading…</p>}
      {/* Not an error: the 3.9MB list loaded and this id was not in it, the
          same normal-not-broken state `Bestiary.tsx`'s missing statblock is. */}
      {open && !stillLoading && detail === null && (
        <p className={s.none} data-testid="spell-missing">
          No text for {sp.name} in this build.
        </p>
      )}
    </div>
  );
}

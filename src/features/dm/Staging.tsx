import { useEffect, useMemo, useState } from "react";
import { Shell } from "../../ui/Shell";
import { Button, ButtonRow } from "../../ui/Button";
import { bestiary, describe, crName } from "./creatures";
import { DISCLOSURE, type Act, type Combatant, type Fight } from "./fight";
import type { CreatureEntry } from "../../content/schema";
import type { ReactNode } from "react";
import s from "./Staging.module.css";

/**
 * Putting a fight together before it runs.
 *
 * DM.md principle 3: staging is preparation, not narration. Nothing here
 * reaches a player's screen until the DM says so — a creature is staged
 * `hidden` and the ladder is slid up per creature as the fight develops.
 *
 * Tablet-first: the bestiary and the table sit side by side where there is
 * room, and stack on a phone. The DM side has to work on both.
 */
export function Staging({ fight, nav, onAct }: {
  fight: Fight;
  nav?: ReactNode;
  onAct: (a: Act) => void;
}) {
  const [all, setAll] = useState<readonly CreatureEntry[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  /* 142KB gzipped, pulled when this screen opens and not on the way to it. */
  useEffect(() => {
    let live = true;
    void bestiary().then((rows) => { if (live) { setAll(rows); setLoading(false); } });
    return () => { live = false; };
  }, []);

  const found = useMemo(() => {
    const want = q.trim().toLowerCase();
    if (want === "") return [];
    /* Capped, because 6,633 rows will happily match "a" and a list that long
       is not a list anybody reads. Say so rather than truncating silently. */
    const hits = all.filter((c) => c.name.toLowerCase().includes(want));
    return hits.slice(0, 40);
  }, [all, q]);

  const total = q.trim() === "" ? 0 : all.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).length;

  return (
    <Shell
      title="The fight"
      below={nav}
      actions={fight.combatants.length === 0 ? undefined : (
        <ButtonRow>
          <Button onClick={() => onAct({ act: "clear" })}>Clear the table</Button>
        </ButtonRow>
      )}
    >
      <div className={s.split}>
        <section className={s.pane} aria-label="The bestiary">
          <input
            className={s.search}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={loading ? "Loading the bestiary…" : "Search 6,633 creatures"}
            aria-label="Search the bestiary"
            data-testid="bestiary-search"
          />
          {q.trim() !== "" && total > found.length && (
            <p className={s.more} data-testid="more">
              {total} match. Showing the first {found.length} — keep typing.
            </p>
          )}
          <div className={s.results} data-testid="bestiary">
            {found.map((c) => (
              <button key={c.id} type="button" className={s.hit} data-testid="bestiary-row"
                      onClick={() => onAct({
                        act: "stage",
                        id: `${c.id}-${String(Date.now())}-${String(Math.random()).slice(2, 6)}`,
                        name: c.name,
                        source: { kind: "creature", statblock: c.id, max: c.hp, ac: c.ac },
                      })}>
                <span className={s.hitName}>{c.name}</span>
                <span className={s.hitNote}>{describe(c)}</span>
                {(c.legendary > 0 || c.lair) && (
                  <span className={s.marks}>
                    {/* The two facts that change how a DM runs a creature, said
                        before it is staged rather than discovered mid-fight. */}
                    {c.legendary > 0 && <span className={s.mark}>{c.legendary} legendary</span>}
                    {c.lair && <span className={s.mark}>lair</span>}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className={s.pane} aria-label="On the table">
          <h2 className={s.heading}>
            On the table
            <span className={s.count}>{fight.combatants.length}</span>
          </h2>
          {fight.combatants.length === 0 ? (
            <p className={s.empty} data-testid="table-empty">
              Nothing yet. Search for a creature to put one here — staged is
              hidden, so nobody sees it until you say.
            </p>
          ) : (
            <ul className={s.staged} data-testid="staged">
              {fight.combatants.map((c) => <Staged key={c.id} c={c} onAct={onAct} />)}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}

/** How much of this one the table can see, and a way off the table. */
function Staged({ c, onAct }: { c: Combatant; onAct: (a: Act) => void }) {
  return (
    <li className={s.row} data-testid="staged-row">
      <span className={s.rowHead}>
        <span className={s.rowName}>{c.name}</span>
        {c.source.kind === "creature" && (
          <span className={s.rowNote}>AC {c.source.ac} · {c.source.max} hp</span>
        )}
      </span>
      {/*
        * A ladder drawn as a ladder. The DM slides it up as the fight
        * develops, and the order is the information — a dropdown would hide
        * which way is "more".
        */}
      <span className={s.ladder} role="radiogroup" aria-label={`What the table sees of ${c.name}`}>
        {DISCLOSURE.map((step) => (
          <button key={step} type="button" role="radio" aria-checked={c.disclosure === step}
                  className={`${s.step} ${c.disclosure === step ? s.at : ""}`}
                  data-testid={`step-${step}`}
                  onClick={() => onAct({ act: "disclose", id: c.id, to: step })}>
            {step}
          </button>
        ))}
      </span>
      <button type="button" className={s.off} aria-label={`Take ${c.name} off the table`}
              onClick={() => onAct({ act: "unstage", id: c.id })}>×</button>
    </li>
  );
}

export { crName };

import { useEffect, useMemo, useState } from "react";
import { Shell } from "../../ui/Shell";
import { Button, ButtonRow } from "../../ui/Button";
import { bestiary, describe, crName } from "./creatures";
import { DISCLOSURE, orderOf, awaiting, activeOf, type Act, type Combatant, type Fight } from "./fight";
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

  /* The order is derived, never stored — see `orderOf`. Before anyone has
     rolled it is simply the staged order, which is what it should be. */
  const order = orderOf(fight);
  const waiting = awaiting(fight);
  const rolled = fight.combatants.length - waiting.length;
  const active = activeOf(fight);

  return (
    <Shell
      title="The fight"
      below={nav}
      actions={fight.combatants.length === 0 ? undefined : (
        <ButtonRow>
          {fight.phase === "active" ? (
            <Button onClick={() => onAct({ act: "advance", from: fight.turn })}>
              {/* Says whose go it becomes, not just "next" — the DM is looking
                  at the table, not the screen, when they press it. */}
              Next: {orderOf(fight)[(fight.turn + 1) % fight.combatants.length]?.name ?? "—"}
            </Button>
          ) : (
            <Button disabled={rolled === 0} onClick={() => onAct({ act: "begin" })}>
              {waiting.length === 0 ? "Begin" : `Begin without ${String(waiting.length)}`}
            </Button>
          )}
          <Button onClick={() => onAct({ act: "clear" })}>Clear the table</Button>
        </ButtonRow>
      )}
    >
      <div className={`${s.split} ${fight.phase === "active" ? s.running : ""}`}>
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

        <section className={`${s.pane} ${s.roster}`} aria-label="On the table">
          <h2 className={s.heading}>
            {fight.phase === "active" ? `Round ${String(fight.round)}` : "On the table"}
            {/* A bare count beside "Round 1" reads as "Round 1 2". It belongs
                to the roster, so it is shown while there is a roster. */}
            {fight.phase !== "active" && <span className={s.count}>{fight.combatants.length}</span>}
          </h2>
          {fight.phase === "rolling" && waiting.length > 0 && (
            /* Who the table is waiting on is the whole reason there is a phase
               between staging and running. Name them. */
            <p className={s.waiting} data-testid="waiting">
              Waiting on {waiting.map((c) => c.name).join(", ")}
            </p>
          )}
          {fight.combatants.length === 0 ? (
            <p className={s.empty} data-testid="table-empty">
              Nothing yet. Search for a creature to put one here — staged is
              hidden, so nobody sees it until you say.
            </p>
          ) : (
            <ul className={s.staged} data-testid="staged">
              {order.map((c) => (
                <Staged key={c.id} c={c} onAct={onAct} now={active?.id === c.id} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}

/** How much of this one the table can see, and a way off the table. */
function Staged({ c, onAct, now }: {
  c: Combatant; onAct: (a: Act) => void; now: boolean;
}) {
  return (
    <li className={`${s.row} ${now ? s.now : ""}`} data-testid="staged-row"
        aria-current={now ? "true" : undefined}>
      <span className={s.rowHead}>
        <span className={s.rowName}>{c.name}</span>
        {/*
          * Null until rolled, and shown as blank rather than 0 — "has not
          * rolled" and "rolled badly" are different facts, and a 0 in the box
          * would assert the second.
          */}
        <input
          className={s.init}
          type="number"
          inputMode="numeric"
          value={c.initiative ?? ""}
          placeholder="—"
          aria-label={`Initiative for ${c.name}`}
          data-testid="initiative"
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === "") return;
            onAct({ act: "roll", id: c.id, value: Number(v) });
          }}
        />
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

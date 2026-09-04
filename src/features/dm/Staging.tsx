import { useEffect, useMemo, useState } from "react";
import { Shell } from "../../ui/Shell";
import { Button, ButtonRow } from "../../ui/Button";
import { bestiary, describe, crName } from "./creatures";
import { orderOf, awaiting, activeOf, type Act, type Fight } from "./fight";
import { describeVerdict, verdictFor, acOf } from "./claim";
import { Staged } from "./Combatant";
import { RoomPicker } from "./RoomPicker";
import { describeRoom, isOpenGround } from "../../rules/5e/terrain";
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
export function Staging({ fight, party = [], note, place, nav, onAct }: {
  fight: Fight;
  /** The table's own characters, so they can be put in the order too. */
  party?: readonly { id: string; name: string }[];
  /**
   * What the DM meant to say when the door opened, if a place was opened.
   *
   * Here rather than on the prep screen because opening a place moves the DM
   * to this tab — a note rendered back there would vanish at the exact moment
   * it is meant to be read.
   */
  note?: string;
  place?: string;
  nav?: ReactNode;
  onAct: (a: Act) => void;
}) {
  const [roomOpen, setRoomOpen] = useState(false);
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
      {note !== undefined && (
        /* The line to read when the door opens. Reads as prose because it is
           prose — it is going to be said out loud, not scanned. */
        <p className={s.note} data-testid="scene-note">
          {place !== undefined && <span className={s.place}>{place}</span>}
          {note}
        </p>
      )}

      <div className={s.room}>
        <button
          type="button" className={s.roomHead} aria-expanded={roomOpen}
          aria-label="The room" onClick={() => setRoomOpen((v) => !v)}
        >
          <span className={s.roomTag}>The room</span>
          {/* What the table can see. Public, unlike everything else on this
              screen — the players know it is dark. */}
          <span className={s.roomSaid}>
            {isOpenGround(fight.room) ? "open ground" : describeRoom(fight.room)}
          </span>
          <span className={s.roomMark}>{roomOpen ? "−" : "+"}</span>
        </button>
        {roomOpen && (
          <RoomPicker room={fight.room} onChange={(r) => onAct({ act: "room", room: r })} />
        )}
      </div>

      <div className={`${s.split} ${fight.phase === "active" ? s.running : ""}`}>
        <section className={s.pane} aria-label="The bestiary">
          {party.length > 0 && (
            /*
             * The party goes in the order too, or a fight is monsters taking
             * turns at each other. A character's hit points are NOT copied in
             * — they stay on their own sheet, which is V1's `Source` union and
             * the reason the party screen and the fight cannot disagree.
             */
            <div className={s.party} data-testid="party-to-stage">
              {party.filter((m) => !fight.combatants.some((c) => c.id === m.id)).map((m) => (
                <button key={m.id} type="button" className={s.join}
                        aria-label={`Put ${m.name} in the fight`}
                        onClick={() => onAct({
                          act: "stage", id: m.id, name: m.name,
                          source: { kind: "character", character: m.id },
                          /* A character is never hidden from the table: the
                             ladder is for what the DM is running. */
                          disclosure: "exact",
                        })}>{m.name}</button>
              ))}
            </div>
          )}
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
                        source: { kind: "creature", statblock: c.id, max: c.hp, ac: c.ac, cr: c.cr },
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
          {fight.claims.length > 0 && (
            /*
             * Unanswered swings, oldest first — a queue is answered in the
             * order it arrived. The line SUGGESTS and never decides: "18
             * against 15 — hits" is one tap to confirm and still one tap to
             * overrule, because a shield spell or a cover rule this app has
             * never heard of is still true at the table.
             */
            <ul className={s.claims} data-testid="claims">
              {fight.claims.map((k) => {
                const ac = acOf(fight, k.targetId);
                const target = fight.combatants.find((c) => c.id === k.targetId);
                return (
                  <li key={k.id} className={s.claim} data-testid="claim">
                    <span className={s.claimWho}>
                      {k.whoName} · {k.weapon} → {target?.name ?? "gone"}
                    </span>
                    <span className={s.claimLine} data-testid="verdict">
                      {describeVerdict(k.toHit, ac)} · {k.damage} {k.damageType}
                    </span>
                    <span className={s.claimRow}>
                      <button type="button" className={s.lands}
                              aria-label={`${k.weapon} from ${k.whoName} lands`}
                              onClick={() => onAct({ act: "verdict", claim: k.id, lands: true })}>
                        {verdictFor(k.toHit, ac) === "misses" ? "Lands anyway" : "Lands"}
                      </button>
                      <button type="button" className={s.missed}
                              aria-label={`${k.weapon} from ${k.whoName} misses`}
                              onClick={() => onAct({ act: "verdict", claim: k.id, lands: false })}>
                        {verdictFor(k.toHit, ac) === "hits" ? "Misses anyway" : "Misses"}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
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

export { crName };

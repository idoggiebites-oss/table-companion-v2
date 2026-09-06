import { useEffect, useState } from "react";
import { Icon } from "../../ui/Icon";
import { spellIndex } from "../book/spellbook";
import type { Fetcher } from "../../content/load";
import { slotsOf, pactOf, scoresOf } from "../creation/scores";
import { prepares, preparedCount } from "../../rules/5e/casting";
import { modifier, signed } from "../../rules/5e/abilities";

import { primary, type Build } from "../creation/model";
import type { Vitals, Vital } from "./model";
import type { SpellEntry } from "../../content/schema";
import s from "./Spells.module.css";

/**
 * What this character can cast, and what is left to cast it with.
 *
 * The largest hole in the player experience, and the quietest: spells run all
 * the way through creation — `casting.ts` knows how many a bard knows, what a
 * wizard writes in a book, how many a cleric prepares — and then stopped. The
 * sheet had three tabs and none of them was this one, so a wizard could be
 * BUILT with spells and could not prepare, cast, or spend a slot.
 *
 * **Slots are pips, and a pip is a tap.** The number is small, it changes
 * constantly, and a player mid-turn wants to spend one rather than read about
 * one. Spent reads as spent rather than as absent, for the same reason the
 * turn economy does: a pip that vanished leaves somebody counting what used to
 * be there.
 *
 * **The pact sits apart.** A warlock's slots are not the same pool and do not
 * come back at the same time — they return on a SHORT rest, which is V1's own
 * third finding about resources and the thing that makes a warlock a warlock.
 */
export function Spells({ build, vitals, onAct, fetcher }: {
  build: Build;
  vitals: Vitals;
  onAct: (v: Vital) => void;
  fetcher?: Fetcher;
}) {
  /*
   * The index pulled here rather than threaded down from `App`.
   *
   * This tab only mounts when somebody who casts opens it, which is the same
   * policy the bestiary and the spell lookup follow — 1.2MB is not worth
   * carrying on every screen for the names of the eight spells a bard knows.
   * Until it arrives the slots are already usable; only the list waits.
   */
  const [rows, setRows] = useState<readonly SpellEntry[]>([]);
  useEffect(() => {
    let live = true;
    void spellIndex(fetcher).then((all) => { if (live) setRows(all); });
    return () => { live = false; };
  }, [fetcher]);

  const ids = new Set(build.spells);
  const spells = rows.filter((sp) => ids.has(sp.id));
  const max = slotsOf(build);
  const pact = pactOf(build);
  const klass = primary(build);
  const ability = modifier(scoresOf(build)[castingAbility(klass)]);

  if (max.length === 0 && pact === null) {
    return <p className={s.none} data-testid="no-spells">This character casts nothing.</p>;
  }

  return (
    <section className={s.wrap} data-testid="spells">
      <div className={s.slots}>
        {max.map((count, i) => {
          const level = i + 1;
          const gone = vitals.slots[level] ?? 0;
          return (
            <div key={level} className={s.row}>
              <span className={s.level}>{level}</span>
              <span className={s.pips} role="group" aria-label={`Level ${String(level)} slots`}>
                {Array.from({ length: count }, (_, k) => {
                  const spent = k < gone;
                  return (
                    <button key={k} type="button" data-testid={`slot-${String(level)}`}
                            className={spent ? `${s.pip} ${s.spent}` : s.pip}
                            aria-pressed={spent}
                            aria-label={`Level ${String(level)} slot ${String(k + 1)}, ${spent ? "spent" : "in hand"}`}
                            onClick={() => { if (!spent) onAct({ act: "cast", level }); }} />
                  );
                })}
              </span>
              <span className={s.left}>{Math.max(0, count - gone)} left</span>
            </div>
          );
        })}

        {pact !== null && (
          /* Its own row, and it says why it is one: these come back sooner. */
          <div className={`${s.row} ${s.pactRow}`}>
            <span className={s.level}>{pact.level}</span>
            <span className={s.pips} role="group" aria-label="Pact slots">
              {Array.from({ length: pact.count }, (_, k) => {
                const spent = k < vitals.pact;
                return (
                  <button key={k} type="button" data-testid="slot-pact"
                          className={spent ? `${s.pip} ${s.spent}` : s.pip}
                          aria-pressed={spent}
                          aria-label={`Pact slot ${String(k + 1)}, ${spent ? "spent" : "in hand"}`}
                          onClick={() => { if (!spent) onAct({ act: "cast", level: pact.level, pact: true }); }} />
                );
              })}
            </span>
            <span className={s.left}>pact · back on a short rest</span>
          </div>
        )}
      </div>

      <p className={s.save}>
        Spell save DC <b>{8 + ability + profOf(build)}</b> · to hit{" "}
        <b>{signed(ability + profOf(build))}</b>
      </p>

      {/*
        * What they hold, and what the app cannot yet do about it.
        *
        * A bard or sorcerer KNOWS a list and it is on the build. A wizard has a
        * spellbook, which is also on the build. A cleric, druid or paladin
        * prepares from the entire class list every day and chooses nothing at
        * creation — `casting.ts` says so — so their list here is genuinely
        * empty, and saying that is better than drawing a box that never fills.
        */}
      {spells.length > 0 ? (
        <ul className={s.list} data-testid="spell-list">
          {[...spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)).map((sp) => (
            <li key={sp.id} className={s.spell}>
              <span className={s.mark} aria-hidden="true"><Icon name="spark" size={16} /></span>
              <span className={s.spellName}>{sp.name}</span>
              <span className={s.spellAt}>
                {sp.level === 0 ? "cantrip" : `level ${String(sp.level)}`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.none} data-testid="spells-empty">
          {prepares(klass ?? "")
            ? `Prepared from the whole ${klass ?? "class"} list each day — ${String(
                Math.max(1, preparedCount(ability, build.level)),
              )} of them. Look them up under Book.`
            : "Nothing written down yet. Look spells up under Book."}
        </p>
      )}
    </section>
  );
}

/** Which ability a class casts with. */
function castingAbility(klass: string | null): "int" | "wis" | "cha" {
  if (klass === "wizard" || klass === "artificer") return "int";
  if (klass === "cleric" || klass === "druid" || klass === "ranger") return "wis";
  return "cha";
}

const profOf = (b: Build): number => 2 + Math.floor(Math.max(1, b.level - 1) / 4);


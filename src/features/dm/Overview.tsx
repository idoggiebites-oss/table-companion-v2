import type { Prepared } from "./session";
import s from "./Overview.module.css";

/**
 * The night in one panel: what you mean to open with, and what it is for.
 *
 * The mockup's Overview holds four cards — Opening/Recap, Session Goals, Key
 * Scenes and Session Checklist. Two are here.
 *
 * **Key Scenes is not**, because scenes as an ordered running order is Task 39
 * and it is the one place this design departs from V1 on purpose (*"a table
 * goes where it goes"*). It arrives with the split that makes a Scene a
 * different thing from a Place.
 *
 * **The checklist is not**, because it already exists: it is the ticked half
 * of the readiness card in the rail, reading the same `Prepared.checklist`.
 * Drawing it twice would give a DM two places to tick one thing and no way to
 * know which was authoritative.
 */
export function Overview({ session, onSave }: {
  session: Prepared | null;
  onSave: (s: Prepared) => void;
}) {
  if (session === null) {
    return (
      <p className={s.none} data-testid="overview-empty">
        No session yet. Start one in the rail and this is where its opening and
        its goals will be.
      </p>
    );
  }

  return (
    <div className={s.grid} data-testid="overview">
      <section className={s.card}>
        <span className={s.head}>Opening / recap</span>
        {/* Prose, because it is read out loud. `LastTime` on the Log tab
            derives a recap from what actually happened; this is what the DM
            means to SAY, which is a different thing and not derivable. */}
        <textarea
          className={s.note} rows={5} value={session.opening}
          placeholder="The party has tracked the cult to the ruins…"
          onChange={(e) => onSave({ ...session, opening: e.target.value })}
        />
      </section>

      <section className={s.card}>
        <span className={s.head}>Session goals</span>
        {/* One per line: a DM writing four goals at eleven at night should not
            have to press an add button between each of them. */}
        <textarea
          className={s.note} rows={5}
          value={session.goals.join("\n")}
          placeholder={"Enter the Shattered Keep\nStop the ritual"}
          onChange={(e) => onSave({
            ...session,
            goals: e.target.value.split("\n").filter((g) => g.trim() !== ""),
          })}
        />
        {session.goals.length > 0 && (
          <ul className={s.goals}>
            {session.goals.map((g) => <li key={g}>{g}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

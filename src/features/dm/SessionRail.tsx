import { useState } from "react";
import { blankSession, isNamed, type Prepared } from "./session";
import s from "./SessionRail.module.css";

/**
 * The top of the rail: what tonight's session is, before the outline of what
 * is in it.
 *
 * The mockup puts a hero image and a readiness meter between this and the
 * outline. Both are deliberately absent — image storage is Task 35 and the
 * readiness derivation is Task 29 — and there is no placeholder box standing
 * in for either: an empty frame reads as something broken rather than
 * something not built yet, which is the same rule `Prep.tsx` already applies
 * to the outline itself.
 *
 * A `Prepared` is event-sourced and plural (`Sessions.sessions`), but a table
 * plans one session at a time. `PrepScreen.tsx` reads the LAST one in that
 * list — `save` always appends past any edit, so that is whichever session
 * was most recently touched — and this component never has to know that a
 * list exists at all.
 *
 * The create/edit form is one `draft` toggle, the same shape as
 * `Scenes.tsx`'s: a compact set of fields inline rather than a screen of its
 * own, because a title, a number and a date do not deserve a navigation.
 */
export function SessionRail({ session, onSave, onForget }: {
  /** The session currently being planned, or none started yet. */
  session: Prepared | null;
  onSave: (session: Prepared) => void;
  onForget: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Prepared | null>(null);

  if (draft !== null) {
    return (
      <div className={s.card} data-testid="session-draft">
        <label className={s.field}>
          {/* No `aria-label` — the visible tag IS the name; see
              `mountPhone().mislabelled()`. */}
          <span className={s.tag}>What this session is called</span>
          <input
            className={s.text} value={draft.title}
            placeholder="The Shattered Keep"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>

        <span className={s.pair}>
          <label className={s.field}>
            <span className={s.tag}>Session number</span>
            <input
              className={s.num} type="number" min={1} value={draft.number}
              onChange={(e) => setDraft({ ...draft, number: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label className={s.field}>
            <span className={s.tag}>Date</span>
            <input
              className={s.date} type="date" value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </label>
        </span>

        <span className={s.row}>
          <button
            type="button" className={s.keep} disabled={!isNamed(draft)}
            onClick={() => { onSave(draft); setDraft(null); }}
          >
            Keep it
          </button>
          <button type="button" className={s.cancel} onClick={() => setDraft(null)}>
            Cancel
          </button>
          {/* Only offered once the session actually exists in the log — a
              brand-new draft has nothing to throw away yet. */}
          {session !== null && session.id === draft.id && (
            <button
              type="button" className={s.throw}
              aria-label={`Throw away ${draft.title}`}
              onClick={() => { onForget(draft.id); setDraft(null); }}
            >
              Throw it away
            </button>
          )}
        </span>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className={s.card} data-testid="session-empty">
        <span className={s.eyebrow}>Session</span>
        <p className={s.emptyText}>
          Nothing planned yet. A session needs only a title to be worth
          keeping — the rest can wait.
        </p>
        <button
          type="button" className={s.start}
          onClick={() => setDraft(blankSession(`ses${Date.now().toString(36)}`))}
        >
          Start a session
        </button>
      </div>
    );
  }

  return (
    <div className={s.card} data-testid="session-head">
      <span className={s.top}>
        <span className={s.eyebrow}>Session</span>
        <button type="button" className={s.edit} onClick={() => setDraft(session)}>
          Edit
        </button>
      </span>
      <h2 className={s.name}>{session.title}</h2>
      <span className={s.meta}>Session {session.number} · {formatDate(session.date)}</span>
    </div>
  );
}

/*
 * `Prepared.date` is a bare `YYYY-MM-DD`, not a timestamp — `new
 * Date("2025-05-18")` parses that as UTC midnight, which prints as the DAY
 * BEFORE in any timezone west of Greenwich. Building the date from its parts
 * instead keeps it local and honest.
 */
function formatDate(iso: string): string {
  if (iso === "") return "no date set";
  const [y, m, d] = iso.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

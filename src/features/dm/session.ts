import { fold } from "../../core/fold";
import type { Event } from "../../core/types";

export const SESSION = "session.act";

/**
 * A session, as the DM plans it before anybody sits down.
 *
 * `room/recap.ts` already has a `Session` — do not confuse the two, and this
 * type is named `Prepared` rather than reusing that word for exactly that
 * reason. Recap's `Session` is DERIVED: it is the log itself, sliced wherever
 * two events sit more than six hours apart, describing a night that was
 * PLAYED. This one is AUTHORED: a title, a number, a date the DM picked, an
 * opening recap they mean to read out, and a checklist of what still needs
 * doing before the table arrives. Nothing here comes from replaying events
 * about play — it exists before there is anything to replay.
 *
 * Conflating them would either invent a date for the recap (it has none, only
 * a start and end timestamp) or make the plan disappear the moment `sessions`
 * re-slices the log around new fight and vital events. They are stored the
 * same way — an act, folded — because both are event-sourced facts, but they
 * must never be assembled from the same events, and `recap.ts` is left
 * untouched by this file on purpose.
 *
 * Mirrors `scene.ts` field for field: a `save`/`forget` act, same-id-replaces,
 * a fold, and `isDmOnly` treats the whole kind as prep (see `visibility.ts`).
 */
export type Prepared = {
  readonly id: string;
  readonly title: string;
  /** The session number at this table — "session 14", not a database id. */
  readonly number: number;
  /** ISO `YYYY-MM-DD`. A DM picks a date; nothing here reads a clock for it. */
  readonly date: string;
  /** The recap the DM reads out to open the table. */
  readonly opening: string;
  /** What the DM means to hit tonight, in their own words. */
  readonly goals: readonly string[];
  readonly checklist: readonly { readonly id: string; readonly label: string; readonly done: boolean }[];
};

export const blankSession = (id: string): Prepared =>
  ({ id, title: "", number: 1, date: "", opening: "", goals: [], checklist: [] });

/** Ready enough to keep: a title is the only thing a session truly needs. */
export const isNamed = (session: Prepared): boolean => session.title.trim().length > 0;

export type Sessions = { readonly sessions: readonly Prepared[] };
export const NO_SESSIONS: Sessions = { sessions: [] };

export type SessionAct =
  | { readonly act: "save"; readonly session: Prepared }
  | { readonly act: "forget"; readonly id: string };

const asAct = (e: Event): SessionAct | null =>
  e.kind === SESSION ? (e.data as unknown as SessionAct) : null;

function reduce(p: Sessions, e: Event): Sessions {
  const a = asAct(e);
  if (a === null) return p;
  switch (a.act) {
    case "save":
      /* Same id replaces, exactly as a kept encounter does: editing a
         session plan is not acquiring a second one. */
      return { sessions: [...p.sessions.filter((x) => x.id !== a.session.id), a.session] };
    case "forget":
      return { sessions: p.sessions.filter((x) => x.id !== a.id) };
  }
}

export const sessionsFrom = (events: readonly Event[]): Sessions =>
  fold(events, reduce, NO_SESSIONS);

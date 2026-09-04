import type { Prepared } from "./session";

/**
 * How ready tonight is — and, much harder, what it is honest to count.
 *
 * The mockup asks for a meter, and the brief is careful about why: *"Not
 * because the DM needs to 'complete' prep, but because it gives a useful
 * overview."* That sentence is the whole specification. A meter that nags is
 * worse than no meter, and a meter that can never reach the end teaches the
 * table to ignore it.
 *
 * Three rules follow, and each one throws something out of the mockup.
 *
 * **It counts only what is built.** The mockup lists "Boss treasure" and
 * "Session ending notes"; there is no loot and no notes screen, so neither can
 * appear. This is `tabs.ts`'s rule — *what is not built is not drawn* — applied
 * to a number, and it matters more here: a row that goes nowhere is a dead
 * link, but a percentage that can never reach 100 is a permanent accusation.
 *
 * **It does not invent a bar.** The mockup counts "3 encounters prepared".
 * Three is not a rule of the game or of this table — a social night needs
 * none, and a dungeon crawl needs eight. So the derived checks ask only
 * whether a thing exists at all, never how many. V1 drew the same line about
 * its outgrown-encounter prompt: without it the app becomes *"a standing
 * complaint about encounters that were fine when they were written."*
 *
 * **The DM's own checklist is the spine.** Those items are the only ones that
 * are certainly about tonight, because a person wrote them down meaning them.
 * The derived checks sit underneath and are deliberately few.
 *
 * Derived on every read, never stored: a stored percentage is wrong the moment
 * anything changes, and it would be wrong in the direction of saying you are
 * readier than you are.
 */

export type Check = {
  readonly id: string;
  /** What is being asked, in the words the rail prints. */
  readonly label: string;
  readonly done: boolean;
  /** True when the DM wrote this line themselves rather than the app deriving it. */
  readonly own: boolean;
};

export type Readiness = {
  readonly checks: readonly Check[];
  readonly done: number;
  readonly total: number;
  /**
   * Null when there is nothing to be ready FOR.
   *
   * A session with nothing in it is not 0% ready — it is not started, and the
   * two read completely differently to a person who has just opened the app.
   * The rail says so in words instead. This is the only case that returns
   * null; a session that is genuinely 0 of 4 shows 0%, because that is true.
   */
  readonly percent: number | null;
};

export const NOTHING: Readiness = { checks: [], done: 0, total: 0, percent: null };

/**
 * What tonight looks like, out of the session and what is prepared around it.
 *
 * Takes counts rather than the records themselves: this needs to know that
 * there IS an encounter, never which one, and a signature that cannot reach
 * the contents cannot start quietly grading them.
 */
export function readinessOf(
  session: Prepared | null,
  have: { readonly encounters: number; readonly places: number; readonly people: number },
): Readiness {
  if (session === null) return NOTHING;

  const derived: Check[] = [
    {
      id: "opening",
      label: "An opening to read out",
      done: session.opening.trim() !== "",
      own: false,
    },
    {
      id: "goals",
      label: "What tonight is for",
      done: session.goals.some((g) => g.trim() !== ""),
      own: false,
    },
    {
      /* Deliberately "something", not "three encounters". A night of talking
         is a prepared night; a night of nothing is not. */
      id: "something",
      label: "Something prepared to run",
      done: have.encounters + have.places + have.people > 0,
      own: false,
    },
  ];

  const own: Check[] = session.checklist.map((c) => ({
    id: `own:${c.id}`,
    label: c.label,
    done: c.done,
    own: true,
  }));

  /* The DM's own lines first: they are the ones about tonight in particular,
     and the derived three are the same three every week. */
  const checks = [...own, ...derived];
  const done = checks.filter((c) => c.done).length;
  return { checks, done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}

/**
 * The one line the rail prints beside the bar.
 *
 * "6 of 7" rather than a bare percentage, because the fraction says what to do
 * next and the percentage only says how you are getting on.
 */
export const describeReadiness = (r: Readiness): string =>
  r.percent === null
    ? "Nothing prepared yet."
    : `${String(r.done)} of ${String(r.total)} ready`;

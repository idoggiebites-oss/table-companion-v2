import type { Event } from "../../core/types";
import { FIGHT } from "../dm/fight";
import { VITAL } from "../sheet/model";
import { TAKE } from "../progression/model";
import { describeRoom, isOpenGround, type Room } from "../../rules/5e/terrain";

/**
 * What happened last time.
 *
 * The log has held every session in full since the first commit and has never
 * been readable. Scrolling three hundred rows of "damage 7" backwards is not
 * remembering — it is archaeology — so what a table actually does is ask out
 * loud, and the answer is whatever four people half-remember.
 *
 * A recap is the log read FORWARDS instead: the shape of a session rather
 * than its transactions. Three fights, somebody went down, you levelled, you
 * spent the night in the dark.
 *
 * Two rules, both V1's:
 *
 * **The app never says what happened in the fiction.** It knows Kira took
 * eleven damage; it does not know the ghoul had her by the throat. Every line
 * is a fact it can stand behind, phrased plainly, and the story around it
 * stays with the people who were there.
 *
 * **It says nothing a player's log would not.** The recap is built from
 * whatever events it is handed, so a player's recap comes out of a player's
 * log — `logFor` has already removed the DM's prep — and nothing leaks in
 * sideways. That is why this takes events rather than reaching for them.
 *
 * ## What V1 says and this cannot
 *
 * V1 reads twelve event types. V2's log is act-shaped and carries fewer
 * facts, and the missing ones are listed here rather than approximated:
 *
 *   - **Experience and loot.** V2 records neither. `rawXp` computes what an
 *     encounter is worth; nothing awards it, so "you earned 450" would be the
 *     app inventing an accounting it does not keep.
 *   - **Spells cast.** There is a concentration act and no cast act, so the
 *     only spell V2 knows about is the one still running.
 *   - **A natural twenty.** V1 logs the dice. V2 logs a CLAIM — the total, a
 *     player's modifier already inside it — so the die is not recoverable.
 *     "Three natural twenties" would be a guess about the best moment of
 *     somebody's night, which is the worst thing on this list to get wrong.
 *
 * Each returns when its event does. Absent is honest.
 */

/**
 * Six hours between events starts a new session.
 *
 * A game that runs past midnight is one session; a week later is not. There is
 * no "end the session" button and there should not be — it is one more thing
 * to forget, and forgetting it would silently merge two nights into one
 * recap. A gap is something the table cannot fail to do.
 */
export const SESSION_GAP_MS = 6 * 60 * 60 * 1000;

export type Session = {
  readonly startedAt: number;
  readonly endedAt: number;
  readonly events: readonly Event[];
};

/** Split a log where the table went home. Oldest first. */
export function sessions(events: readonly Event[], gap: number = SESSION_GAP_MS): Session[] {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const out: Session[] = [];
  let run: Event[] = [];
  for (const e of sorted) {
    const last = run[run.length - 1];
    if (last !== undefined && e.at - last.at > gap) { out.push(sessionOf(run)); run = []; }
    run.push(e);
  }
  if (run.length > 0) out.push(sessionOf(run));
  return out;
}

const sessionOf = (events: readonly Event[]): Session => ({
  startedAt: events[0]?.at ?? 0,
  endedAt: events[events.length - 1]?.at ?? 0,
  events,
});

export type Recap = {
  readonly startedAt: number;
  readonly endedAt: number;
  /** The session in sentences, in the order a table would tell it. */
  readonly lines: readonly string[];
  /** The few numbers worth seeing at a glance. */
  readonly counts: readonly { readonly label: string; readonly value: string }[];
};

const plural = (n: number, one: string, many = `${one}s`) => `${String(n)} ${n === 1 ? one : many}`;

/** Written out to ten, because "3 fights" reads like a spreadsheet. */
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** The number alone: "three", and "11" once words stop helping. */
export const inWords = (n: number): string => WORDS[n] ?? String(n);

/** The number and what there are that many of. Shared with the prompts. */
export const spelled = (n: number, one: string, many = `${one}s`): string =>
  `${inWords(n)} ${n === 1 ? one : many}`;

/** A list that reads aloud: "Kira", "Kira and Bel", "Kira, Bel and Sam". */
export function andList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
}

export const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const data = (e: Event) => e.data as Record<string, unknown>;
const actOf = (e: Event, kind: string): string | null =>
  e.kind === kind ? String(data(e)["act"] ?? "") : null;
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * The session, in the order a table tells it: where they went, what they
 * fought, who nearly died, and what the night cost.
 */
export function recapOf(session: Session, nameOf: (id: string) => string): Recap {
  const lines: string[] = [];
  const counts: { label: string; value: string }[] = [];
  const seen = <T,>(list: readonly T[]): T[] => [...new Set(list)];
  const fights = session.events.filter((e) => e.kind === FIGHT);
  const vitals = session.events.filter((e) => e.kind === VITAL);
  const act = (list: readonly Event[], kind: string, want: string) =>
    list.filter((e) => actOf(e, kind) === want);

  /* ── where ──────────────────────────────────────────────────────────── */
  const rooms = act(fights, FIGHT, "room")
    .map((e) => data(e)["room"] as Room | undefined)
    .filter((r): r is Room => r !== undefined && !isOpenGround(r))
    /* `describeRoom` writes for the fight's own header, where a middot
       separates the facts. In a sentence that is punctuation nobody says. */
    .map((r) => describeRoom(r).replace(/ · /g, ", "));
  if (rooms.length > 0) {
    const places = seen(rooms);
    lines.push(places.length === 1
      ? `You fought in ${places[0]!}.`
      : `The ground kept changing: ${andList(places)}.`);
  }

  /* ── fights ─────────────────────────────────────────────────────────── */
  const began = act(fights, FIGHT, "begin").length;
  if (began > 0) {
    lines.push(`${capital(spelled(began, "fight"))}.`);
    counts.push({ label: "Fights", value: String(began) });
  }

  /* ── the worst of it ────────────────────────────────────────────────── */
  const hits = act(vitals, VITAL, "damage");
  const worst = hits.reduce<{ who: string; n: number } | null>((top, e) => {
    const n = num(data(e)["n"]);
    return top !== null && top.n >= n ? top : { who: str(data(e)["character"]), n };
  }, null);
  const taken = hits.reduce((n, e) => n + num(data(e)["n"]), 0);
  if (worst !== null && worst.n > 0) {
    lines.push(`The hardest hit of the night landed on ${nameOf(worst.who)}, for ${String(worst.n)}.`);
    counts.push({ label: "Damage taken", value: String(taken) });
  }
  const healed = act(vitals, VITAL, "heal").reduce((n, e) => n + num(data(e)["n"]), 0);
  if (healed > 0) counts.push({ label: "Healed", value: String(healed) });

  /* ── who nearly died ────────────────────────────────────────────────── */
  const saves = act(vitals, VITAL, "death");
  const down = seen(saves.map((e) => str(data(e)["character"])));
  if (down.length > 0) {
    /* Three failures is dead by the rules, and this counts the same way the
       sheet does rather than by a second reading of it. A `clear` is a
       character who came back up, and does not count against them. */
    const died = down.filter((who) =>
      saves.filter((e) => str(data(e)["character"]) === who
        && str(data(e)["result"]) === "failure").length >= 3);
    lines.push(`${andList(down.map(nameOf))} went down${
      died.length > 0 ? ` — and ${andList(died.map(nameOf))} did not get back up` : ""
    }.`);
  }

  /* ── what it earned ─────────────────────────────────────────────────── */
  /*
   * `TAKE`, not a `level` CHOICE. Creation's "what level are you starting at?"
   * reduces to the same `level` step a sheet would, so reading that made every
   * newly rolled character "level up" on the night it was made — the app
   * saying something it cannot tell apart, which is the one thing a recap must
   * not do. Taking a level is its own event and means only itself.
   */
  const levelled = seen(session.events
    .filter((e) => e.kind === TAKE)
    .map((e) => str(data(e)["character"])));
  if (levelled.length > 0) lines.push(`${andList(levelled.map(nameOf))} levelled.`);

  /* ── and how you spent it ───────────────────────────────────────────── */
  const rests = act(vitals, VITAL, "rest");
  const long = rests.filter((e) => str(data(e)["length"]) === "long").length;
  const short = rests.length - long;
  if (rests.length > 0) {
    counts.push({
      label: "Rests",
      value: [short > 0 ? `${String(short)} short` : "", long > 0 ? `${String(long)} long` : ""]
        .filter((x) => x !== "").join(", "),
    });
  }

  /*
   * Exhaustion is V2's and not V1's, and it earns a line: it is the one
   * condition that survives a long rest, so it is the only thing here that is
   * still true when the table sits down again.
   */
  const worn = seen(vitals
    .filter((e) => actOf(e, VITAL) === "exhaustion" && num(data(e)["n"]) > 0)
    .map((e) => str(data(e)["character"])));
  if (worn.length > 0) lines.push(`${andList(worn.map(nameOf))} finished the night exhausted.`);

  return { startedAt: session.startedAt, endedAt: session.endedAt, lines, counts };
}

/** Nothing worth reading — a session where the app was only opened. */
export const isEmpty = (r: Recap): boolean => r.lines.length === 0 && r.counts.length === 0;

/**
 * A date a table recognises. "Last night" and "a week ago" are how people
 * refer to sessions; an ISO date is how a database does.
 */
export function whenWas(at: number, now: number = Date.now()): string {
  const days = Math.floor((startOfDay(now) - startOfDay(at)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${plural(days, "day")} ago`;
  if (days < 14) return "last week";
  if (days < 60) return `${plural(Math.round(days / 7), "week")} ago`;
  return `${plural(Math.round(days / 30), "month")} ago`;
}

function startOfDay(at: number): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

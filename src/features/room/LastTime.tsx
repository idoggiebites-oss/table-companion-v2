import { isEmpty, recapOf, sessions, whenWas, type Recap as Shape } from "./recap";
import type { Event } from "../../core/types";
import s from "./LastTime.module.css";

/**
 * What happened last time, above the log it is read out of.
 *
 * Named for what it shows rather than for its module: `recap.ts` beside a
 * `Recap.tsx` differ only in casing, which a case-insensitive filesystem
 * cannot tell apart and TypeScript refuses.
 *
 * Here rather than on a tab of its own, and that placement is the argument:
 * this IS the log, read forwards. A person who wants the transactions scrolls
 * past it to the rows, and a person who wants the night gets it first.
 *
 * Nothing is shown for a session that has nothing to say. A recap that
 * manufactured a sentence out of "the app was opened" would teach the table to
 * stop believing the ones that matter.
 */
export function LastTime({ events, nameOf }: {
  /** Already filtered for this seat — see `visibility.ts`. */
  events: readonly Event[];
  nameOf: (id: string) => string;
}) {
  const all = sessions(events);
  const last = all[all.length - 1];
  if (last === undefined) return null;
  const recap = recapOf(last, nameOf);
  if (isEmpty(recap)) return null;

  return (
    <section className={s.wrap} aria-label="What happened" data-testid="recap">
      <span className={s.when}>{whenWas(recap.startedAt)}</span>
      <Lines recap={recap} />
      {recap.counts.length > 0 && (
        <dl className={s.counts}>
          {recap.counts.map((c) => (
            <div key={c.label} className={s.count}>
              <dt className={s.label}>{c.label}</dt>
              <dd className={s.value}>{c.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/*
 * Prose, because it is meant to be read aloud at the start of a session — and
 * every line is a fact the app can stand behind. What happened in the fiction
 * is not here and never will be: the app knows Kira took eleven, not that the
 * ghoul had her by the throat.
 */
function Lines({ recap }: { recap: Shape }) {
  return (
    /* One paragraph, not a list. These are sentences a person reads out at
       the start of a session, and a bulleted night reads as a report. */
    <p className={s.lines}>{recap.lines.join(" ")}</p>
  );
}

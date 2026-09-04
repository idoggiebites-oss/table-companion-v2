import { describeReadiness, readinessOf } from "./readiness";
import type { Prepared } from "./session";
import s from "./HowReady.module.css";

/**
 * How ready tonight is, as a bar and a fraction.
 *
 * Named for the question rather than the module: `Readiness.tsx` beside
 * `readiness.ts` differ only in casing, which this filesystem cannot tell
 * apart and TypeScript refuses. `LastTime` and `WhatNow` are named the same
 * way, for the same reason.
 *
 * The brief is careful about why this exists: *"Not because the DM needs to
 * 'complete' prep, but because it gives a useful overview."* `readiness.ts`
 * holds what it is honest to count and why; this only draws it.
 *
 * Two things follow from that sentence and are visible here.
 *
 * **Nothing at all is words, not 0%.** A session with nothing in it has not
 * been started, and "0%" reads as failure where "Nothing prepared yet" reads
 * as an invitation. The bar is not drawn in that case either — an empty track
 * is the same false accusation in a different shape.
 *
 * **The DM's own lines are marked as theirs.** They lead, and they are the
 * only ones that can be ticked here; the derived three are read-only because
 * ticking "An opening to read out" without writing one would make the meter
 * lie on request.
 */
export function HowReady({ session, have, onToggle }: {
  session: Prepared | null;
  have: { readonly encounters: number; readonly places: number; readonly people: number };
  /** Ticking one of the DM's own lines. Absent makes the list read-only. */
  onToggle?: (id: string, done: boolean) => void;
}) {
  const r = readinessOf(session, have);

  /*
   * Nothing at all draws nothing. `SessionRail` directly above already says
   * "Nothing planned yet" and offers the button that fixes it; a second block
   * underneath saying "Nothing prepared yet" is the app saying nothing twice
   * on the emptiest screen it has. `readiness.ts` still returns a null
   * percentage for this case — the refusal to show 0% lives there, and this
   * is only the decision not to draw the box.
   */
  if (r.percent === null) return null;

  return (
    <section className={s.wrap} aria-label="Session readiness" data-testid="readiness">
      <span className={s.head}>
        <span className={s.label}>Session readiness</span>
        <span className={s.percent}>{r.percent}%</span>
      </span>

      {/* `aria-hidden`: the fraction beneath says the same thing in words, and
          a bar announced as well would be the number twice. */}
      <span className={s.track} aria-hidden="true">
        <span className={s.fill} style={{ width: `${String(r.percent)}%` }} />
      </span>
      <span className={s.said}>{describeReadiness(r)}</span>

      <ul className={s.checks}>
        {r.checks.map((c) => (
          <li key={c.id}>
            {c.own && onToggle !== undefined ? (
              <button
                type="button" className={s.check} aria-pressed={c.done}
                onClick={() => onToggle(c.id.replace(/^own:/, ""), !c.done)}
              >
                <span className={c.done ? `${s.mark} ${s.on}` : s.mark} aria-hidden="true" />
                <span className={s.text}>{c.label}</span>
              </button>
            ) : (
              /* Derived, so a statement rather than a control: it becomes true
                 by doing the thing, never by tapping. */
              <span className={s.check} data-derived="yes">
                <span className={c.done ? `${s.mark} ${s.on}` : s.mark} aria-hidden="true" />
                <span className={s.text}>{c.label}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

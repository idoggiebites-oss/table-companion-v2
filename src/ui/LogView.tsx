import { live, isSkip } from "../core/log";
import type { Event, EventId } from "../core/types";
import s from "./LogView.module.css";

/**
 * Slice 1's debug view, and nothing else. It shows the whole log — including
 * what has been taken back, because "undo is not deletion" is only credible if
 * you can see the event still sitting there.
 */
export function LogView({
  events,
  onUndo,
}: {
  events: readonly Event[];
  onUndo: (id: EventId) => void;
}) {
  if (events.length === 0) {
    return <p className={s.empty}>The log is empty. Append something.</p>;
  }

  const shown = new Set(live(events).map((e) => e.id));

  return (
    <div className={s.rows} data-testid="rows">
      {events.map((e) => {
        const undone = !shown.has(e.id) && !isSkip(e);
        return (
          <div
            key={e.id}
            className={undone ? `${s.row} ${s.undone}` : s.row}
            data-testid="event"
            data-undone={undone ? "yes" : "no"}
          >
            <span className={s.seq}>{e.seq}</span>
            <span className={s.kind}>
              {isSkip(e) ? <span className={s.mark}>undo of {String(e.data["target"])}</span> : e.kind}
              {undone && <span className={s.mark}> taken back</span>}
            </span>
            {isSkip(e) ? (
              <span className={s.by}>{e.by}</span>
            ) : (
              <button
                type="button"
                className={s.undo}
                onClick={() => onUndo(e.id)}
                aria-label={`Undo event ${e.seq}`}
              >
                Undo
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

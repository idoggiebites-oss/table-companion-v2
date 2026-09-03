import { live, isSkip } from "../core/log";
import type { Event, EventId } from "../core/types";
import s from "./LogView.module.css";

/**
 * The log, as this seat may read it.
 *
 * It shows what it is given — including what has been taken back, because
 * "undo is not deletion" is only credible if you can see the event still
 * sitting there. What it is NOT given is the DM's prep: the filtering happens
 * before this, in `features/room/visibility.ts`, so that a screen can never
 * accidentally render an event it should not have received in the first place.
 *
 * It was Slice 1's debug view and said so, which was true until the app went
 * on a URL a player could open.
 */
export function LogView({
  events,
  onUndo,
  mayUndo = () => true,
}: {
  events: readonly Event[];
  onUndo: (id: EventId) => void;
  /**
   * Whether this seat may take a given event back. The DM may undo anything;
   * a player may undo what their own device did. Undoing somebody else's
   * action is a conversation, not a button — so there is no button.
   */
  mayUndo?: (e: Event) => boolean;
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
            {isSkip(e) || !mayUndo(e) ? (
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

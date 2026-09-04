import { live, isSkip } from "../core/log";
import { describe, type NameOf } from "../features/room/story";
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
 * It was Slice 1's debug view and said so — and it still WAS one until Arturo
 * said he preferred V1's. It printed a sequence number, the raw event kind and
 * a device id, so a night read as forty rows of "fight.act d3f9a1". The
 * sentences live in `features/room/story.ts` now; this file draws them.
 *
 * A row with nothing to say is not drawn at all. `story.ts` returns null for
 * those, and V1's example is the one that matters: advancing the turn, because
 * "the feed would be nothing but this."
 */
const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function LogView({
  events,
  onUndo,
  nameOf = () => undefined,
  mayUndo = () => true,
}: {
  events: readonly Event[];
  onUndo: (id: EventId) => void;
  /** Characters and combatants alike — a row says who, or says "a creature". */
  nameOf?: NameOf;
  /**
   * Whether this seat may take a given event back. The DM may undo anything;
   * a player may undo what their own device did. Undoing somebody else's
   * action is a conversation, not a button — so there is no button.
   */
  mayUndo?: (e: Event) => boolean;
}) {
  const shown = new Set(live(events).map((e) => e.id));
  const rows = events
    .map((e) => ({ e, text: describe(e, nameOf) }))
    .filter((r): r is { e: Event; text: string } => r.text !== null);

  if (rows.length === 0) {
    return <p className={s.empty}>Nothing has happened yet.</p>;
  }

  return (
    <div className={s.rows} data-testid="rows">
      {rows.map(({ e, text }) => {
        const undone = !shown.has(e.id) && !isSkip(e);
        return (
          <div
            key={e.id}
            className={undone ? `${s.row} ${s.undone}` : s.row}
            data-testid="event"
            data-undone={undone ? "yes" : "no"}
          >
            <span className={s.at}>{time(e.at)}</span>
            <span className={s.what}>
              {text}
              {undone && <span className={s.mark}> taken back</span>}
            </span>
            {mayUndo(e) && (
              <button
                type="button"
                className={s.undo}
                disabled={undone}
                onClick={() => onUndo(e.id)}
                aria-label={`Undo: ${text}`}
              >
                {undone ? "Undone" : "Undo"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { RoomPicker } from "./RoomPicker";
import { blankScene, describeScene, isNamed, sortScenes, type Scene } from "./scene";
import { isOpenGround } from "../../rules/5e/terrain";
import type { Encounter } from "./encounter";
import s from "./Scenes.module.css";

/**
 * The places a DM prepared, and the one press that opens one.
 *
 * Encounters were a saved thing that nothing joined up — a bestiary rather
 * than a plan. A place is the join: the cellar, with its dark and its rubble,
 * the thing waiting in it, and the line to read when the door opens.
 *
 * Opening one does three things at once, which is the whole point: it sets the
 * room live for everybody, it stages the encounter if there is one, and it
 * puts the note in front of the DM. Doing those separately is what a DM does
 * today, and forgetting the second is why a fight starts in daylight that was
 * supposed to be pitch dark.
 *
 * A drawer, not a running order. No numbers, no next, no session track.
 */
export function Scenes({ scenes, encounters, onPrepare, onForget, onOpen }: {
  scenes: readonly Scene[];
  encounters: readonly Encounter[];
  onPrepare: (scene: Scene) => void;
  onForget: (id: string) => void;
  onOpen: (scene: Scene) => void;
}) {
  const [draft, setDraft] = useState<Scene | null>(null);
  const listed = sortScenes(scenes);
  const nameOf = (id: string | undefined) =>
    encounters.find((e) => e.id === id)?.name;

  return (
    <section className={s.wrap} aria-label="Places">
      <div className={s.head}>
        <h2 className={s.title}>Places</h2>
        <button
          type="button" className={s.new}
          onClick={() => setDraft(draft === null ? blankScene(`sc${Date.now().toString(36)}`) : null)}
        >
          {draft === null ? "Prepare one" : "Cancel"}
        </button>
      </div>

      {listed.length === 0 && draft === null && (
        <p className={s.empty} data-testid="places-empty">
          A place is a room, whatever is waiting in it, and what you mean to
          say when the door opens. Prepare them now; open one in a press.
        </p>
      )}

      {listed.length > 0 && (
        <ul className={s.list} data-testid="places">
          {listed.map((sc) => (
            <li key={sc.id} className={s.card} data-testid="place-card">
              <span className={s.cardHead}>
                <span className={s.name}>{sc.name}</span>
                {/* What is IN it, never a restatement of its own title. */}
                <span className={s.meta}>{describeScene(sc, nameOf(sc.encounter))}</span>
              </span>
              <span className={s.actions}>
                <button type="button" className={s.open}
                        aria-label={`Open ${sc.name}`} onClick={() => onOpen(sc)}>
                  Open it
                </button>
                <button type="button" className={s.edit}
                        aria-label={`Edit ${sc.name}`} onClick={() => setDraft(sc)}>
                  Edit
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {draft !== null && (
        <div className={s.draft} data-testid="place-draft">
          <label className={s.field}>
            <span className={s.tag}>What the place is called</span>
            <input
              className={s.text} value={draft.name} aria-label="Place name"
              placeholder="The cellar under the mill"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>

          <RoomPicker
            room={draft.room} prefix="Prepare"
            onChange={(room) => setDraft({ ...draft, room })}
          />

          {encounters.length > 0 && (
            <label className={s.field}>
              <span className={s.tag}>Waiting in it</span>
              <select
                className={s.pick} aria-label="Encounter waiting"
                value={draft.encounter ?? ""}
                onChange={(e) => {
                  /* `exactOptionalPropertyTypes`: absent means nothing is
                     waiting, and that is not the same as the key being there
                     holding undefined. */
                  const { encounter: _drop, ...rest } = draft;
                  setDraft(e.target.value === "" ? rest : { ...rest, encounter: e.target.value });
                }}
              >
                <option value="">nothing</option>
                {encounters.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
              </select>
            </label>
          )}

          <label className={s.field}>
            <span className={s.tag}>What you mean to say</span>
            <textarea
              className={s.note} aria-label="Note" maxLength={400} rows={3}
              placeholder="The stair gives under your weight. Something below stops moving."
              value={draft.note ?? ""}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </label>

          <span className={s.row}>
            <button
              type="button" className={s.keep} disabled={!isNamed(draft)}
              onClick={() => { onPrepare(draft); setDraft(null); }}
            >
              Keep it
            </button>
            {scenes.some((x) => x.id === draft.id) && (
              <button
                type="button" className={s.throw}
                aria-label={`Throw away ${draft.name}`}
                onClick={() => { onForget(draft.id); setDraft(null); }}
              >
                Throw it away
              </button>
            )}
          </span>

          {isOpenGround(draft.room) && (
            <p className={s.empty}>
              Nothing said about the room. Opening this will clear whatever the
              last place set.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import { EncounterBuilder } from "./EncounterBuilder";
import { RoomPicker } from "./RoomPicker";
import {
  blankEncounter, creatureCount, isNamed, rawXp,
  ENCOUNTER_KINDS, type Encounter, type EncounterKind,
} from "./encounter";
import { budgetFor, describeTotals, totalsFor, type Band } from "../../rules/5e/encounter";
import { OPEN_GROUND } from "../../rules/5e/terrain";
import s from "./EncounterEditor.module.css";

/**
 * One encounter, in the five tabs the mockup draws: Setup, Creatures,
 * Environment, Rewards, Notes.
 *
 * Tabs rather than one long form, and the reason is the height budget: an
 * encounter has about twenty fields and a DM opens this to change one of them.
 * A form that must be scrolled past to reach the thing you came for is the
 * failure `DESIGN.md` measures screens against.
 *
 * **Environment is `RoomPicker`, unchanged.** The same control the fight screen
 * uses to say what the room is like mid-session. One vocabulary for light and
 * ground, whether it is being planned or being changed with the table watching.
 *
 * **Send to Combat is the point of the whole phase.** It saves first and then
 * stages, so what reaches the fight is what is written down rather than a draft
 * that only exists in this component — and the creatures, the room and the
 * notes all arrive together, which is what `openActs` has done since Task 19.
 */
const BANDS: readonly Band[] = ["trivial", "easy", "medium", "hard", "deadly"];
const TABS = ["Setup", "Creatures", "Environment", "Rewards", "Notes"] as const;

export function EncounterEditor({ encounter, partyLevels, onSave, onSend, onClose, fetcher }: {
  /** An encounter to change, or nothing to start one. */
  encounter?: Encounter;
  partyLevels: readonly number[];
  onSave: (e: Encounter) => void;
  /** Save it and put it on the table. */
  onSend: (e: Encounter) => void;
  onClose: () => void;
  fetcher?: typeof fetch;
}) {
  const [draft, setDraft] = useState<Encounter>(
    () => encounter ?? blankEncounter(`enc${Date.now().toString(36)}`),
  );
  const [tab, setTab] = useState<(typeof TABS)[number]>("Setup");

  const totals = totalsFor({ creatures: creatureCount(draft), rawXp: rawXp(draft) }, partyLevels);
  const set = <K extends keyof Encounter>(k: K, v: Encounter[K]) => setDraft({ ...draft, [k]: v });

  return (
    <div className={s.wrap} data-testid="encounter-editor">
      <div className={s.tabs} role="tablist" aria-label="This encounter">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={t === tab}
                  className={t === tab ? `${s.tab} ${s.on}` : s.tab}
                  onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Setup" && (
        <div className={s.panel} data-testid="panel-setup">
          <label className={s.field}>
            <span className={s.tag}>What to call it</span>
            <input className={s.text} value={draft.name} placeholder="Goblin ambush"
                   onChange={(e) => set("name", e.target.value)} />
          </label>

          <span className={s.tag}>What sort of scene</span>
          <div className={s.seg}>
            {ENCOUNTER_KINDS.map((k) => (
              <button key={k} type="button" aria-pressed={(draft.kind ?? "combat") === k}
                      className={(draft.kind ?? "combat") === k ? `${s.pick} ${s.on}` : s.pick}
                      onClick={() => set("kind", k as EncounterKind)}>
                {k}
              </button>
            ))}
          </div>

          <label className={s.field}>
            <span className={s.tag}>Where</span>
            <input className={s.text} value={draft.place} placeholder="Forest Road"
                   onChange={(e) => set("place", e.target.value)} />
          </label>

          <label className={s.field}>
            <span className={s.tag}>What the party is trying to do</span>
            <input className={s.text} value={draft.objective ?? ""} placeholder="Survive the ambush"
                   onChange={(e) => set("objective", e.target.value)} />
          </label>

          <label className={s.field}>
            {/*
              * The gauge computes a band from the party's own levels and is
              * blind to everything it cannot see — a party at half hit points,
              * reinforcements two rooms away. So this overrides it and the app
              * never writes it. Advice, not enforcement.
              */}
            <span className={s.tag}>How hard, if you disagree</span>
            <select className={s.text} value={draft.difficulty ?? ""}
                    onChange={(e) => {
                      const { difficulty: _drop, ...rest } = draft;
                      setDraft(e.target.value === "" ? rest : { ...rest, difficulty: e.target.value as Band });
                    }}>
              <option value="">
                {totals.band === null ? "no party to measure against" : `as measured — ${totals.band}`}
              </option>
              {BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>
      )}

      {tab === "Creatures" && (
        <div className={s.panel} data-testid="panel-creatures">
          <EncounterBuilder draft={draft} onChange={setDraft}
                            {...(fetcher === undefined ? {} : { fetcher })} />
        </div>
      )}

      {tab === "Environment" && (
        <div className={s.panel} data-testid="panel-environment">
          <RoomPicker room={draft.room ?? OPEN_GROUND} prefix="Prepare"
                      onChange={(room) => set("room", room)} />
        </div>
      )}

      {tab === "Rewards" && (
        <label className={`${s.panel} ${s.field}`} data-testid="panel-rewards">
          {/* Words, not a coin model: a DM writes "25 gp and a potion", and an
              app that insisted on parsing that would refuse half of what a
              table actually hands out. */}
          <span className={s.tag}>What it is worth</span>
          <textarea className={s.note} rows={4} value={draft.rewards ?? ""}
                    placeholder="25 gp, a potion of healing"
                    onChange={(e) => set("rewards", e.target.value)} />
        </label>
      )}

      {tab === "Notes" && (
        <label className={`${s.panel} ${s.field}`} data-testid="panel-notes">
          <span className={s.tag}>Anything else</span>
          <textarea className={s.note} rows={4} value={draft.notes ?? ""}
                    placeholder="Yazuk retreats when reduced below half."
                    onChange={(e) => set("notes", e.target.value)} />
        </label>
      )}

      {/* The working, on every tab: the number this encounter is worth is the
          thing you are adjusting all of them against. */}
      <p className={s.working} data-testid="editor-working">
        {describeTotals(totals, budgetFor(partyLevels))}
      </p>

      <div className={s.row}>
        <button type="button" className={s.keep} disabled={!isNamed(draft)}
                onClick={() => { onSave(draft); onClose(); }}>
          Keep it
        </button>
        <button type="button" className={s.send} disabled={!isNamed(draft)}
                onClick={() => { onSave(draft); onSend(draft); }}>
          Send to combat
        </button>
        <button type="button" className={s.cancel} onClick={onClose}>Never mind</button>
      </div>
    </div>
  );
}

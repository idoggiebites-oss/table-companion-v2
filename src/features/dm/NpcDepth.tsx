import { ATTITUDES, tiesOf, type Npc } from "./npc";
import s from "./NpcDepth.module.css";

/**
 * The other eight fields, and the reason they are behind a fold.
 *
 * The brief asks an NPC to carry species, faction, attitude, voice, goals,
 * secrets, actions and ties. V1's record had six fields on purpose, and its
 * reason is the one thing that must survive this task:
 *
 *   > Most of the ones a campaign accumulates never roll anything — a
 *   > shopkeeper, a harbourmaster, the contact who knows a guy — and forcing
 *   > them through a creature form would mean inventing an armour class for a
 *   > man who sells rope.
 *
 * Eleven fields on one form is that same mistake at greater length. So the
 * form a DM meets is still a name, a role and a line of notes, and this opens
 * only for the one who turns out to matter.
 *
 * A separate file because `Npcs.tsx` was 220 lines and this is another 120 —
 * the fold is a real seam, not a way of getting under a budget.
 */
export function NpcDepth({ draft, all, onChange }: {
  draft: Npc;
  /** Everyone else, so a tie can name somebody rather than an id. */
  all: readonly Npc[];
  onChange: (next: Npc) => void;
}) {
  const set = <K extends keyof Npc>(k: K, v: Npc[K]) => { onChange({ ...draft, [k]: v }); };
  const others = all.filter((n) => n.id !== draft.id && n.name.trim() !== "");
  const ties = tiesOf(draft, all);

  return (
    <div className={s.wrap} data-testid="npc-depth">
      <div className={s.pair}>
        <label className={s.field}>
          <span className={s.tag}>What they are</span>
          <input className={s.text} value={draft.species ?? ""} placeholder="Half-Orc"
                 onChange={(e) => set("species", e.target.value)} />
        </label>
        <label className={s.field}>
          <span className={s.tag}>Who they answer to</span>
          <input className={s.text} value={draft.faction ?? ""} placeholder="The Blackshields"
                 onChange={(e) => set("faction", e.target.value)} />
        </label>
      </div>

      <span className={s.tag}>How they feel about the party</span>
      <div className={s.seg}>
        {ATTITUDES.map((a) => (
          <button key={a} type="button" aria-pressed={draft.attitude === a}
                  className={draft.attitude === a ? `${s.pick} ${s.on}` : s.pick}
                  onClick={() => {
                    /* Pressing the one already set clears it: an attitude
                       nobody chose should not read as "neutral", which is a
                       decision. */
                    const { attitude: _drop, ...rest } = draft;
                    onChange(draft.attitude === a ? rest : { ...rest, attitude: a });
                  }}>
            {a}
          </button>
        ))}
      </div>

      <label className={s.field}>
        <span className={s.tag}>How they sound</span>
        <textarea className={s.note} rows={2} value={draft.voice ?? ""}
                  placeholder="Slow, and never finishes a sentence."
                  onChange={(e) => set("voice", e.target.value)} />
      </label>

      <label className={s.field}>
        <span className={s.tag}>What they want</span>
        <textarea className={s.note} rows={2} value={draft.goals ?? ""}
                  placeholder="To buy back his brother's debt."
                  onChange={(e) => set("goals", e.target.value)} />
      </label>

      <label className={s.field}>
        <span className={s.tag}>What they are hiding</span>
        <textarea className={s.note} rows={2} value={draft.secrets ?? ""}
                  placeholder="He already sold them out once."
                  onChange={(e) => set("secrets", e.target.value)} />
      </label>

      <label className={s.field}>
        <span className={s.tag}>What they can do</span>
        <textarea className={s.note} rows={2} value={draft.actions ?? ""}
                  placeholder="Casts charm person once a day."
                  onChange={(e) => set("actions", e.target.value)} />
      </label>

      {/* Ties are stored on ONE side and read from both — see `tiesOf`. The
          reverse shows the words as written, because the app cannot turn
          "sister of" into its opposite and guessing would put words in the
          DM's mouth. */}
      <span className={s.tag}>Who they are to somebody</span>
      {ties.length > 0 && (
        <ul className={s.ties} data-testid="npc-ties">
          {ties.map((t) => (
            <li key={`${t.other.id}:${t.as}:${String(t.theirs)}`} className={s.tie}>
              <span>
                {t.theirs ? `${t.other.name} ${t.as} them` : `${t.as} ${t.other.name}`}
              </span>
              {!t.theirs && (
                <button type="button" className={s.drop}
                        aria-label={`Forget that they ${t.as} ${t.other.name}`}
                        onClick={() => set("ties",
                          (draft.ties ?? []).filter((x) => !(x.to === t.other.id && x.as === t.as)))}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {others.length === 0 ? (
        <p className={s.none}>Write down somebody else first, and they can be tied together.</p>
      ) : (
        <TieAdd others={others} onAdd={(to, as) => set("ties", [...(draft.ties ?? []), { to, as }])} />
      )}
    </div>
  );
}

function TieAdd({ others, onAdd }: {
  others: readonly Npc[];
  onAdd: (to: string, as: string) => void;
}) {
  return (
    <form
      className={s.add}
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const as = String(form.get("as") ?? "").trim();
        const to = String(form.get("to") ?? "");
        if (as !== "" && to !== "") { onAdd(to, as); e.currentTarget.reset(); }
      }}
    >
      <input className={s.text} name="as" placeholder="owes money to" aria-label="How they are tied" />
      <select className={s.text} name="to" aria-label="Who they are tied to">
        {others.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>
      <button type="submit" className={s.tieAdd}>Tie</button>
    </form>
  );
}

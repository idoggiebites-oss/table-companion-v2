import { useState } from "react";
import { parseCoins } from "../../rules/5e/money";
import {
  blankNpc, describeStock, isNamed, stockId, UNLIMITED,
  type Npc, type StockEntry,
} from "./npc";
import s from "./Npcs.module.css";

/**
 * The people in the world, and the one form for all of them.
 *
 * Notes-first, because most NPCs never roll anything: the field a DM
 * actually fills in at eleven at night is "grumpy, owes the party a favour,
 * knows about the bridge", not an armour class. There is no stats editor
 * here at all — V1's own screen never built one either, `stats` stays absent
 * until something writes it, and a field nothing writes is not this form's
 * to invent a UI for.
 *
 * The trader flag is what makes a shelf exist. Stock is typed in by hand —
 * name, price, quantity — rather than picked off the SRD catalogue the way
 * V1's shop did: wiring the whole compendium into this form is a bigger
 * surface than an NPC record calls for, and free text still lets a DM stock
 * the sword they invented last week just as well as a longsword.
 */
export function Npcs({ npcs, onSave, onForget }: {
  npcs: readonly Npc[];
  onSave: (npc: Npc) => void;
  onForget: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Npc | null>(null);
  const [stockName, setStockName] = useState("");
  const [stockPrice, setStockPrice] = useState("");
  const [stockQty, setStockQty] = useState("");

  function addStock() {
    if (draft === null || stockName.trim() === "") return;
    const wanted = Number(stockQty);
    const entry: StockEntry = {
      itemId: stockId(stockName),
      name: stockName.trim(),
      price: parseCoins(stockPrice) ?? 0,
      /* Blank, nonsense or zero all read as endless: a shop with none of a
         thing is a thing not on the shelf, which is what Remove is for. */
      qty: stockQty.trim() !== "" && Number.isFinite(wanted) && wanted > 0
        ? Math.floor(wanted) : UNLIMITED,
    };
    setDraft({ ...draft, stock: [...draft.stock.filter((x) => x.itemId !== entry.itemId), entry] });
    setStockName("");
    setStockPrice("");
    setStockQty("");
  }

  const editing = (id: string) => npcs.some((x) => x.id === id);

  return (
    <section className={s.wrap} aria-label="People">
      <div className={s.head}>
        <h2 className={s.title}>People</h2>
        <button
          type="button" className={s.new}
          onClick={() => setDraft(draft === null ? blankNpc(`npc${Date.now().toString(36)}`) : null)}
        >
          {draft === null ? "Add someone" : "Cancel"}
        </button>
      </div>

      {npcs.length === 0 && draft === null && (
        <p className={s.empty} data-testid="people-empty">
          Most people the party meets never roll anything. Write down what
          they are and what the table knows; stats are there for the one who
          turns out to matter.
        </p>
      )}

      {npcs.length > 0 && (
        <ul className={s.list} data-testid="people">
          {npcs.map((p) => (
            <li key={p.id} className={s.card} data-testid="person-card">
              <span className={s.cardHead}>
                <span className={s.name}>
                  {p.name}{p.role.trim() !== "" ? ` · ${p.role}` : ""}
                </span>
                <span className={s.meta}>
                  {p.trader
                    ? `Trades · ${String(p.stock.length)} item${p.stock.length === 1 ? "" : "s"}`
                    : "Doesn't trade"}
                </span>
              </span>
              <span className={s.actions}>
                <button
                  type="button" className={s.edit}
                  aria-label={`Edit ${p.name}`} onClick={() => setDraft(p)}
                >
                  Edit
                </button>
                <button
                  type="button" className={s.forget}
                  aria-label={`Forget ${p.name}`} onClick={() => onForget(p.id)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {draft !== null && (
        <div className={s.draft} data-testid="person-draft">
          <label className={s.field}>
            {/* No `aria-label` on any of the three fields below.
                A visible label already names these, and an `aria-label` would OVERRIDE it
                — a screen reader would announce "NPC role" while the screen reads "What
                they are". The stock inputs below keep theirs because a placeholder is
                not a label. */}
            <span className={s.tag}>Name</span>
            <input
              className={s.text} value={draft.name}
              placeholder="Halbrek the Fence"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>

          <label className={s.field}>
            <span className={s.tag}>What they are</span>
            <input
              className={s.text} value={draft.role}
              placeholder="shopkeeper"
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            />
          </label>

          <label className={s.field}>
            <span className={s.tag}>What the party knows</span>
            <textarea
              className={s.note} rows={3}
              placeholder="What the party knows, what they want, how they talk."
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>

          <button
            type="button"
            className={draft.trader ? `${s.chip} ${s.on}` : s.chip}
            aria-pressed={draft.trader}
            onClick={() => setDraft({ ...draft, trader: !draft.trader })}
          >
            Trades with the party
          </button>

          {draft.trader && (
            <div className={s.stock} data-testid="stock">
              <span className={s.tag}>Stock</span>
              {draft.stock.map((entry) => (
                <div className={s.stockRow} key={entry.itemId}>
                  <span className={s.stockName}>{entry.name}</span>
                  <span className={s.stockMeta}>{describeStock(entry)}</span>
                  <button
                    type="button" className={s.remove}
                    aria-label={`Remove ${entry.name} from stock`}
                    onClick={() => setDraft({
                      ...draft, stock: draft.stock.filter((x) => x.itemId !== entry.itemId),
                    })}
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className={s.stockAdd}>
                <input
                  className={s.stockInput} value={stockName} aria-label="Item name"
                  placeholder="longsword, potion…"
                  onChange={(e) => setStockName(e.target.value)}
                />
                <input
                  className={s.stockInput} value={stockPrice} aria-label="Asking price"
                  placeholder="15 gp"
                  onChange={(e) => setStockPrice(e.target.value)}
                />
                {/* Blank is endless, which is right for rope and wrong for
                    the only breastplate in the village. */}
                <input
                  type="number" min={1} className={s.stockInput} value={stockQty}
                  aria-label="How many" placeholder="any"
                  onChange={(e) => setStockQty(e.target.value)}
                />
                <button
                  type="button" className={s.add} disabled={stockName.trim() === ""}
                  onClick={addStock}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <span className={s.row}>
            <button
              type="button" className={s.keep} disabled={!isNamed(draft)}
              onClick={() => { onSave(draft); setDraft(null); }}
            >
              {editing(draft.id) ? "Save changes" : "Save"}
            </button>
            {editing(draft.id) && (
              <button
                type="button" className={s.throw}
                aria-label={`Forget ${draft.name}`}
                onClick={() => { onForget(draft.id); setDraft(null); }}
              >
                Forget them
              </button>
            )}
          </span>
        </div>
      )}
    </section>
  );
}

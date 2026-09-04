import { useState } from "react";
import { DISCLOSURE, type Act, type Combatant as Row } from "./fight";
import { hpOf } from "./disclosure";
import { CONDITIONS, conditionById } from "../../rules/5e/conditions";
import s from "./Combatant.module.css";

/** How much of this one the table can see, and a way off the table. */
export function Staged({ c, onAct, now }: {
  c: Row; onAct: (a: Act) => void; now: boolean;
}) {
  const at = hpOf(c);
  const [picking, setPicking] = useState(false);
  return (
    <li className={`${s.row} ${now ? s.now : ""}`} data-testid="staged-row"
        aria-current={now ? "true" : undefined}>
      <span className={s.rowHead}>
        <span className={s.rowName}>{c.name}</span>
        {/*
          * Null until rolled, and shown as blank rather than 0 — "has not
          * rolled" and "rolled badly" are different facts, and a 0 in the box
          * would assert the second.
          */}
        <label className={s.init}>
        <span className={s.tag}>init</span>
        <input
          className={s.initBox}
          type="number"
          inputMode="numeric"
          value={c.initiative ?? ""}
          placeholder="—"
          aria-label={`Initiative for ${c.name}`}
          data-testid="initiative"
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === "") return;
            onAct({ act: "roll", id: c.id, value: Number(v) });
          }}
        />
        </label>
        {at !== null && (
          /* The DM's own row always reads the numbers. What a PLAYER is shown
             is `healthShown`, and it is a word until the rung says exact. */
          <span className={s.rowNote}>
            AC {c.source.kind === "creature" ? c.source.ac : "—"} · {at.hp}/{at.max} hp
          </span>
        )}
      </span>
      {/*
        * A ladder drawn as a ladder. The DM slides it up as the fight
        * develops, and the order is the information — a dropdown would hide
        * which way is "more".
        */}
      <span className={s.ladder} role="radiogroup" aria-label={`What the table sees of ${c.name}`}>
        {DISCLOSURE.map((step) => (
          <button key={step} type="button" role="radio" aria-checked={c.disclosure === step}
                  className={`${s.step} ${c.disclosure === step ? s.at : ""}`}
                  data-testid={`step-${step}`}
                  onClick={() => onAct({ act: "disclose", id: c.id, to: step })}>
            {step}
          </button>
        ))}
      </span>
      {at !== null && (
        /* Damage and healing are the same gesture with the sign flipped, which
           is why there is one act behind both. Typed rather than stepped: at a
           table the number is already known and said out loud. */
        <form className={s.hurt} onSubmit={(e) => {
          e.preventDefault();
          const field = new FormData(e.currentTarget).get("amount");
          const n = Number(String(field ?? "").trim());
          if (!Number.isFinite(n) || n === 0) return;
          onAct({ act: "hurt", id: c.id, amount: n });
          e.currentTarget.reset();
        }}>
          <input className={s.amount} name="amount" type="number" inputMode="numeric"
                 placeholder="±" aria-label={`Damage ${c.name}, or heal with a minus`} />
          <button type="submit" className={s.apply} aria-label={`Apply to ${c.name}`}>Hit</button>
        </form>
      )}
      {c.source.kind === "creature" && (
        <span className={s.conds}>
          {c.conditions.map((id) => (
            /* The name, and what it DOES, because "poisoned" teaches nothing
               and "disadvantage on attacks" teaches the rule while it is
               being used. Tap to take it off. */
            <button key={id} type="button" className={s.cond}
                    title={conditionById(id)?.effect}
                    aria-label={`Clear ${conditionById(id)?.name ?? id} from ${c.name}`}
                    onClick={() => onAct({ act: "condition", id: c.id, condition: id, on: false })}>
              {conditionById(id)?.name ?? id}
            </button>
          ))}
          <button type="button" className={s.addCond} aria-label={`Add a condition to ${c.name}`}
                  aria-expanded={picking} onClick={() => setPicking((p) => !p)}>+</button>
        </span>
      )}
      {picking && (
        <span className={s.picker} role="group" aria-label={`Conditions for ${c.name}`}>
          {CONDITIONS.filter((x) => !c.conditions.includes(x.id)).map((x) => (
            <button key={x.id} type="button" className={s.cond} title={x.effect}
                    onClick={() => {
                      onAct({ act: "condition", id: c.id, condition: x.id, on: true });
                      setPicking(false);
                    }}>{x.name}</button>
          ))}
        </span>
      )}
      <button type="button" className={s.off} aria-label={`Take ${c.name} off the table`}
              onClick={() => onAct({ act: "unstage", id: c.id })}>×</button>
    </li>
  );
}

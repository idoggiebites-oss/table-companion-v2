import { Shell } from "../../ui/Shell";
import { VAGUE } from "../../rules/5e/vitals";
import { membersIn, type Member } from "./members";
import type { Event } from "../../core/types";
import type { ReactNode } from "react";
import s from "./Party.module.css";

/**
 * The DM's home: everyone the table is looking after, at a glance.
 *
 * V1's Party is the model, and so is its reason for existing — the DM narrates
 * "you take twelve" and types it while still talking, rather than waiting for
 * a player to find the right field mid-combat. Speed behind the screen.
 *
 * This is the reading half. Nothing here writes yet: damage from the DM's side
 * is a claim with a verdict (DM.md law 2), and that arrives with the fight.
 *
 * Tablet-first, per DESIGN.md — the rows sit in a grid that finds as many
 * columns as the width allows and collapses to one on a phone, because the DM
 * side has to work on both without being two designs.
 */
export function Party({ events, nav, onOpen, onHit }: {
  events: readonly Event[];
  nav?: ReactNode;
  /** Sitting in somebody, to read their whole sheet. */
  onOpen?: (id: string) => void;
  /**
   * A hit, applied from here.
   *
   * V1's default, and its reason: the DM applies damage and healing to anyone,
   * because waiting for a player to find the right field mid-combat is slower
   * than the DM typing it while narrating. It is only acceptable because every
   * change is attributed and reversible — see `permissions.ts`.
   */
  onHit?: (character: string, amount: number) => void;
}) {
  const party = membersIn(events);
  return (
    <Shell title="The party" below={nav}>
      {party.length === 0 ? (
        /* Not "no characters": say what to do about it. */
        <p className={s.empty} data-testid="party-empty">
          Nobody has made a character yet. They will appear here as they do.
        </p>
      ) : (
        <div className={s.grid} data-testid="party">
          {party.map((m) => <Row key={m.id} m={m} {...(onHit === undefined ? {} : { onHit })} {...(onOpen === undefined ? {} : { onOpen })} />)}
        </div>
      )}
    </Shell>
  );
}

function Row({ m, onOpen, onHit }: {
  m: Member; onOpen?: (id: string) => void;
  onHit?: (character: string, amount: number) => void;
}) {
  /* A bar AND the number. The vague word is what a PLAYER gets about a
     creature; the DM looking after this party gets the real figure. */
  const part = m.max > 0 ? Math.max(0, Math.min(1, m.hp / m.max)) : 0;
  return (
    <div className={s.wrap} data-testid="party-row-wrap">
    <button type="button" className={s.row} data-step={m.step} data-testid="party-row"
            onClick={() => onOpen?.(m.id)}>
      <span className={s.head}>
        <span className={s.name}>{m.name}</span>
        <span className={s.ac} title="Armour class">{m.ac}</span>
      </span>
      <span className={s.kind}>{m.kind}</span>

      <span className={s.hp}>
        <span className={s.bar} aria-hidden="true">
          <span className={s.fill} style={{ inlineSize: `${String(part * 100)}%` }} />
        </span>
        <span className={s.count}>
          {m.hp} / {m.max}{m.temp > 0 && <span className={s.temp}> +{m.temp}</span>}
        </span>
      </span>

      {/* The state that matters most, in the word the table uses for it. */}
      <span className={s.state}>
        {m.dead ? "Dead" : m.dying ? "Dying" : VAGUE[m.step]}
      </span>

      {m.conditions.length > 0 && (
        <span className={s.tags}>
          {m.conditions.map((c) => <span key={c} className={s.tag}>{c}</span>)}
        </span>
      )}

      {m.waiting.length > 0 && (
        <span className={s.owed} data-testid="party-owed">{m.waiting[0]}</span>
      )}
    </button>
    {onHit !== undefined && (
      /* Beside the row, not inside it: the row is one big button and nesting
         a control in a button is neither valid nor tappable. */
      <form className={s.hit} onSubmit={(e) => {
        e.preventDefault();
        const field = new FormData(e.currentTarget).get("amount");
        const n = Number(String(field ?? "").trim());
        if (!Number.isFinite(n) || n === 0) return;
        onHit(m.id, n);
        e.currentTarget.reset();
      }}>
        <input className={s.amount} name="amount" type="number" inputMode="numeric"
               placeholder="±" aria-label={`Damage ${m.name}, or heal with a minus`} />
        <button type="submit" className={s.apply} aria-label={`Apply to ${m.name}`}>Hit</button>
      </form>
    )}
    </div>
  );
}

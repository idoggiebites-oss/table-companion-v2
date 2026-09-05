import { useState } from "react";
import { Shell } from "../../ui/Shell";
import { AskFor } from "./AskFor";
import { askedFrom, addressees, type Ask } from "../room/ask";
import { progressFrom, levelsOwed, xpOf, type XpAct } from "./xp";
import { holdingsFrom, purseOf, type HoldAct } from "../room/holdings";
import { formatCoins, parseCoins } from "../../rules/5e/money";
import { Grant } from "./Grant";
import type { Item } from "../../rules/5e/items";
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
export function Party({ events, nav, who, onOpen, onHit, onAsk, onAward, onHold, catalogue = [] }: {
  events: readonly Event[];
  nav?: ReactNode;
  /**
   * The seat control, in the DM's header.
   *
   * It used to live on the Characters screen alone, and Task 26 took that tab
   * off the DM's bar — which left a DM sitting in a character with no way back
   * to their own chair except through a player's screen. Party is where it
   * belongs anyway: this is the DM's home, and it is the screen that absorbed
   * Characters when the two merged.
   */
  who?: ReactNode;
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
  /** "Everyone roll Perception." See `features/room/ask.ts`. */
  onAsk?: (ask: Omit<Ask, "id">) => void;
  /** Experience, or a level outright. See `features/dm/xp.ts`. */
  onAward?: (act: XpAct) => void;
  /** Coins and things, handed out or taken back. See `room/holdings.ts`. */
  onHold?: (act: HoldAct) => void;
  /** The compendium's items, so a typed "potion of healing" finds a real one. */
  catalogue?: readonly Item[];
}) {
  const party = membersIn(events);
  const [asking, setAsking] = useState(false);
  const asked = askedFrom(events);
  const progress = progressFrom(events);
  const holdings = holdingsFrom(events);
  const ids = party.map((m) => m.id);
  return (
    <Shell title="The party" below={nav} trail={who} wide>
      {party.length === 0 ? (
        /* Not "no characters": say what to do about it. */
        <p className={s.empty} data-testid="party-empty">
          Nobody has made a character yet. They will appear here as they do.
        </p>
      ) : (
        <div className={s.grid} data-testid="party">
          {party.map((m) => (
            <Row key={m.id} m={m} xp={xpOf(progress, m.id)}
                 owed={levelsOwed(progress, m.id, m.level)}
                 purse={purseOf(holdings, m.id)}
                 {...(onHold === undefined ? {} : { onHold })} catalogue={catalogue}
                 {...(onHit === undefined ? {} : { onHit })}
                 {...(onOpen === undefined ? {} : { onOpen })} />
          ))}
        </div>
      )}

      {/*
        * Asking is the DM's, and it lives here because this is the screen with
        * the table on it — choosing who rolls is choosing among these faces.
        */}
      {onAsk !== undefined && party.length > 0 && (
        asking ? (
          <AskFor party={party} onAsk={onAsk} onClose={() => setAsking(false)} />
        ) : (
          <button type="button" className={s.ask} data-testid="ask-open"
                  onClick={() => setAsking(true)}>Ask for a roll</button>
        )
      )}

      {/*
        * Experience, or a level outright — Arturo's "exp or milestone".
        *
        * Here because this is the screen with the table on it, and because
        * `encounter.ts` has computed what a fight is worth since Task 31 with
        * nobody to give it to. The DM says a level is owed; the PLAYER takes
        * it, because which subclass is theirs to choose.
        */}
      {onAward !== undefined && party.length > 0 && (
        <form className={s.award} data-testid="award"
              onSubmit={(e) => {
                e.preventDefault();
                const field = new FormData(e.currentTarget).get("xp");
                const amount = Number(String(field ?? "").trim());
                if (!Number.isFinite(amount) || amount === 0) return;
                onAward({ act: "award", amount, to: ids });
                e.currentTarget.reset();
              }}>
          <input className={s.xp} name="xp" type="number" inputMode="numeric"
                 placeholder="XP" data-testid="award-xp"
                 aria-label="Experience for the party, split evenly" />
          <button type="submit" className={s.awardGo} data-testid="award-send">Award</button>
          <button type="button" className={s.awardGo} data-testid="award-milestone"
                  onClick={() => onAward({ act: "milestone", to: ids })}>
            Milestone
          </button>
        </form>
      )}

      {/* What came back, and who is still being waited on — the whole reason
          an ask is a thing in the log rather than a sentence said aloud. */}
      {asked.open.map((ask) => (
        <p key={ask.id} className={s.answers} data-testid="ask-answers">
          <span className={s.askName}>{ask.name}</span>
          {addressees(ask, ids).map((id) => {
            const a = asked.answers[ask.id]?.[id];
            const name = party.find((m) => m.id === id)?.name ?? "Someone";
            return (
              <span key={id} className={s.answer}>
                {name} {a === undefined ? "…" : a === null ? "passed" : String(a)}
              </span>
            );
          })}
        </p>
      ))}
    </Shell>
  );
}

function Row({ m, xp, owed, purse, catalogue = [], onOpen, onHit, onHold }: {
  m: Member; xp: number; owed: number; purse: number;
  /** For reading "2 potions of healing" against real items — see `Grant`. */
  catalogue?: readonly Item[];
  onOpen?: (id: string) => void;
  onHit?: (character: string, amount: number) => void;
  onHold?: (act: HoldAct) => void;
}) {
  const [handing, setHanding] = useState(false);
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
      <span className={s.kind}>
        {m.kind}
        {/* Only where there is one. A milestone table counts no experience,
            and a number nobody is counting is worse than no number. */}
        {xp > 0 && <span className={s.xpHeld}> · {xp.toLocaleString()} XP</span>}
        {owed > 0 && <span className={s.owed}>level waiting</span>}
        {purse > 0 && <span className={s.xpHeld}> · {formatCoins(purse)}</span>}
      </span>

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
    {onHold !== undefined && (
      handing
        ? <Grant who={m.id} catalogue={catalogue} onHold={onHold} onClose={() => setHanding(false)} />
        : (
          <button type="button" className={s.hand} data-testid="grant-open"
                  aria-label={`Hand something to ${m.name}`}
                  onClick={() => setHanding(true)}>Hand over</button>
        )
    )}
    </div>
  );
}

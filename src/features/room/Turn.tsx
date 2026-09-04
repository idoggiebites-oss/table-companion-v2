import { Icon, type IconName } from "../../ui/Icon";
import { STANDARD_ACTIONS, blockedBecause } from "../../rules/5e/actions";
import { ECONOMY, type Economy, type EconomyKind } from "../dm/economy";
import s from "./Turn.module.css";

/**
 * A turn, as the person taking it sees it.
 *
 * V1's `actions.ts` in the shape V2 can draw: *"a new player's turn is not
 * limited by the rules, it is limited by not knowing what is on the menu."*
 * The player's fight screen could swing an attack and name nothing else — no
 * Dodge, no Disengage, no way to see that a bonus action was still in hand.
 *
 * Two rules travel with it. **Every option is present**, including the ones
 * this character cannot take right now, because a menu that hides Dodge until
 * you qualify for it never teaches Dodge. They are shown blocked, with the
 * reason. And **nothing here rolls**: taking one spends the pip and says what
 * to tell the table.
 *
 * The icons are V2's, not V1's — a mapping is a fact about this app's drawing
 * rather than about the game, which is why `rules/5e/actions.ts` carries no
 * icon at all. Every one keeps its name underneath: V1's rule, and its reason
 * is that *"an unlabelled icon is its own kind of unreadable."*
 */
const MARK: Readonly<Record<string, IconName>> = {
  attack: "sword", cast: "spark", dodge: "shield", disengage: "slip",
  dash: "dash", hide: "eye", help: "person", shove: "fist",
  ready: "clock", search: "search", use: "flask", offhand: "dagger",
};

export function Turn({ spent, armed, caster, onTake }: {
  spent: Economy;
  /** Something in hand — half the menu is about a weapon. */
  armed: boolean;
  caster: boolean;
  onTake: (cost: EconomyKind) => void;
}) {
  return (
    <section className={s.wrap} aria-label="Your turn" data-testid="turn">
      {/*
        * What is left, before what to do with it. Three pips rather than a
        * sentence: this is read at a glance, mid-conversation, by somebody
        * whose turn it already is.
        */}
      <div className={s.pips} role="group" aria-label="What your turn still holds">
        {ECONOMY.map((kind) => (
          <span key={kind} data-testid={`pip-${kind}`}
                className={spent[kind] ? `${s.pip} ${s.gone}` : s.pip}>
            {kind}{spent[kind] ? " spent" : ""}
          </span>
        ))}
      </div>

      <ul className={s.grid}>
        {STANDARD_ACTIONS.map((a) => {
          const why = blockedBecause(a, spent, armed, caster);
          return (
            <li key={a.id}>
              <button
                type="button" className={why === null ? s.tile : `${s.tile} ${s.blocked}`}
                data-testid="turn-option" disabled={why !== null}
                aria-label={why === null ? `${a.name}: ${a.what}` : `${a.name}: ${why}`}
                onClick={() => { onTake(a.cost); }}
              >
                <span className={s.mark} aria-hidden="true">
                  <Icon name={MARK[a.id] ?? "die"} size={20} />
                </span>
                <span className={s.name}>{a.name}</span>
                <span className={s.cost}>{a.cost}</span>
                {/* Consequence, not mechanism — "attacks against you have
                    disadvantage" teaches; "you take the Dodge action" does not. */}
                <span className={s.what}>{why ?? a.what}</span>
                {why === null && a.then !== undefined && (
                  <span className={s.then}>{a.then}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

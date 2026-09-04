import { useState } from "react";
import { Shell } from "../../ui/Shell";
import { orderOf, activeOf, type Fight as State, type Act } from "../dm/fight";
import { visibleTo, healthShown } from "../dm/disclosure";
import { resolveAttack } from "../../rules/5e/attack";
import { proficiency } from "../../rules/5e/skills";
import { signed, type Scores } from "../../rules/5e/abilities";
import type { Attack } from "../../rules/5e/attack";
import { Swing } from "../sheet/Swing";
import { Turn } from "./Turn";
import { spentBy } from "../dm/economy";
import type { ReactNode } from "react";
import s from "./Fight.module.css";

/**
 * The fight, from a player's side.
 *
 * V1: this is TWO screens, not one. "Almost all of a fight is spent NOT
 * acting, and the two states want opposite things. Waiting is one enormous
 * number read across the table with nothing to tap, because tapping is not
 * what that moment is for. Acting is twenty seconds where it becomes a tool."
 *
 * So the same screen reads completely differently depending on whose go it is,
 * and the difference is deliberate rather than a styling accident.
 *
 * What a player is shown of the other side is the disclosure ladder and
 * nothing else: a hidden creature is not on this list at all, a present one is
 * a name, a vague one is a WORD — "bloodied", never a bar, because a bar is a
 * number wearing a disguise — and only at exact are there figures.
 */
export function Fight({ state, me, attacks, scores, level, conditions = [], caster = false, nav, onAct }: {
  state: State;
  /** This device's combatant id in the fight, if it is in it at all. */
  me: string | null;
  attacks: readonly Attack[];
  scores: Scores;
  level: number;
  /** What is on the person swinging — half of what decides the dice. */
  conditions?: readonly string[];
  /** Whether this character has spells, so the menu does not teach them to a fighter. */
  caster?: boolean;
  nav?: ReactNode;
  onAct: (a: Act) => void;
}) {
  const [swinging, setSwinging] = useState<string | null>(null);
  const order = orderOf(state).filter((c) => visibleTo(false, c));
  const active = activeOf(state);
  const mine = active !== null && active.id === me;
  const prof = proficiency(level);

  /* A hidden creature is not a target, because knowing it is there is the
     thing the ladder is protecting. */
  const targets = order.filter((c) => c.source.kind === "creature");

  if (state.phase !== "active") {
    return (
      <Shell title="The fight" below={nav}>
        <p className={s.quiet} data-testid="no-fight">
          No fight yet. When one starts, this is where it will be.
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="The fight" below={nav}>
      <div className={s.wrap}>
        {/*
          * Whose go it is, and nothing competing with it. When it is not
          * yours this is the whole screen and there is nothing to press —
          * that is the waiting state, and it is most of a fight.
          */}
        <p className={s.round}>Round {state.round}</p>
        <p className={mine ? s.mineNow : s.theirNow} data-testid="whose-turn">
          {/*
            * A hidden combatant is not NAMED here, however loudly it is
            * acting. It is absent from the order below for the same reason,
            * and announcing it in the largest text on the screen would have
            * undone the ladder from the one place nobody thought to check —
            * only a screenshot showed it.
            */}
          {mine ? "Your turn"
            : active === null ? "—"
            : visibleTo(false, active) ? active.name
            : "Someone else"}
        </p>
        {!mine && <p className={s.quiet}>Nothing to do until it comes round.</p>}

        {/*
          * The menu, and only on your own go.
          *
          * V1: "a new player's turn is not limited by the rules, it is limited
          * by not knowing what is on the menu." This screen could swing an
          * attack and name nothing else — a player had no way to learn Dodge
          * or Disengage, and no way to see that their bonus action was still
          * in hand. Off your turn it is not drawn at all, because most of a
          * fight is waiting and the waiting state is deliberately empty.
          */}
        {mine && me !== null && (
          <Turn
            spent={spentBy(state, me)}
            armed={attacks.length > 0}
            caster={caster}
            onTake={(cost) => { onAct({ act: "spend", id: me, kind: cost, on: true }); }}
          />
        )}

        {mine && attacks.length === 0 && (
          <p className={s.quiet} data-testid="nothing-to-swing">
            Nothing on your sheet to swing. Add an attack there and it appears here.
          </p>
        )}

        {mine && attacks.length > 0 && (
          <ul className={s.attacks} data-testid="my-attacks">
            {attacks.map((a) => {
              const r = resolveAttack(a, scores, prof);
              return (
                <li key={a.name} className={s.attack}>
                  <span className={s.name}>{a.name}</span>
                  <span className={s.toHit}>{signed(r.toHit)}</span>
                  <span className={s.dmg}>{r.damage} {r.damageType}</span>
                  {targets.length > 0 && (
                    <button type="button" className={s.swing} aria-label={`Swing ${a.name}`}
                            onClick={() => setSwinging(swinging === a.name ? null : a.name)}>
                      Swing
                    </button>
                  )}
                  {swinging === a.name && (
                    <Swing attack={r} targets={targets} mine={conditions} room={state.room}
                           onCancel={() => setSwinging(null)}
                           onClaim={(targetId, toHit, damage) => {
                             onAct({ act: "claim", claim: {
                               id: `${me ?? ""}-${a.name}-${String(Date.now())}`,
                               who: me ?? "", whoName: "You",
                               targetId, weapon: a.name, toHit, damage, damageType: r.damageType,
                             } });
                             setSwinging(null);
                           }} />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <ol className={s.order} data-testid="order">
          {order.map((c) => {
            const shown = healthShown(false, c);
            return (
              <li key={c.id} className={active?.id === c.id ? s.at : undefined}
                  data-testid="order-row" aria-current={active?.id === c.id ? "true" : undefined}>
                <span className={s.who}>{c.name}</span>
                {/* A word, not a meter — a half-full bar is a number in
                    disguise, and "bloodied" is what the table would say. */}
                {shown.kind === "word" && <span className={s.vague}>{shown.word}</span>}
                {shown.kind === "numbers" && (
                  <span className={s.exact}>{shown.hp}/{shown.max}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Shell>
  );
}

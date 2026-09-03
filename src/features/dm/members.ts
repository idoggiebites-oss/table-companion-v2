import { primary, type Build } from "../creation/model";
import { charactersIn, buildFrom } from "../creation/log";
import { scoresOf } from "../creation/scores";
import { vitalsFrom } from "../sheet/model";
import { waitingOn } from "../sheet/waiting";
import { acFor } from "../../rules/5e/defence";
import { healthStep, type HealthStep } from "../../rules/5e/vitals";
import type { Event } from "../../core/types";

/**
 * One row of the DM's party view.
 *
 * Derived, never stored: the DM's screen is a reading of the same log every
 * other device has. DM.md law 5 — the DM is not a different kind of user, and
 * a party row that held its own copy of anybody's hit points would be a second
 * source of truth for the one number that must never have two.
 */
export type Member = {
  readonly id: string;
  readonly name: string;
  /** "Half-Elf · Bard 3", as a person says it. */
  readonly kind: string;
  readonly hp: number;
  readonly max: number;
  readonly temp: number;
  readonly step: HealthStep;
  readonly ac: number;
  readonly conditions: readonly string[];
  /** Something is owed by this character right now. */
  readonly waiting: readonly string[];
  /* Two states, never one: at zero you are dying and can be brought back; at
     minus your maximum you are dead and cannot. A party row that showed one
     word for both would be the worst thing this screen could get wrong. */
  readonly dying: boolean;
  readonly dead: boolean;
};

const kindOf = (b: Build): string => {
  const ancestry = b.names["ancestry"];
  const klass = b.names["class"] ?? primary(b);
  const level = b.classes.reduce((n, c) => n + c.level, 0);
  return [ancestry, klass === null ? null : `${klass} ${String(level || 1)}`]
    .filter((x): x is string => typeof x === "string" && x !== "")
    .join(" · ");
};

/**
 * Everyone the table is looking after, in the order they were made.
 *
 * `charactersIn` hands them back newest first, which is right for a hub whose
 * job is "the one you are in the middle of" and wrong for a party, where the
 * order should stop moving the moment somebody makes a character mid-session.
 */
export function membersIn(events: readonly Event[]): readonly Member[] {
  return charactersIn(events)
    .slice()
    .reverse()
    .map(({ id }) => {
      const build = buildFrom(events, id);
      const vitals = vitalsFrom(events, id, build);
      const { health } = vitals;
      return {
        id,
        name: build.identity["name"] ?? "Unnamed",
        kind: kindOf(build),
        hp: health.hp,
        max: health.max,
        temp: health.temp,
        step: healthStep(health.hp, health.max),
        ac: acFor(build.worn, scoresOf(build)).value,
        conditions: vitals.conditions,
        waiting: waitingOn(vitals),
        dying: health.dying,
        dead: health.dead,
      };
    });
}

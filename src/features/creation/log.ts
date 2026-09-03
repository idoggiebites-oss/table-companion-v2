import type { Event } from "../../core/types";
import { fold } from "../../core/fold";
import { live } from "../../core/log";
import { characterOf, type CharacterId } from "./choices";
import { CHOICE } from "./model";
import { TAKE } from "../progression/model";
import { reduce, EMPTY, type Build } from "./model";

/**
 * The build of one character. Events carrying another character's id are not
 * skipped by the fold — they are simply not this character's events.
 */
const MINE = (e: Event, character: CharacterId): boolean =>
  (e.kind !== CHOICE && e.kind !== TAKE) || characterOf(e) === character;

export const buildFrom = (events: readonly Event[], character?: CharacterId): Build =>
  fold(character === undefined ? events : events.filter((e) => MINE(e, character)), reduce, EMPTY);

/** Every character this device knows about, most recently started first. */
export function charactersIn(events: readonly Event[]): { id: CharacterId; build: Build }[] {
  const order: CharacterId[] = [];
  for (const e of live(events)) {
    if (e.kind !== CHOICE && e.kind !== TAKE) continue;
    const id = characterOf(e);
    if (id !== null && !order.includes(id)) order.push(id);
  }
  return order.reverse().map((id) => ({ id, build: buildFrom(events, id) }));
}

import type { Event } from "./types";
import { live } from "./log";

export type Reducer<S> = (state: S, event: Event) => S;

/**
 * State is the replay of the log. There is no other source of truth, and
 * nothing is written to state that did not come through here.
 */
export function fold<S>(events: readonly Event[], reduce: Reducer<S>, initial: S): S {
  let state = initial;
  for (const e of live(events)) state = reduce(state, e);
  return state;
}

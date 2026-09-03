import type { Vitals } from "./model";

/**
 * What is owed right now, in the words a person reads.
 *
 * Lives here rather than inside the sheet because two things need it and they
 * must never disagree: the sheet says it in full, and the tab that leads to
 * the sheet carries a dot when there is any. V1's rule — a tab can go out of
 * sight, and one of the things that can go out of sight is a concentration
 * save owed RIGHT NOW.
 */
export function waitingOn(vitals: Vitals): readonly string[] {
  const { health, deaths } = vitals;
  const out: string[] = [];
  if (health.dying) {
    out.push(`Death saves: ${deaths.successes} of 3 made, ${deaths.failures} of 3 failed.`);
  }
  if (vitals.concentrating !== null && health.hp < health.max) {
    out.push(`Concentrating on ${vitals.concentrating} — a save is owed after damage.`);
  }
  if (vitals.exhaustion >= 5) out.push(`Exhaustion ${vitals.exhaustion}. Six is death.`);
  return out;
}

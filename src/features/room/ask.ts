import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import type { Ability } from "../../rules/5e/abilities";

export const ASK = "room.ask";

/**
 * The DM asks; the table answers.
 *
 * **The claim seam, turned round.** V2's claim runs player → DM: somebody says
 * "I hit AC 15" and the DM rules on it. Every roll the DM calls for runs the
 * other way and there was nothing for it to run along — `nudge.ts` has said so
 * in writing since it was built: *"the DM has asked YOU for a roll — needs the
 * claim seam to run the other way and is not built."*
 *
 * Same shape as a claim, deliberately. An ask is appended, it is answered, and
 * the answer is a TOTAL rather than a die — because *"the number still comes
 * from a person throwing something"* is the one rule this app does not bend,
 * and it is why `claim` carries a total too.
 *
 * Passing is an answer. A player who cannot roll, or will not, has still told
 * the table something, and the DM waiting on a name needs to know the
 * difference between "no" and "not yet".
 */
/**
 * A check or a saving throw.
 *
 * Not all rolls are ability checks, and the difference is not cosmetic: a
 * Dexterity SAVE and a Dexterity CHECK use the same modifier and a different
 * proficiency — a rogue is proficient in Dexterity saves whether or not they
 * have Acrobatics. Absent means a check, so asks made before this folds
 * forward as what they were.
 */
export type AskKind = "check" | "save";

export type Ask = {
  readonly id: string;
  readonly kind?: AskKind;
  /** Character ids. Empty means the whole table — see `askedOf`. */
  readonly who: readonly string[];
  /** The bare noun: "Perception", "Dexterity". The screen adds "Check" or
      "Saving Throw" from `kind`, so the log and the DM keep the short one. */
  readonly name: string;
  readonly ability: Ability;
  /** The skill's id, when it is a skill rather than a bare ability. */
  readonly skill?: string;
  /**
   * The number to beat, if the DM chose to say it.
   *
   * Optional and often absent on purpose: a DM who announces the DC has told
   * the table how hard it is before anybody commits, which is sometimes the
   * point and sometimes exactly not.
   */
  readonly dc?: number;
  /** "You scan the ruins for hidden details." */
  readonly flavour?: string;
};

export type AskAct =
  | { readonly act: "ask"; readonly ask: Ask }
  | { readonly act: "answer"; readonly ask: string; readonly who: string; readonly total: number }
  /** Dismissed. An answer, not an absence. */
  | { readonly act: "pass"; readonly ask: string; readonly who: string }
  /** The DM has seen enough. Closing does not delete the answers. */
  | { readonly act: "close"; readonly ask: string };

/** A total, or null for a pass. Absent means still waiting. */
export type Answer = number | null;

export type Asked = {
  readonly open: readonly Ask[];
  readonly answers: Readonly<Record<string, Readonly<Record<string, Answer>>>>;
};

export const NOTHING_ASKED: Asked = { open: [], answers: {} };

const asAct = (e: Event): AskAct | null =>
  e.kind === ASK ? (e.data as unknown as AskAct) : null;

function reduce(s: Asked, e: Event): Asked {
  const a = asAct(e);
  if (a === null) return s;
  switch (a.act) {
    case "ask":
      /* Same id replaces: editing an ask is not asking twice. */
      return { ...s, open: [...s.open.filter((x) => x.id !== a.ask.id), a.ask] };
    case "answer":
      return { ...s, answers: {
        ...s.answers, [a.ask]: { ...s.answers[a.ask], [a.who]: a.total },
      } };
    case "pass":
      return { ...s, answers: {
        ...s.answers, [a.ask]: { ...s.answers[a.ask], [a.who]: null },
      } };
    case "close":
      return { ...s, open: s.open.filter((x) => x.id !== a.ask) };
  }
}

export const askedFrom = (events: readonly Event[]): Asked =>
  fold(events, reduce, NOTHING_ASKED);

/** Everyone this ask is addressed to, given who is at the table. */
export const addressees = (ask: Ask, party: readonly string[]): readonly string[] =>
  ask.who.length === 0 ? party : ask.who;

/**
 * The ask this character still owes an answer to, or nothing.
 *
 * The OLDEST first, because a queue is answered in the order it arrived — the
 * same rule the claims queue follows. One at a time: two modals stacked over a
 * character sheet is a screen nobody can act on.
 */
export function openFor(s: Asked, character: string, party: readonly string[]): Ask | null {
  for (const ask of s.open) {
    if (!addressees(ask, party).includes(character)) continue;
    if (s.answers[ask.id]?.[character] !== undefined) continue;
    return ask;
  }
  return null;
}

/** Who has not answered yet — what the DM is actually waiting on. */
export const waitingOn = (s: Asked, ask: Ask, party: readonly string[]): readonly string[] =>
  addressees(ask, party).filter((who) => s.answers[ask.id]?.[who] === undefined);

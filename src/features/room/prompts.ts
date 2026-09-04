import { andList, capital, spelled } from "./recap";
import type { Fight } from "../dm/fight";
import type { Member } from "../dm/members";
import type { Vitals } from "../sheet/model";
import { waitingOn } from "../sheet/waiting";

/**
 * What to do about it.
 *
 * The recap says what happened and stops there. The two questions arrive
 * together though: a table that has just read the night back is exactly the
 * table about to ask what it changed on their sheet — and the DM reading the
 * same night is asking it from the other side of the screen, where it is
 * called "what do I prepare for next time".
 *
 * So: a short list, each one a fact and a screen that answers it. Three rules
 * decide what belongs, all V1's.
 *
 * **It has to be TRUE from the log** rather than inferred from what a session
 * usually means. "You are on 7 of 24" is a fact; "you had a rough night" is a
 * story, and the story belongs to the people who were there — the same line
 * `recap.ts` draws.
 *
 * **Something has to be DOABLE about it**, on a screen this carries the way
 * to. A prompt with nowhere to go is a complaint.
 *
 * **And nothing moves anybody on its own.** Every one of these is a thing to
 * press, never a redirect.
 *
 * ## What V1 prompts and this cannot
 *
 * V1's list is longer because V1's log is. Named rather than approximated:
 *
 *   - **A level waiting to be taken.** V1 awards experience and computes what
 *     it owes. V2 awards none, so nothing is ever owed, so the prompt would be
 *     permanently silent or permanently wrong.
 *   - **Never used, never cast.** These read `resourceSpent` and `spellCast`.
 *     V2 records neither, and "you have never cast this" from an app that
 *     cannot see casting is the app being confidently wrong about the half of
 *     a sheet somebody was actually using all night.
 *   - **Encounters the party has outgrown.** The bands are Dungeon Master's
 *     Guide content; V2's `non-srd.ts` carries point-buy and not the encounter
 *     budget, so there is nothing to measure "trivial" against.
 */

/** The screens a prompt can send someone to. Tab ids, from `tabs.ts`. */
export type PromptTab = "sheet" | "party" | "prep" | "fight";

export type Prompt = {
  /** Stable, so a test can name one and the card can key on it. */
  readonly id: string;
  /** One sentence, and every number in it comes from the log. */
  readonly text: string;
  readonly go: PromptTab;
  /** What that screen is called, in the words the tab bar uses. */
  readonly where: string;
};

const WHERE: Readonly<Record<PromptTab, string>> = {
  sheet: "Your sheet",
  party: "The party",
  prep: "Prep",
  fight: "The fight",
};

const prompt = (id: string, text: string, go: PromptTab): Prompt =>
  ({ id, text, go, where: WHERE[go] });

/**
 * The prompts this seat can act on, right now.
 *
 * `tabs` is the filter and it is the whole of V1's `PROMPT_TABS` rule: a
 * prompt pointing at a screen this seat does not have is worse than no prompt
 * at all — it is the app offering something and then not having it. A player
 * has no Prep; a Fight tab appears only once a fight is running.
 */
export function promptsFor({ dm, tabs, fight, party = [], vitals = null, scenes = 0, encounters = 0 }: {
  dm: boolean;
  /** Tab ids that exist for this seat right now. See `tabsFor`. */
  tabs: readonly string[];
  fight: Fight;
  party?: readonly Member[];
  vitals?: Vitals | null;
  scenes?: number;
  encounters?: number;
}): readonly Prompt[] {
  const out = dm ? forDm(fight, party, scenes, encounters) : forPlayer(vitals);
  return out.filter((p) => tabs.includes(p.go));
}

/**
 * In the order VISION law 7 asks for: what is waiting on you, then what is
 * true right now.
 */
function forPlayer(vitals: Vitals | null): Prompt[] {
  if (vitals === null) return [];
  const out: Prompt[] = [];

  /* What is owed RIGHT NOW — a death save, a concentration check, exhaustion
     at five. `waitingOn` already writes these in the words a person reads, and
     a second phrasing here would be a second thing to keep in agreement. */
  const owed = waitingOn(vitals);
  for (const [i, line] of owed.entries()) out.push(prompt(`waiting-${String(i)}`, line, "sheet"));

  /*
   * Not for the dead. The recap has already said they did not get back up,
   * and "you are on 0 of 24" underneath it is the app telling somebody the
   * worst thing that happened to them twice.
   */
  const { health } = vitals;
  if (!health.dead && health.hp < health.max) {
    out.push(prompt("still-hurt",
      `You are on ${String(health.hp)} of ${String(health.max)} hit points.`, "sheet"));
  }
  return out;
}

/** The same question in the DM's voice: what is unfinished, and what is not ready. */
function forDm(
  fight: Fight, party: readonly Member[], scenes: number, encounters: number,
): Prompt[] {
  const out: Prompt[] = [];

  if (fight.phase === "active") {
    out.push(prompt("fight-open",
      `A fight is still running — round ${String(fight.round)}.`, "fight"));
  }

  /* Down is not the same as dead, and the party screen is where both are
     answered. Named, because "somebody is down" makes the DM look for who. */
  const down = party.filter((m) => m.dying || m.dead);
  if (down.length > 0) {
    out.push(prompt("down",
      `${andList(down.map((m) => m.name))} ${down.length === 1 ? "is" : "are"} still down.`,
      "party"));
  }

  const owed = party.filter((m) => !m.dying && !m.dead && m.waiting.length > 0);
  if (owed.length > 0) {
    out.push(prompt("owed",
      `${andList(owed.map((m) => m.name))} ${owed.length === 1 ? "has" : "have"} something owed.`,
      "party"));
  }

  if (scenes === 0 && encounters === 0) {
    out.push(prompt("nothing-prepared", "Nothing is prepared: no places, no encounters.", "prep"));
  } else if (scenes === 0 && encounters > 0) {
    /* An encounter is a roster; a place is where it happens. A table with the
       second and not the first has the fight and not the night. */
    out.push(prompt("no-places",
      `${capital(spelled(encounters, "encounter"))} kept, and nowhere to put ${
        encounters === 1 ? "it" : "them"}.`, "prep"));
  }

  return out;
}

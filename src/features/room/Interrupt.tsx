import { RollRequest } from "./RollRequest";
import { askedFrom, openFor, ASK } from "./ask";
import { buildFrom, charactersIn } from "../creation/log";
import { scoresOf, savesOf } from "../creation/scores";
import { SKILLS } from "../../rules/5e/skills";
import type { Event } from "../../core/types";

/**
 * The one thing allowed to arrive over whatever a player is looking at.
 *
 * `nudge.ts` names three moments worth interrupting somebody for and this is
 * the third — *"the DM has asked YOU for a roll"* — which it also recorded as
 * the one that could not be built, because the claim seam only ran the other
 * way. It runs both ways now (`ask.ts`).
 *
 * Rendered beside the tab bar, which is the one thing every screen already
 * draws — so an ask lands on whichever screen the player happens to be on,
 * which is the whole reason it interrupts rather than waiting on a tab. Not on
 * creation or level-up, which draw no bar: interrupting somebody halfway
 * through building a character is not a moment, it is a loss.
 *
 * One at a time, oldest first — `openFor`'s rule. Two of these stacked over a
 * character sheet is a screen nobody can act on.
 */
export function Interrupt({ events, character, dm, record }: {
  events: readonly Event[];
  /** The character this device is sitting in, if any. */
  character: string;
  dm: boolean;
  record: (kind: string, data: Record<string, unknown>) => void;
}) {
  /* The DM is never asked: they are the one asking, and a modal over the
     screen they asked from would be the app interrupting itself. */
  const ask = dm || character === ""
    ? null
    : openFor(askedFrom(events), character, charactersIn(events).map((c) => c.id));

  if (ask === null) return null;

  const build = buildFrom(events, character);
  const skill = SKILLS.find((x) => x.id === ask.skill);
  /* A save and a check share a modifier and not a proficiency: a rogue is
     proficient in Dexterity saves whether or not they have Acrobatics. */
  const proficient = ask.kind === "save"
    ? savesOf(build).includes(ask.ability)
    : skill !== undefined && build.skills.includes(skill.id);

  return (
    <RollRequest
        ask={ask}
        scores={scoresOf(build)}
        level={build.level}
        /* Proficiency is a fact about the character, not about the ask — the
           DM should not have to know who is good at what to call for a roll. */
        proficient={proficient}
        onAnswer={(total) => record(ASK, { act: "answer", ask: ask.id, who: character, total })}
      onPass={() => record(ASK, { act: "pass", ask: ask.id, who: character })}
    />
  );
}

import type { EconomyKind } from "../../features/dm/economy";

/**
 * What you can actually do on your turn.
 *
 * V1's, and its argument is the whole reason it exists: *"a new player's turn
 * is not limited by the rules, it is limited by not knowing what is on the
 * menu. Nobody discovers Dodge by reading a character sheet, and nobody learns
 * why they got hit walking away until somebody explains Disengage. So the menu
 * is the teaching: every option present, what it costs, and one sentence on
 * what it does in play."*
 *
 * The sentences are about CONSEQUENCE rather than mechanism — *"attacks
 * against you have disadvantage until your next turn"* tells a beginner what
 * changes; "you take the Dodge action" tells them nothing.
 *
 * **Nothing here rolls.** Taking an option spends the pip and says what to
 * tell the table; the dice stay on it, which is the one rule this app does not
 * bend.
 *
 * No icon on the model, unlike V1. V1's `StandardAction` carried an
 * `IconName`, which made a rules module import from the UI — and V2's icon set
 * is not V1's, so the mapping is a fact about this app's drawing rather than
 * about the game. `Turn.tsx` holds it.
 */
export type StandardAction = {
  readonly id: string;
  readonly name: string;
  readonly cost: EconomyKind;
  /** One sentence, in play terms. */
  readonly what: string;
  /** What to say or do at the table once it is taken. */
  readonly then?: string;
  /** Shown only when it is likely to be relevant. */
  readonly whenArmed?: boolean;
  /** Only for someone who has spells; the rest should not be taught them. */
  readonly whenCaster?: boolean;
};

export const STANDARD_ACTIONS: readonly StandardAction[] = [
  { id: "attack", name: "Attack", cost: "action", whenArmed: true,
    what: "Swing at something, or shoot it." },
  { id: "cast", name: "Cast a spell", cost: "action", whenCaster: true,
    what: "Most spells cost your action. A few are a bonus action, and the list says which." },
  { id: "dodge", name: "Dodge", cost: "action",
    what: "Attacks against you have disadvantage until your next turn.",
    then: "For when you are hurt and cannot get away." },
  { id: "disengage", name: "Disengage", cost: "action",
    what: "Move away without anyone getting a free swing at you.",
    then: "This is what stops the free hit when you walk off." },
  { id: "dash", name: "Dash", cost: "action",
    what: "Twice the movement this turn." },
  { id: "hide", name: "Hide", cost: "action",
    what: "Roll Stealth. Unseen, your attacks have advantage.",
    then: "The DM will tell you what to beat." },
  { id: "help", name: "Help", cost: "action",
    what: "Give an ally advantage on their next attack or check.",
    then: "Say who you are helping." },
  { id: "shove", name: "Shove", cost: "action",
    what: "Athletics against theirs. Win and they fall prone, or move five feet.",
    then: "Prone is often better than damage — everyone gets advantage on them." },
  { id: "ready", name: "Ready", cost: "action",
    what: "Name a trigger now; it happens later, using your reaction.",
    then: "Say it out loud: “when the goblin comes through the door, I shoot it”." },
  { id: "search", name: "Search", cost: "action",
    what: "Look for something. The DM will ask for a roll." },
  { id: "use", name: "Use an object", cost: "action",
    what: "Drink a potion, pull a lever. Your first interaction each turn is free." },
  { id: "offhand", name: "Off-hand attack", cost: "bonus", whenArmed: true,
    what: "A second swing with a light weapon. No ability modifier to damage." },
];

export const actionsCosting = (cost: EconomyKind): readonly StandardAction[] =>
  STANDARD_ACTIONS.filter((a) => a.cost === cost);

/** Why an option cannot be taken, or null when it can. */
export function blockedBecause(
  action: StandardAction,
  spent: Readonly<Record<EconomyKind, boolean>>,
  armed: boolean,
  caster = false,
): string | null {
  if (action.whenArmed === true && !armed) return "Nothing in your hands — equip a weapon under Gear.";
  if (action.whenCaster === true && !caster) return "You have no spells.";
  if (spent[action.cost]) {
    return action.cost === "action"
      ? "Your action is gone this turn."
      : `Your ${action.cost} is gone this turn.`;
  }
  return null;
}

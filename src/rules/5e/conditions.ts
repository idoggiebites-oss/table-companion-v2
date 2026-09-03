/**
 * The conditions, and what each one actually does to you — said in a sentence,
 * at the moment it applies. "Poisoned" teaches nothing; "disadvantage on
 * attacks and ability checks" teaches the rule while it is being used.
 */
export type Condition = { readonly id: string; readonly name: string; readonly effect: string };

export const CONDITIONS: readonly Condition[] = [
  { id: "blinded", name: "Blinded", effect: "Attacks against you have advantage; yours have disadvantage." },
  { id: "charmed", name: "Charmed", effect: "You cannot attack the charmer." },
  { id: "deafened", name: "Deafened", effect: "You cannot hear, and fail checks that need hearing." },
  { id: "frightened", name: "Frightened", effect: "Disadvantage while the source is in sight; you cannot move closer." },
  { id: "grappled", name: "Grappled", effect: "Your speed is zero." },
  { id: "incapacitated", name: "Incapacitated", effect: "No actions and no reactions." },
  { id: "invisible", name: "Invisible", effect: "Attacks against you have disadvantage; yours have advantage." },
  { id: "paralysed", name: "Paralysed", effect: "Incapacitated, cannot move or speak; hits within five feet are critical." },
  { id: "petrified", name: "Petrified", effect: "Incapacitated and unaware; resistance to all damage." },
  { id: "poisoned", name: "Poisoned", effect: "Disadvantage on attacks and ability checks." },
  { id: "prone", name: "Prone", effect: "Disadvantage on your attacks; attacks within five feet have advantage." },
  { id: "restrained", name: "Restrained", effect: "Speed zero; disadvantage on your attacks and Dexterity saves." },
  { id: "stunned", name: "Stunned", effect: "Incapacitated; you fail Strength and Dexterity saves." },
  { id: "unconscious", name: "Unconscious", effect: "Incapacitated and prone; hits within five feet are critical." },
];

export const conditionById = (id: string): Condition | undefined => CONDITIONS.find((c) => c.id === id);

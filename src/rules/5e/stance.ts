/**
 * Whether you roll one d20, two and take the higher, or two and take the
 * lower — and, more importantly, WHY.
 *
 * Ported from V1's `domain/stance.ts`, whose reasoning is the point: advantage
 * is the most-used mechanic in the game and the one an app is usually quietest
 * about. A table works it out loud, slowly, and often wrong — the conditions
 * are on one person's screen, the rule is in a book, and the person who needs
 * both is the one who has played twice.
 *
 * So it is computed from what the app already knows, and shown as a sentence
 * naming every source. **"Advantage: the goblin is prone" teaches the rule
 * while you use it. "Advantage" alone teaches nothing.**
 *
 * What this deliberately does NOT know: reach, cover and line of sight. Those
 * need positions, and this table keeps its positions on the table. The reasons
 * listed are partial by design and never contradict the DM.
 *
 * Not yet ported, because the things they read do not exist in V2 yet: light
 * and darkvision (no senses on a combatant), the room's own effects (slice 9),
 * and the per-turn tags — helped, dodging, hidden — which belong to the turn
 * economy. Each is listed here so its absence is a known gap rather than a
 * silent one.
 */

export type Stance = "advantage" | "straight" | "disadvantage";

/** One reason, phrased for the person reading it mid-turn. */
export type StanceReason = {
  readonly effect: "advantage" | "disadvantage";
  /** "the goblin is prone", "you are poisoned". */
  readonly because: string;
};

export type Roller = {
  /** How they are referred to: "you", "the goblin". */
  readonly name: string;
  readonly conditions: readonly string[];
};

export type AttackRange = "Melee" | "Ranged";

/**
 * Conditions that hand the ATTACKER advantage when the target has them.
 *
 * Unconscious and paralyzed also make a melee hit an automatic critical, and
 * this app does not say so — it asks for damage and lets the table decide what
 * a crit means, because doubling dice is a table ritual worth keeping.
 *
 * `paralyzed` is spelled with a z because that is the id: the books and this
 * corpus spell it that way, and V2 spelled it `paralysed` until it was fixed.
 * A near-miss here would silently drop the condition from the rule.
 */
const TARGET_GIVES_ADVANTAGE: readonly string[] = [
  "blinded", "paralyzed", "petrified", "restrained", "stunned", "unconscious",
];

/** Conditions that make the ATTACKER roll badly, whoever they swing at. */
const ATTACKER_HAS_DISADVANTAGE: readonly string[] = [
  "blinded", "poisoned", "restrained", "frightened",
];

const THE = (name: string) => (name.toLowerCase() === "you" ? "you are" : `${name} is`);

/** Everything the app can see about how this attack rolls. */
export function stanceFor({ attacker, target, range }: {
  attacker: Roller;
  target: Roller;
  range: AttackRange;
}): { stance: Stance; reasons: readonly StanceReason[] } {
  const reasons: StanceReason[] = [];
  const adv = (because: string) => reasons.push({ effect: "advantage", because });
  const dis = (because: string) => reasons.push({ effect: "disadvantage", because });

  for (const c of TARGET_GIVES_ADVANTAGE) {
    if (target.conditions.includes(c)) adv(`${THE(target.name)} ${c}`);
  }
  for (const c of ATTACKER_HAS_DISADVANTAGE) {
    if (attacker.conditions.includes(c)) dis(`${THE(attacker.name)} ${c}`);
  }

  /* Prone is the one that cuts both ways, and the one people get wrong: easy
     to hit up close, hard to hit from across the room. */
  if (target.conditions.includes("prone")) {
    if (range === "Melee") adv(`${THE(target.name)} prone`);
    else dis(`${THE(target.name)} prone, and you are far away`);
  }
  if (attacker.conditions.includes("prone")) dis(`${THE(attacker.name)} prone`);

  if (target.conditions.includes("invisible")) dis(`you cannot see ${target.name}`);
  if (attacker.conditions.includes("invisible")) adv(`${THE(attacker.name)} unseen`);

  return { stance: combine(reasons), reasons };
}

/**
 * 5e's own rule, and the one nobody at a table believes the first time: **any
 * number of advantages and any number of disadvantages cancel to a straight
 * roll.** Three sources of advantage and one of disadvantage is not "mostly
 * advantage" — it is one d20.
 *
 * Not a tally and not a net. One of each is enough.
 */
export function combine(reasons: readonly StanceReason[]): Stance {
  const up = reasons.some((r) => r.effect === "advantage");
  const down = reasons.some((r) => r.effect === "disadvantage");
  if (up === down) return "straight";
  return up ? "advantage" : "disadvantage";
}

/** What to actually do with the dice, in words anyone can follow. */
export function describeStance(stance: Stance): string {
  switch (stance) {
    case "advantage": return "Roll two d20s and take the higher";
    case "disadvantage": return "Roll two d20s and take the lower";
    case "straight": return "Roll one d20";
  }
}

/**
 * The whole thing as one line: what to roll, and every reason for it.
 *
 * Both halves matter. A player who is told "advantage" learns nothing; one who
 * is told "the goblin is prone" learns the rule while using it — and one who
 * is told both reasons when they cancel learns why the app is not giving them
 * the advantage they were expecting.
 */
export function describeReasons(
  stance: Stance, reasons: readonly StanceReason[],
): string {
  if (reasons.length === 0) return describeStance(stance);
  const because = reasons.map((r) => r.because).join(", and ");
  if (stance === "straight") return `They cancel: ${because}. Roll one d20`;
  return `${stance === "advantage" ? "Advantage" : "Disadvantage"}: ${because}`;
}

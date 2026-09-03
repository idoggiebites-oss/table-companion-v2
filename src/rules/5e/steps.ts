/**
 * Which steps this character has.
 *
 * Not eight, and not fixed. A fighter has no Spells step; a cleric picks a
 * subclass at level 1 and a wizard does not; an elf has a subrace and a human
 * does not; a character joining mid-campaign has levels to place, and may have
 * placed them in more than one class.
 *
 * So a run of progress dots is a lie the moment two characters are compared,
 * and the component takes `(index, steps)` rather than a constant.
 */

export type StepId =
  | "ancestry" | "subrace" | "class" | "level" | "multiclass" | "subclass"
  | "abilities" | "heritage" | "background" | "skills" | "style" | "proficiencies"
  | "equipment" | "spells" | "improvements" | "feat" | "mcskills"
  | "picks" | "features" | "weapons" | "wear" | "carry" | "identity" | "review";

export type Step = {
  readonly id: StepId;
  readonly title: string;
  readonly question: string;
  /** One line under the question. Says what the choice is FOR. */
  readonly sub: string;
};

const STEP: Record<StepId, Omit<Step, "id">> = {
  ancestry: { title: "Ancestry", question: "Choose your ancestry",
    sub: "The foundation of your character." },
  subrace: { title: "Lineage", question: "Which kind?",
    sub: "There is more than one way to be this." },
  class: { title: "Class", question: "Choose your class",
    sub: "Your class defines what you can do." },
  level: { title: "Level", question: "What level are you starting at?",
    sub: "Level one unless the table is already underway." },
  multiclass: { title: "Classes", question: "Where did those levels go?",
    sub: "A character may have levels in more than one class." },
  subclass: { title: "Path", question: "Choose your path",
    sub: "The specialty your class takes." },
  abilities: { title: "Ability Scores", question: "Assign ability scores",
    sub: "Choose how to generate your scores." },
  heritage: { title: "Heritage", question: "What did your ancestry leave to you?",
    sub: "The half the book leaves for you to place." },
  background: { title: "Background", question: "Choose your background",
    sub: "Your past shapes your story." },
  skills: { title: "Skills", question: "Choose your skills",
    sub: "What your character is trained in." },
  style: { title: "Fighting Style", question: "How do you fight?",
    sub: "A specialty, chosen once." },
  picks: { title: "Class Choices", question: "What does your class ask?",
    sub: "Every question it has opened so far." },
  // Recorded, never asked. Kept a step id so the fold can remember it.
  features: { title: "Features", question: "Features", sub: "" },
  proficiencies: { title: "Languages & Tools", question: "What else do you know?",
    sub: "What your ancestry, class and background left you to decide." },
  equipment: { title: "Equipment", question: "Choose starting equipment",
    sub: "One from each line your class offers." },
  spells: { title: "Spells", question: "Choose your spells",
    sub: "Select your starting spells." },
  mcskills: { title: "Second class", question: "What did your second class bring?",
    sub: "A class taken later grants less than one taken first." },
  // Recorded at the table, never asked as a step.
  wear: { title: "Equipment", question: "Equipment", sub: "" },
  carry: { title: "Inventory", question: "Inventory", sub: "" },
  weapons: { title: "Weapons", question: "Which weapons?",
    sub: "Your class left the choice to you." },
  review: { title: "Review", question: "Is this your character?",
    sub: "Everything chosen, and anything still open." },
  feat: { title: "Feat", question: "Choose a feat", sub: "What your ancestry grants." },
  improvements: { title: "Improvements", question: "What have you improved?",
    sub: "Every level you have already passed that granted one." },
  identity: { title: "Identity", question: "Who is your character?",
    sub: "Bring your character to life." },
};

/** One class, and how much of this character it accounts for. */
export type ClassFacts = {
  readonly id: string;
  readonly level: number;
  readonly casterAtFirst: boolean;
  readonly subclassAtLevel: number;
  /** Infinity for the ten classes that never adopt one. */
  readonly styleAtLevel: number;
};

export type StepFacts = {
  readonly race: { readonly id: string; readonly hasSubraces: boolean } | null;
  readonly classes: readonly ClassFacts[];
  /** Total character level, which is the sum of the class levels. */
  readonly level: number;
  /** How many languages and tools are still the person's to choose. */
  readonly picks: number;
  /** How many decisions the ancestry left open — points, skills and a feat. */
  readonly heritage: number;
  /** How many improvements this character has already passed. */
  readonly improvements: number;
  /** Skills owed by classes taken after the first. */
  readonly mcSkills: number;
  /**
   * Class questions with a screen of their own — Metamagic, a Pact Boon.
   *
   * Counted whether or not they are answered. Counting only the UNANSWERED
   * ones made the step disappear the moment it was answered, which shifted
   * every later step down by one and skipped Identity entirely: "a step
   * arrives; it never changes underneath the person answering" holds in the
   * removal direction too.
   */
  readonly classPicks: number;
  /**
   * Weapon categories the chosen equipment lines left open.
   *
   * 18 of the 89 options across the thirteen classes name a category — "any
   * martial weapon" — and a fighter used to walk away carrying the words.
   */
  readonly weapons: number;
};

/**
 * The order is fixed; the membership is not. A step is present because
 * something the person already chose made it relevant.
 */
export function stepsFor(facts: StepFacts): Step[] {
  const ids: StepId[] = ["ancestry"];
  if (facts.race?.hasSubraces === true) ids.push("subrace");
  ids.push("class", "level");
  // Levels only need placing when there is more than one of them.
  if (facts.level > 1) ids.push("multiclass");
  if (facts.classes.some((c) => c.subclassAtLevel <= c.level)) ids.push("subclass");
  ids.push("abilities");
  /* A Half-Elf places two points and picks two skills; a Variant Human places
     two, picks a skill and takes a feat. Most ancestries decide everything
     themselves and are never asked. */
  if (facts.heritage > 0) ids.push("heritage");
  ids.push("background", "skills");
  // A Fighter is asked at 1, a Paladin and Ranger at 2, and nobody else ever.
  if (facts.classes.some((c) => c.styleAtLevel <= c.level)) ids.push("style");
  /*
   * Only when something is actually left to decide. A Dwarf Fighter with a
   * Soldier background is handed every language and tool they get, and a step
   * that says "choose 0 of nothing" is a dead end, not a question.
   */
  if (facts.picks > 0) ids.push("proficiencies");
  ids.push("equipment");
  /* "Any martial weapon" is a decision the equipment line does not settle —
     18 of the 89 options across the thirteen classes name a category, and a
     fighter used to walk away carrying the words rather than a weapon. */
  if (facts.weapons > 0) ids.push("weapons");
  if (facts.classes.some((c) => c.casterAtFirst)) ids.push("spells");
  /* Every improvement already passed. A Fighter joining at 8 has passed 4, 6
     and 8, and V1's own note is that stating the points owed while giving
     nowhere to spend them is the bug. */
  if (facts.improvements > 0) ids.push("improvements");
  /* Three classes out of thirteen grant a skill when taken second. The other
     ten grant armour and weapons, which are recorded rather than chosen. */
  if (facts.mcSkills > 0) ids.push("mcskills");
  /* Metamagic, a Pact Boon, Deft Explorer — every other question the class
     has opened. The subclass has its own step above; this is the rest. */
  if (facts.classPicks > 0) ids.push("picks");
  ids.push("identity", "review");
  return ids.map((id) => ({ id, ...STEP[id] }));
}

export type StepChange = { readonly added: StepId[]; readonly removed: StepId[]; readonly stable: boolean };

/**
 * A step ARRIVES; it never changes underneath the person answering.
 *
 * This returns what changed so a screen can say so rather than silently
 * redrawing, and asserts that nothing already answered moved.
 */
export function diffSteps(before: readonly Step[], after: readonly Step[], answered: readonly StepId[]): StepChange {
  const b = new Set(before.map((s) => s.id));
  const a = new Set(after.map((s) => s.id));
  const added = after.filter((s) => !b.has(s.id)).map((s) => s.id);
  const removed = before.filter((s) => !a.has(s.id)).map((s) => s.id);
  const kept = after.filter((s) => answered.includes(s.id)).map((s) => s.id);
  const wasOrder = before.filter((s) => answered.includes(s.id)).map((s) => s.id);
  const stable = kept.length === wasOrder.length && kept.every((id, i) => id === wasOrder[i]);
  return { added, removed, stable };
}

export function progress(steps: readonly Step[], current: StepId): { index: number; total: number } {
  return { index: Math.max(0, steps.findIndex((s) => s.id === current)), total: steps.length };
}

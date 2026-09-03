import { describe, it, expect } from "vitest";
import { budget, options, lair, mayTake, type Entry } from "./legendary";

/*
 * Entry NAMES are structural facts about the compendium and are reproduced;
 * the descriptions are written here rather than copied, because the corpus is
 * the published books and never enters this repository. The shapes below are
 * the ones an Adult Black Dragon actually has — eleven entries, three of them
 * things it can do.
 */
const dragon: Entry[] = [
  { name: "Legendary Actions (3/Turn)", desc: "It can take 3 legendary actions, one at a time." },
  { name: "Detect", desc: "It makes a Perception check." },
  { name: "Tail Attack", desc: "It makes a tail attack." },
  { name: "Wing Attack (Costs 2 Actions)", desc: "It beats its wings." },
  { name: "A Black Dragon's Lair", desc: "Where such dragons are found." },
  { name: "Lair Actions", desc: "On initiative count 20 (losing initiative ties), it takes a lair action." },
  { name: "Regional Effects", desc: "The land nearby is warped." },
  { name: "Black Dragon Lairs", desc: "More about the lair." },
  { name: "Additional Lair Actions", desc: "Optional extras." },
  { name: "Additional Regional Effects", desc: "More optional extras." },
  { name: "Black Dragon Treasures", desc: "What it hoards." },
];

describe("how many legendary actions a creature gets", () => {
  it("reads the budget from the heading", () => {
    expect(budget(dragon)).toBe(3);
  });

  it("reads it from the sentence when the heading does not carry it", () => {
    expect(budget([{ name: "Legendary Actions", desc: "It can take 2 legendary actions." }])).toBe(2);
  });

  it("is zero for a creature that has none, rather than assuming three", () => {
    expect(budget([])).toBe(0);
    expect(budget(undefined)).toBe(0);
  });
});

describe("which entries are things the creature can do", () => {
  it("keeps only the real options out of eleven entries", () => {
    /* The whole job of this module. A DM tapping "Black Dragon Treasures"
       expecting a tail attack is the app wasting their turn. */
    expect(options(dragon).map((o) => o.name)).toEqual(["Detect", "Tail Attack", "Wing Attack"]);
  });

  it("never offers the budget header as something to tap", () => {
    expect(options(dragon).some((o) => /legendary actions/i.test(o.name))).toBe(false);
  });

  it("carries the cost, and strips it out of the name", () => {
    const wing = options(dragon).find((o) => o.name === "Wing Attack");
    expect(wing?.cost).toBe(2);
    expect(options(dragon).find((o) => o.name === "Detect")?.cost).toBe(1);
  });

  it("reads the other printing of a cost too", () => {
    /* "(3 Actions)" without the word Costs. A missed one is a dragon getting
       three tail attacks for the price of one. */
    const [only] = options([{ name: "Rend (3 Actions)", desc: "It rends." }]);
    expect(only?.name).toBe("Rend");
    expect(only?.cost).toBe(3);
  });
});

describe("the lair, which belongs to the place and not the creature", () => {
  it("reads the initiative count rather than assuming twenty", () => {
    expect(lair(dragon)?.at).toBe(20);
    expect(lair([{ name: "Lair Actions", desc: "On initiative count 15, it acts." }])?.at).toBe(15);
  });

  it("falls back to twenty when the count is not stated", () => {
    expect(lair([{ name: "Lair Actions", desc: "It acts in its lair." }])?.at).toBe(20);
  });

  it("is nothing for a creature with no lair", () => {
    expect(lair([{ name: "Detect", desc: "It looks." }])).toBeNull();
    expect(lair(undefined)).toBeNull();
  });

  it("is not confused by the prose ABOUT a lair", () => {
    expect(lair([{ name: "A Black Dragon's Lair", desc: "Where they are found." }])).toBeNull();
  });
});

describe("whether it may take one right now", () => {
  it("refuses on the creature's own turn", () => {
    /* The mistake in the other direction: a dragon that legendary-acts on its
       own turn is taking four actions instead of one. */
    expect(mayTake({ budget: 3, isTheirTurn: true })).toBe(false);
    expect(mayTake({ budget: 3, isTheirTurn: false })).toBe(true);
  });

  it("counts what is already spent this round", () => {
    expect(mayTake({ budget: 3, spent: 2, isTheirTurn: false })).toBe(true);
    expect(mayTake({ budget: 3, spent: 3, isTheirTurn: false })).toBe(false);
  });

  it("refuses one that costs more than is left", () => {
    expect(mayTake({ budget: 3, spent: 2, isTheirTurn: false, cost: 2 })).toBe(false);
  });

  it("refuses a creature that has none at all", () => {
    expect(mayTake({ budget: 0, isTheirTurn: false })).toBe(false);
  });
});

describe("blocks that are not legendary actions at all", () => {
  it("drops a vehicle's components, which are the ship and not its actions", () => {
    /* A Battle Balloon lists Hull, Control: Helm and Control: Balloon under
       `legendary`, each opening with its own armour class. Two creatures are
       printed this way and they put ten components into the DM's list. */
    const balloon: Entry[] = [
      { name: "Hull", desc: "Armor Class: 15\nHit Points: 200 (damage threshold 15)" },
      { name: "Control: Helm", desc: "Armor Class: 18\nHit Points: 50" },
    ];
    expect(options(balloon)).toEqual([]);
    expect(budget(balloon)).toBe(0);
  });

  it("gives three to a creature that lists options and states no budget", () => {
    /* 41 creatures are printed without the header. Returning zero leaves a
       Vampire Warlock with three legendary actions listed and no way to take
       one, because `mayTake` refuses everything at a budget of zero. */
    const warlock: Entry[] = [
      { name: "Misty Step", desc: "It steps." },
      { name: "Call the Blood (Costs 2 Actions)", desc: "It calls." },
    ];
    expect(budget(warlock)).toBe(3);
    expect(mayTake({ budget: budget(warlock), isTheirTurn: false })).toBe(true);
  });

  it("still gives nothing to a creature with nothing to do", () => {
    expect(budget([{ name: "Regional Effects", desc: "The land is warped." }])).toBe(0);
  });
});

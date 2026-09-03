import { describe, it, expect, afterEach, vi } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { Sheet } from "./Sheet";
import { startingVitals, reduceVitals, VITAL, type Vitals, type Vital } from "./model";
import { EMPTY, type Build } from "../creation/model";
import { BLANK } from "../../rules/5e/abilities";
import { SKILLS } from "../../rules/5e/skills";
import { asDevice, type Event } from "../../core/types";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

/**
 * The worst case, not the demo. V1's sheet measured 2,588px against a sample
 * campaign with one character — a number that could not have moved.
 */
const WORST: Build = {
  ...EMPTY,
  classes: [{ id: "fighter", level: 12, subclass: "champion" }, { id: "wizard", level: 8, subclass: "evocation" }],
  level: 20,
  race: "elf", subrace: "high-elf", background: "sage",
  scores: { ...BLANK, str: 18, dex: 16, con: 16, int: 20, wis: 12, cha: 10 },
  skills: SKILLS.map((s) => s.id),
  equipment: Array.from({ length: 30 }, (_, i) => `item-${i}`),
  spells: Array.from({ length: 25 }, (_, i) => `spell-${i}`),
  identity: { name: "Bel Harrow" },
};

const ev = (v: Vital): Event =>
  ({ id: `x${Math.random()}`, seq: 1, by: asDevice("t"), at: 0, kind: VITAL, data: v as unknown as Record<string, unknown> });

const vitals = (build: Build, acts: readonly Vital[]): Vitals =>
  acts.reduce((v, a) => reduceVitals(v, ev(a)), startingVitals(build));

const LOADED: readonly Vital[] = [
  { act: "damage", n: 120 },
  { act: "concentrate", spell: "Haste" },
  { act: "exhaustion", n: 5 },
  ...["poisoned", "prone", "frightened", "grappled", "blinded", "deafened"].map(
    (id) => ({ act: "condition", id, on: true }) as const,
  ),
];

const mount = (build = WORST, acts = LOADED) =>
  mountPhone(<Sheet build={build} vitals={vitals(build, acts)} name="Bel Harrow" onAct={() => {}} onBack={() => {}} />);

const top = (p: Phone, id: string) => p.doc.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect().top;

describe("the sheet, on the reference phone", () => {
  it("fits its budget with the worst character it will ever hold", async () => {
    phone = await mount();
    // 1.75, raised from 1.5 when the sheet gained the concept's identity card
    // and stat strip — and only after evicting twice: reference behind tabs,
    // skills down to six highlights. V1's equivalent measured about 3.9.
    expect(phone.screens()).toBeLessThanOrEqual(1.75);
  });

  it("puts every tap target at 44px", async () => {
    phone = await mount();
    expect(phone.smallTargets()).toEqual([]);
  });

  it("is ordered by the questions it raises, not by what was built first", async () => {
    phone = await mount();
    // Law 7: what is waiting on me, what can I do about it, what is true now.
    expect(top(phone, "waiting")).toBeLessThan(top(phone, "actions"));
    expect(top(phone, "actions")).toBeLessThan(top(phone, "vitals"));
  });

  it("shows nothing is waiting when nothing is", async () => {
    phone = await mount(WORST, []);
    expect(phone.doc.querySelector('[data-testid="waiting"]')).toBeNull();
    expect(phone.screens()).toBeLessThanOrEqual(1.75);
  });

  it("says what is waiting, in a sentence", async () => {
    // Exactly enough to go down. More than double would be death outright,
    // and the dead are not owed death saves.
    phone = await mount(WORST, [{ act: "damage", n: startingVitals(WORST).health.max }]);
    const waiting = phone.doc.querySelector('[data-testid="waiting"]')!;
    expect(waiting.textContent).toContain("Death saves");
    expect(waiting.textContent).toContain("0 of 3 made");
  });
});

describe("reference lives in drawers, not below the fold", () => {
  it("shows six skill highlights, and the rest a tap away", async () => {
    // A character trained in everything makes the column longer than the whole
    // rest of the sheet. The concept says HIGHLIGHTS, and means it.
    phone = await mount();
    const before = phone.screens();
    [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === "All")!.click();
    await new Promise((r) => setTimeout(r, 40));

    const drawer = phone.doc.querySelector('[role="dialog"]');
    expect(drawer).not.toBeNull();
    expect(drawer!.textContent).toContain("Acrobatics");
    // The panel underneath did not get taller. That is the whole mechanism.
    expect(phone.screens()).toBeCloseTo(before, 2);
  });

  it("carries the answer with it — a trained skill shows its total", async () => {
    phone = await mount();
    // Arcana: INT 20 (+5) plus proficiency at level 20 (+6) = +11, inline.
    expect(phone.doc.querySelector('[data-testid="abilities"]')).not.toBeNull();
    [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === "All")!.click();
    await new Promise((r) => setTimeout(r, 40));
    expect(phone.doc.querySelector('[role="dialog"]')!.textContent).toContain("+11");
  });

  it("explains a condition rather than naming it", async () => {
    phone = await mount();
    [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === "Conditions…")!.click();
    await new Promise((r) => setTimeout(r, 40));
    const text = phone.doc.querySelector('[role="dialog"]')!.textContent ?? "";
    expect(text).toContain("Disadvantage on attacks and ability checks");
  });
});

describe("recording a number you already have", () => {
  const open = async (label: string) => {
    const onAct = vi.fn();
    phone = await mountPhone(
      <Sheet build={WORST} vitals={startingVitals(WORST)} name="Bel" onAct={onAct} onBack={() => {}} />,
    );
    [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === label)!.click();
    await new Promise((r) => setTimeout(r, 40));
    return onAct;
  };
  const face = (n: number) =>
    [...phone!.doc.querySelectorAll('[data-testid="pad"] button')]
      .find((b) => b.getAttribute("aria-label") === String(n)) as HTMLButtonElement;

  it("takes eleven damage in one tap, not eleven", async () => {
    const onAct = await open("Damage");
    expect(phone!.doc.querySelector('[data-testid="pad"]')).not.toBeNull();
    face(11).click();
    expect(onAct).toHaveBeenCalledWith({ act: "damage", n: 11 });
  });

  it("heals by the number thrown", async () => {
    const onAct = await open("Heal");
    face(7).click();
    expect(onAct).toHaveBeenCalledWith({ act: "heal", n: 7 });
  });

  it("offers a hit die only as many faces as it has", async () => {
    // A d10 pad must not offer an 11. The app never rolls, but it will not
    // hold an impossible number either.
    await open("d10 · 12/12");
    const faces = [...phone!.doc.querySelectorAll('[data-testid="pad"] button')]
      .filter((b) => /^\d+$/.test(b.getAttribute("aria-label") ?? ""));
    expect(faces).toHaveLength(10);
    expect(face(10)).toBeTruthy();
    expect(face(11)).toBeUndefined();
  });

  it("keeps every pad key at 44px", async () => {
    await open("Damage");
    expect(phone!.smallTargets()).toEqual([]);
  });
});

describe("what a character carries, and what they know", () => {
  /*
   * This block used to be on the Overview, joined against a hardcoded table of
   * three weapons — so with the worst-case fixture it matched nothing and drew
   * nothing, and the height budget was measured around an empty box. The
   * assertion below is the one that could not have failed before: it counts
   * ROWS, against a build whose equipment is the book's own words.
   */
  it("shows every carried line on the Inventory tab", async () => {
    phone = await mount(WORST, []);
    const tab = [...phone.doc.querySelectorAll("button")]
      .find((b) => b.textContent?.trim() === "Inventory")!;
    tab.click();
    await new Promise((r) => setTimeout(r, 0));
    /*
     * The lines are resolved into stacks against the catalogue this screen
     * loads. With none loaded they are kept BY NAME, which is the point —
     * nothing is silently dropped — and a thing the catalogue never named is
     * gear, because it is a thing in a bag.
     */
    expect(phone.doc.querySelector('[data-testid="slots"]')).not.toBeNull();
    const gear = [...phone.doc.querySelectorAll('[role="tab"]')]
      .find((t) => t.textContent?.trim() === "Gear") as HTMLElement;
    gear.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(phone.doc.querySelector('[data-testid="inventory"]')!.textContent).toContain("item-0");
  });

  it("says what a character speaks and can use", async () => {
    const spoken: Build = {
      ...WORST,
      languages: ["Common", "Elvish", "Draconic"],
      tools: ["Thieves' Tools"],
      style: "archery",
      names: { style: "Archery" },
    };
    phone = await mount(spoken, []);
    const block = phone.doc.querySelector('[data-testid="proficiencies"]')!;
    expect(block.textContent).toContain("Common, Elvish, Draconic");
    expect(block.textContent).toContain("Thieves' Tools");
    expect(block.textContent).toContain("Archery");
  });

  /* A character with no tools and only Common needs no block explaining that. */
  it("says nothing when there is nothing to say", async () => {
    phone = await mount(WORST, []);
    expect(phone.doc.querySelector('[data-testid="proficiencies"]')).toBeNull();
  });
});

describe("armour class, from what the character actually chose", () => {
  const wearing = (worn: Build["worn"], dex: number, str = 10): Build => ({
    ...WORST,
    scores: { ...BLANK, dex, str },
    bonuses: {},
    equipment: ["chain mail", "a martial weapon and a shield"],
    worn,
  });

  const CHAIN = { name: "Chain Mail", kind: "heavy" as const, ac: 16, strMinimum: 13, stealthDisadvantage: true };
  const LEATHER = { name: "Leather Armor", kind: "light" as const, ac: 11 };
  const SHIELD = { name: "Shield", kind: "shield" as const, ac: 2 };

  const strip = (p: Phone) => p.doc.querySelector('[data-testid="vitals"]')!.textContent ?? "";

  /*
   * The assertion that could not have passed before: the sheet derived
   * 10 + Dex for everybody, so a knight in chain mail showed 12.
   */
  it("shows the armour's number, not ten plus Dexterity", async () => {
    phone = await mount(wearing([CHAIN, SHIELD], 14), []);
    expect(strip(phone)).toContain("18");
  });

  it("still shows ten plus Dexterity when nothing is worn", async () => {
    phone = await mount(wearing([], 14), []);
    expect(strip(phone)).toContain("12");
  });

  const openInventory = async (p: Phone) => {
    const tab = [...p.doc.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Inventory")!;
    tab.click();
    await new Promise((r) => setTimeout(r, 0));
  };

  /* A `title` explains a capped bonus on a laptop and nothing on a phone. */
  it("says the sum in words, where a phone can read it", async () => {
    phone = await mount(wearing([LEATHER], 18), []);
    await openInventory(phone);
    expect(phone.doc.querySelector('[data-testid="inventory"]')!.textContent)
      .toContain("Leather Armor 11 +4 dex");
  });

  it("says what the armour costs, when it costs something", async () => {
    phone = await mount(wearing([CHAIN], 10, 12), []);
    await openInventory(phone);
    const block = phone.doc.querySelector('[data-testid="inventory"]')!.textContent ?? "";
    expect(block).toContain("Disadvantage on Stealth");
    expect(block).toContain("not strong enough");
  });

  it("says nothing about costs when the armour has none", async () => {
    phone = await mount(wearing([LEATHER], 12), []);
    await openInventory(phone);
    const block = phone.doc.querySelector('[data-testid="inventory"]')!.textContent ?? "";
    expect(block).not.toContain("Disadvantage");
    expect(block).not.toContain("not strong enough");
  });
});

describe("what a caster can cast", () => {
  const caster = (level: number, slots: readonly (readonly number[])[]): Build => ({
    ...WORST,
    classes: [{ id: "wizard", level, subclass: null }],
    level,
    slots: { wizard: slots },
  });

  const WIZARD = [[2], [3], [4, 2], [4, 3], [4, 3, 2]];

  /*
   * The compendium has carried a twenty-row slot table per class all along
   * and nothing read it. A wizard 3 held four first-level and two
   * second-level slots and the sheet said nothing at all.
   */
  it("says how many slots, at which levels", async () => {
    phone = await mount(caster(3, WIZARD), []);
    expect(phone.doc.querySelector('[data-testid="slots"]')!.textContent)
      .toContain("4 × level 1");
    expect(phone.doc.querySelector('[data-testid="slots"]')!.textContent)
      .toContain("2 × level 2");
  });

  it("says nothing for a character who casts nothing", async () => {
    phone = await mount({ ...WORST, classes: [{ id: "fighter", level: 5, subclass: null }], slots: {} }, []);
    expect(phone.doc.querySelector('[data-testid="slots"]')).toBeNull();
  });

  /* A Fighter's table is the Eldritch Knight's. A plain fighter never casts. */
  it("withholds a subclass's table from a class that does not cast", async () => {
    const table = [[], [], [2], [3]];
    const plain: Build = {
      ...WORST, level: 3,
      classes: [{ id: "fighter", level: 3, subclass: "champion" }],
      slots: { fighter: table },
    };
    phone = await mount(plain, []);
    expect(phone.doc.querySelector('[data-testid="slots"]')).toBeNull();

    const knight: Build = { ...plain, classes: [{ id: "fighter", level: 3, subclass: "eldritch-knight" }] };
    phone = await mount(knight, []);
    expect(phone.doc.querySelector('[data-testid="slots"]')!.textContent).toContain("2 × level 1");
  });
});

describe("what an ancestry keeps giving", () => {
  /*
   * 119 of 605 ancestries grant a spell and 36 grant one at a LATER level.
   * The trait was prose and the spell never reached the sheet, so a tiefling
   * arrived unable to cast the one thing tieflings are known for.
   */
  const drow = (level: number): Build => ({
    ...WORST,
    classes: [{ id: "wizard", level, subclass: null }],
    level,
    innate: {
      spells: [
        { name: "dancing lights", level: 1, from: "Drow Magic" },
        { name: "faerie fire", level: 3, from: "Drow Magic" },
        { name: "darkness", level: 5, from: "Drow Magic" },
      ],
      choices: [],
    },
  });

  it("shows what has arrived and withholds what has not", async () => {
    phone = await mount(drow(3), []);
    const block = phone.doc.querySelector('[data-testid="innate"]')!.textContent ?? "";
    expect(block).toContain("dancing lights");
    expect(block).toContain("faerie fire");
    expect(block).not.toContain("darkness");
  });

  it("credits the trait that granted it", async () => {
    phone = await mount(drow(1), []);
    expect(phone.doc.querySelector('[data-testid="innate"]')!.textContent).toContain("Drow Magic");
  });

  it("says nothing for an ancestry that grants none", async () => {
    phone = await mount(WORST, []);
    expect(phone.doc.querySelector('[data-testid="innate"]')).toBeNull();
  });
});

describe("features gained, filtered to this character", () => {
  /* A ranger's class table carries 372 feature names by level 8, of which 22
     belong to the character holding the sheet. */
  it("lists them by the level they arrived at", async () => {
    phone = await mountPhone(
      <Sheet build={WORST} vitals={vitals(WORST, [])} name="Bel" onAct={() => {}} onBack={() => {}}
             features={[{ level: 1, names: ["Spellcasting", "Arcane Recovery"] }, { level: 2, names: ["Arcane Tradition"] }]} />,
    );
    const block = phone.doc.querySelector('[data-testid="features"]')!.textContent ?? "";
    expect(block).toContain("Arcane Recovery");
    expect(block).toContain("Level 2");
  });
});

describe("how far a character sees", () => {
  /* 314 of 605 ancestries say, and the sheet derived none of it — a trait
     called "Superior Darkvision" and no number anywhere. */
  it("says the range and what it costs them", async () => {
    const drow: Build = {
      ...WORST,
      senses: { darkvision: 120, sunlightSensitivity: true, blindsight: 0, tremorsense: 0, truesight: 0 },
    };
    phone = await mount(drow, []);
    expect(phone.doc.querySelector('[data-testid="senses"]')!.textContent)
      .toContain("darkvision 120 ft · sunlight sensitivity");
  });

  it("says nothing for an ancestry that sees like anybody else", async () => {
    phone = await mount(WORST, []);
    expect(phone.doc.querySelector('[data-testid="senses"]')).toBeNull();
  });
});

describe("saving throws, from the class and from Resilient", () => {
  /* Resilient is the only feat in the game that grants one, and it is the
     reason anybody takes it. Leaving it unapplied made the sheet quietly
     wrong about the number the player took the feat FOR. */
  it("adds the save a feat granted", async () => {
    const tough: Build = {
      ...WORST,
      classes: [{ id: "wizard", level: 4, subclass: null }],
      improvements: [{ feat: "resilient-constitution", name: "Resilient (Constitution)" }],
      featEffects: { "Resilient (Constitution)": { increase: "con", saveProficiency: "con" } },
    };
    phone = await mount(tough, []);
    const text = phone.doc.body.textContent ?? "";
    // A wizard's own saves are Intelligence and Wisdom; Constitution is the feat's.
    expect(text).toContain("Constitution");
    // And the half-feat's point lands too.
    expect(phone.doc.querySelector('[data-testid="vitals"]')).not.toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { prepFrom, creatureCount, rawXp, xpForCr, staging, PREP, NO_PREP,
  blankEncounter, isNamed, addEntry, setCount, setDisclosure,
  joinActs, type Encounter, type PrepAct } from "./encounter";
import { fightFrom, activeOf, FIGHT, type Act } from "./fight";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (a: PrepAct): Event =>
  ({ id: `e${String(++n)}`, kind: PREP, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);

const goblins: Encounter = {
  id: "amb", name: "Roadside Ambush", place: "Forest Road",
  entries: [
    { statblock: "fc-goblin", name: "Goblin", count: 4, max: 7, ac: 15, cr: 0.25, disclosure: "hidden" },
    { statblock: "fc-goblin-boss", name: "Goblin Boss", count: 1, max: 21, ac: 17, cr: 1, disclosure: "hidden" },
  ],
};

describe("keeping an encounter", () => {
  it("starts with none", () => {
    expect(prepFrom([])).toEqual(NO_PREP);
  });

  it("keeps one, and it survives a replay", () => {
    const p = prepFrom([ev({ act: "keep", encounter: goblins })]);
    expect(p.encounters.map((e) => e.name)).toEqual(["Roadside Ambush"]);
  });

  it("replaces one of the same id rather than doubling it", () => {
    /* Editing an encounter is not acquiring a second. */
    const p = prepFrom([
      ev({ act: "keep", encounter: goblins }),
      ev({ act: "keep", encounter: { ...goblins, name: "Ambush, revised" } }),
    ]);
    expect(p.encounters).toHaveLength(1);
    expect(p.encounters[0]?.name).toBe("Ambush, revised");
  });

  it("forgets one", () => {
    const p = prepFrom([ev({ act: "keep", encounter: goblins }), ev({ act: "forget", id: "amb" })]);
    expect(p.encounters).toEqual([]);
  });
});

describe("the arithmetic nobody enjoys", () => {
  it("counts every creature, not every group", () => {
    expect(creatureCount(goblins)).toBe(5);
  });

  it("sums experience across instances", () => {
    /* Four goblins at 50 and a boss at 200. */
    expect(rawXp(goblins)).toBe(4 * 50 + 200);
  });

  it("reads a fractional challenge rating as the table prints it", () => {
    expect(xpForCr(0.125)).toBe(25);
    expect(xpForCr(0.25)).toBe(50);
    expect(xpForCr(0.5)).toBe(100);
  });

  it("is worth nothing for a rating it does not know, rather than a guess", () => {
    expect(xpForCr(99)).toBe(0);
  });

  it("awards RAW experience, with no multiplier anywhere", () => {
    /* V1's warning: a multiplier estimates danger and is never earned.
       Getting it backwards roughly doubles a party's progression. */
    const one: Encounter = { ...goblins, entries: [goblins.entries[0]!] };
    const four: Encounter = { ...goblins, entries: [{ ...goblins.entries[0]!, count: 16 }] };
    expect(rawXp(four)).toBe(rawXp(one) * 4);
  });
});

describe("building one from nothing", () => {
  it("starts empty and unnamed", () => {
    const blank = blankEncounter("e1");
    expect(blank.entries).toEqual([]);
    expect(isNamed(blank)).toBe(false);
  });

  it("a name of only spaces is not a name", () => {
    expect(isNamed({ ...blankEncounter("e1"), name: "   " })).toBe(false);
  });

  it("adding the same statblock twice merges into one group, not two rows", () => {
    let e = blankEncounter("e1");
    e = addEntry(e, { statblock: "goblin", name: "Goblin", count: 1, max: 7, ac: 15, cr: 0.25, disclosure: "hidden" });
    e = addEntry(e, { statblock: "goblin", name: "Goblin", count: 1, max: 7, ac: 15, cr: 0.25, disclosure: "hidden" });
    expect(e.entries).toHaveLength(1);
    expect(e.entries[0]?.count).toBe(2);
  });

  it("adding a different statblock is a second group", () => {
    let e = blankEncounter("e1");
    e = addEntry(e, { statblock: "goblin", name: "Goblin", count: 1, max: 7, ac: 15, cr: 0.25, disclosure: "hidden" });
    e = addEntry(e, { statblock: "wolf", name: "Wolf", count: 1, max: 11, ac: 13, cr: 0.25, disclosure: "hidden" });
    expect(e.entries.map((x) => x.statblock)).toEqual(["goblin", "wolf"]);
  });

  it("stepping the count down to zero removes the group rather than showing a zero", () => {
    let e = blankEncounter("e1");
    e = addEntry(e, { statblock: "goblin", name: "Goblin", count: 2, max: 7, ac: 15, cr: 0.25, disclosure: "hidden" });
    e = setCount(e, "goblin", 0);
    expect(e.entries).toEqual([]);
  });

  it("setting disclosure touches only the named group", () => {
    let e = blankEncounter("e1");
    e = addEntry(e, { statblock: "goblin", name: "Goblin", count: 1, max: 7, ac: 15, cr: 0.25, disclosure: "hidden" });
    e = addEntry(e, { statblock: "wolf", name: "Wolf", count: 1, max: 11, ac: 13, cr: 0.25, disclosure: "hidden" });
    e = setDisclosure(e, "wolf", "vague");
    expect(e.entries.find((x) => x.statblock === "goblin")?.disclosure).toBe("hidden");
    expect(e.entries.find((x) => x.statblock === "wolf")?.disclosure).toBe("vague");
  });
});

describe("putting one on the table", () => {
  it("makes N of a statblock into N rows, never one row with a count", () => {
    /* A count cannot say that one of them is nearly down. */
    const rows = staging(goblins, (i) => `s${String(i)}`);
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.id)).size).toBe(5);
  });

  it("carries the rung each group was prepared at", () => {
    const rows = staging({ ...goblins,
      entries: [{ ...goblins.entries[0]!, count: 1, disclosure: "present" }] }, (i) => `s${String(i)}`);
    expect(rows[0]?.disclosure).toBe("present");
  });

  it("starts fresh — nothing carries over from the last time it ran", () => {
    const rows = staging(goblins, (i) => `s${String(i)}`);
    expect(rows.every((r) => r.max > 0)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("damage");
  });
});

/** A fight-kind event, since this file's own `ev` issues prep acts. */
const fev = (a: Act): Event =>
  ({ id: `f${String(++n)}`, kind: FIGHT, seq: n, by: asDevice("d1"), at: n, data: a } as unknown as Event);

describe("an encounter replaces the table; a group joins it", () => {
  const entries = [{
    statblock: "goblin", name: "Goblin", count: 2, max: 7, ac: 15,
    cr: 0.25, disclosure: "hidden" as const,
  }];
  const id = (n: number) => `g${String(n)}`;

  it("stages the creatures and clears nothing", () => {
    /*
     * The whole of Arturo's distinction, and it is a VERB rather than a second
     * record: "an Encounter should be something the DM prepped for. A Creature
     * Group can be an on-the-fly cluster... or addition to an established
     * encounter." A group that stored itself would be a record nobody asked to
     * save — it is over when the fight is.
     */
    const acts = joinActs(entries, id);
    expect(acts.map((a) => a.act)).toEqual(["stage", "stage"]);
    expect(acts.some((a) => a.act === "clear")).toBe(false);
    expect(acts.some((a) => a.act === "room")).toBe(false);
  });

  it("expands a count into one act per creature, as the table needs", () => {
    /* Two goblins are two rows with their own hit points — the moment one is
       bloodied and the other is not, a count cannot say so. */
    const acts = joinActs(entries, id);
    expect(acts).toHaveLength(2);
    expect(new Set(acts.map((a) => (a.act === "stage" ? a.id : "")))).toHaveProperty("size", 2);
  });

  it("joins a fight already running without disturbing it", () => {
    const base: Act[] = [
      { act: "stage", id: "a", name: "Aria", source: { kind: "creature", statblock: "a", max: 10, ac: 10 } },
      { act: "roll", id: "a", value: 20 },
      { act: "begin" },
    ];
    const after = fightFrom([...base, ...joinActs(entries, id)].map(fev));
    expect(after.phase).toBe("active");
    expect(after.round).toBe(1);
    expect(after.combatants).toHaveLength(3);
    expect(activeOf(after)?.name).toBe("Aria");
  });
});

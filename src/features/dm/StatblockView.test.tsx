import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { StatblockView } from "./StatblockView";
import type { Statblock } from "./creatures";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

/** A real one, trimmed: the fields and the entry kinds the corpus actually ships. */
const dragon: Statblock = {
  id: "fc-adult-red-dragon",
  abilities: { str: 27, dex: 10, con: 25, int: 16, wis: 13, cha: 21 },
  speed: { walk: "walk 40 ft., climb 40 ft., fly 80 ft." },
  hitDice: "19d12+133",
  senses: { notes: "blindsight 60 ft., darkvision 120 ft." },
  languages: "Common, Draconic",
  acNote: "natural armor",
  alignment: "chaotic evil",
  xp: 18000,
  saves: { dex: 6, con: 13, wis: 7, cha: 11 },
  skills: { perception: 13, stealth: 6 },
  immunities: ["fire"],
  traits: [{ name: "Legendary Resistance", desc: "If the dragon fails a saving throw, it can choose to succeed instead." }],
  actions: [
    { name: "Multiattack", desc: "The dragon makes three attacks: one with its bite and two with its claws." },
    { name: "Bite", desc: "Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 7 (2d6) fire damage.", attackBonus: 14, damage: [{ dice: "2d10+8", type: "piercing" }] },
  ],
  reactions: [],
  legendary: [
    { name: "Detect", desc: "The dragon makes a Wisdom (Perception) check.", cost: 1 },
    { name: "Wing Attack", desc: "The dragon beats its wings.", cost: 2 },
  ],
  lair: { at: 20, text: "On initiative count 20 the dragon takes a lair action." },
};

const text = (p: Phone) => p.doc.querySelector('[data-testid="statblock"]')?.textContent ?? "";

describe("a statblock a DM can read", () => {
  it("shows the entries the fight used to drop at the boundary", async () => {
    /*
     * The measured defect. V1 counted 17 of 57 entries surviving staging;
     * V2's was total, because nothing ever called `statblock()`. These are the
     * named casualties.
     */
    phone = await mountPhone(<StatblockView block={dragon} />);
    for (const kept of ["Legendary Resistance", "Multiattack", "Detect", "Wing Attack"]) {
      expect(text(phone)).toContain(kept);
    }
  });

  it("renders a trait as prose and never as a control", async () => {
    phone = await mountPhone(<StatblockView block={dragon} />);
    const labels = [...phone.doc.querySelectorAll("button")].map((b) => b.textContent ?? "");
    expect(labels.join(" ")).not.toContain("Legendary Resistance");
  });

  it("does not roll, and offers nothing that could", async () => {
    /*
     * The one rule this app does not bend: the number comes from a person
     * throwing something. So the whole view is text — there is nothing here
     * to press, which is also why an action's numbers are typography rather
     * than a button. V1's tappable action routed into `savefrom` and the swing
     * walkthrough, neither of which V2 has ported.
     */
    phone = await mountPhone(<StatblockView block={dragon} />);
    expect(phone.doc.querySelectorAll("button")).toHaveLength(0);
    expect(phone.doc.querySelectorAll("input")).toHaveLength(0);
  });

  it("lifts an action's numbers onto their own line", async () => {
    phone = await mountPhone(<StatblockView block={dragon} />);
    const lines = [...phone.doc.querySelectorAll("p")].map((p) => p.textContent);
    expect(lines).toContain("+14 to hit · 2d10+8 piercing");
  });

  it("keeps the prose beside the numbers, because the numbers are a summary", async () => {
    /*
     * The build parse takes one damage clause. An Adult Red Dragon's bite
     * really deals "19 (2d10 + 8) piercing damage plus 7 (2d6) fire damage",
     * and the summary line says only the piercing half — so the sentence must
     * always be there under it. Dropping the prose for the numbers would lose
     * the rider, the reach and every save DC in the corpus.
     */
    phone = await mountPhone(<StatblockView block={dragon} />);
    expect(text(phone)).toContain("+14 to hit · 2d10+8 piercing");
    expect(text(phone)).toContain("plus 7 (2d6) fire damage");
    expect(text(phone)).toContain("reach 10 ft.");
  });

  it("names the initiative count a lair acts on", async () => {
    phone = await mountPhone(<StatblockView block={dragon} />);
    expect(text(phone)).toContain("initiative 20");
  });

  it("marks only the legendary actions that cost more than one", async () => {
    phone = await mountPhone(<StatblockView block={dragon} />);
    expect(text(phone)).toContain("costs 2");
    expect(text(phone)).not.toContain("costs 1");
  });

  it("reads the fields in the shape the corpus actually ships them", async () => {
    phone = await mountPhone(<StatblockView block={dragon} />);
    expect(text(phone)).toContain("blindsight 60 ft.");
    expect(text(phone)).toContain("walk 40 ft., climb 40 ft., fly 80 ft.");
    expect(text(phone)).not.toContain("walk walk");
    expect(text(phone)).toContain("dex +6");
  });

  it("draws no empty rows for what this creature has none of", async () => {
    phone = await mountPhone(<StatblockView block={dragon} />);
    expect(text(phone)).not.toContain("Reactions");
  });

  it("is legible and honestly labelled on a phone", async () => {
    phone = await mountPhone(<StatblockView block={dragon} />);
    expect(phone.smallTargets()).toEqual([]);
    expect(phone.mislabelled()).toEqual([]);
  });
});

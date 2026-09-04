import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, DESK, type Phone } from "../../../tests/phone";
import { Bestiary } from "./Bestiary";
import type { CreatureEntry } from "../../content/schema";
import type { Fetcher } from "../../content/load";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const prov = { tier: "unknown" as const, source: "", book: null, order: Number.MAX_SAFE_INTEGER };

const ROWS: readonly CreatureEntry[] = [
  { id: "goblin", name: "Goblin", kind: "creature", provenance: prov,
    cr: 0.25, type: "humanoid (goblinoid)", size: "S", ac: 15, hp: 7, legendary: 0, lair: false },
  { id: "adult-black-dragon", name: "Adult Black Dragon", kind: "creature", provenance: prov,
    cr: 14, type: "dragon", size: "H", ac: 19, hp: 195, legendary: 3, lair: true },
  { id: "owlbear", name: "Owlbear", kind: "creature", provenance: prov,
    cr: 3, type: "monstrosity", size: "L", ac: 13, hp: 59, legendary: 0, lair: false },
];

/** Trimmed, the fields `StatblockView` actually reads. */
const DRAGON_BLOCK = {
  id: "adult-black-dragon",
  abilities: { str: 23, dex: 14, con: 21, int: 14, wis: 13, cha: 17 },
  speed: { walk: "walk 40 ft., swim 40 ft., fly 80 ft." },
  hitDice: "18d12+90",
  senses: { notes: "blindsight 60 ft." },
  languages: "Common, Draconic",
  acNote: "natural armor",
  alignment: "chaotic evil",
  xp: 11500,
  saves: null,
  skills: null,
  immunities: ["acid"],
  traits: [],
  actions: [{ name: "Multiattack", desc: "The dragon makes three attacks." }],
  reactions: [],
  legendary: [],
  lair: null,
};

/*
 * `bestiary` and `statblock` share one `Fetcher`, so one fake carries both
 * the index and the one detail file a test opens — the same door
 * `creatures.test.ts` and `EncounterEditor.test.tsx` already use.
 */
const fetcher: Fetcher = async (url) => {
  if (url.includes("index/creature.json")) {
    return new Response(JSON.stringify(ROWS), { headers: { "content-type": "application/json" } });
  }
  if (url.includes("detail/creature/adult-black-dragon.json")) {
    return new Response(JSON.stringify(DRAGON_BLOCK), { headers: { "content-type": "application/json" } });
  }
  return new Response("", { status: 404 });
};

const settle = () => new Promise((r) => setTimeout(r, 50));
const rows = (p: Phone) => p.doc.querySelectorAll('[data-testid="book-row"]');
const type = (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("the bestiary, browsable", () => {
  it("loads on open and lists what it found", async () => {
    phone = await mountPhone(<Bestiary fetcher={fetcher} />);
    await settle();
    expect(rows(phone)).toHaveLength(3);
    expect(phone.doc.body.textContent).toContain("Adult Black Dragon");
  });

  it("narrows by name", async () => {
    phone = await mountPhone(<Bestiary fetcher={fetcher} />);
    await settle();
    type(phone.doc.querySelector('[data-testid="book-search"]')!, "owl");
    await settle();
    expect(rows(phone)).toHaveLength(1);
    expect(rows(phone)[0]!.textContent).toContain("Owlbear");
  });

  it("narrows by a CR ceiling", async () => {
    /* Ported alongside kind — V1's other filter, a CR-BAND, is not: a numeric
       ceiling already answers the same "is this a fair fight" question. */
    phone = await mountPhone(<Bestiary fetcher={fetcher} />);
    await settle();
    type(phone.doc.querySelector('[data-testid="book-max-cr"]')!, "1");
    await settle();
    expect(rows(phone)).toHaveLength(1);
    expect(rows(phone)[0]!.textContent).toContain("Goblin");
  });

  it("narrows by kind, and only offers kinds actually present", async () => {
    phone = await mountPhone(<Bestiary fetcher={fetcher} />);
    await settle();
    const kinds = [...phone.doc.querySelectorAll('[data-testid="book-kind"]')].map((b) => b.textContent ?? "");
    expect(kinds.some((k) => k.includes("dragon"))).toBe(true);
    expect(kinds.some((k) => k.includes("undead"))).toBe(false);
    phone.doc.querySelector<HTMLButtonElement>('[aria-label="Only monstrosity"]')!.click();
    await settle();
    expect(rows(phone)).toHaveLength(1);
    expect(rows(phone)[0]!.textContent).toContain("Owlbear");
  });

  it("closed by default, and fetches the statblock on first open", async () => {
    phone = await mountPhone(<Bestiary fetcher={fetcher} />);
    await settle();
    expect(phone.doc.querySelector('[data-testid="statblock"]')).toBeNull();

    const dragon = [...rows(phone)].find((r) => r.textContent?.includes("Adult Black Dragon"))!;
    dragon.querySelector("button")!.click();
    await settle();

    const block = dragon.querySelector('[data-testid="statblock"]');
    expect(block?.textContent).toContain("Multiattack");
    /*
     * The identity line — size, type, AC, hit points — is the index row's job,
     * and the row above is where it stays. Passing it to `StatblockView` as
     * `head` too would print "CR 14 · Huge dragon · AC 19 · 195 hp" on two
     * consecutive lines. The alignment is the half the index row has not got,
     * so that is the half the block adds.
     */
    expect(dragon.textContent).toContain("AC 19");
    expect(dragon.textContent).toContain("195 hp");
    expect(block?.textContent).toContain("chaotic evil");
  });

  it("searches the type as well as the name", async () => {
    /* V1's search covers both, which is why its placeholder is "goblin,
       dragon, undead…" — two of those three are types, not names. */
    phone = await mountPhone(<Bestiary fetcher={fetcher} />);
    await settle();
    type(phone.doc.querySelector('[data-testid="book-search"]')!, "monstrosity");
    await settle();
    expect([...rows(phone)].map((r) => r.textContent)).toHaveLength(1);
    expect(rows(phone)[0]?.textContent).toContain("Owlbear");
  });

  it("says when a build ships no detail file for what was found", async () => {
    phone = await mountPhone(<Bestiary fetcher={fetcher} />);
    await settle();
    const goblin = [...rows(phone)].find((r) => r.textContent?.includes("Goblin"))!;
    goblin.querySelector("button")!.click();
    await settle();
    expect(goblin.querySelector('[data-testid="book-missing"]')?.textContent)
      .toContain("No statblock for Goblin");
  });

  it("caps the list rather than rendering 6,633 rows", async () => {
    const many: readonly CreatureEntry[] = Array.from({ length: 90 }, (_, i) => ({
      ...ROWS[0]!, id: `g${String(i)}`, name: `Goblin ${String(i)}`,
    }));
    const big: Fetcher = async (url) => url.includes("index/creature.json")
      ? new Response(JSON.stringify(many), { headers: { "content-type": "application/json" } })
      : new Response("", { status: 404 });
    phone = await mountPhone(<Bestiary fetcher={big} />);
    await settle();
    expect(rows(phone)).toHaveLength(60);
    expect(phone.doc.querySelector('[data-testid="book-more"]')?.textContent).toContain("90 match");
  });

  it("keeps every target at 44px and names each field once, at both widths", async () => {
    for (const size of [undefined, DESK]) {
      const p = await mountPhone(<Bestiary fetcher={fetcher} />, "light", size);
      await settle();
      expect(p.smallTargets(), `at ${String(size?.width ?? 390)}`).toEqual([]);
      expect(p.mislabelled()).toEqual([]);
      p.destroy();
    }
  });
});

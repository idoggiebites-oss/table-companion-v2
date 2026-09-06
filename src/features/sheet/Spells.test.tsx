import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { Spells } from "./Spells";
import { EMPTY, type Build } from "../creation/model";
import { startingVitals } from "./model";
import type { Fetcher } from "../../content/load";
import { BLANK } from "../../rules/5e/abilities";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const prov = { tier: "official" as const, source: "", book: null, order: 0 };
const ROWS = [
  { id: "magic-missile", name: "Magic Missile", kind: "spell", provenance: prov,
    level: 1, school: "evocation", classes: ["wizard"], isFeature: false },
  { id: "fireball", name: "Fireball", kind: "spell", provenance: prov,
    level: 3, school: "evocation", classes: ["wizard"], isFeature: false },
];
const fetcher: Fetcher = async (url) =>
  new Response(JSON.stringify(url.includes("index/spell") ? ROWS : []),
    { headers: { "content-type": "application/json" } });

/*
 * The slot table lives on the BUILD, keyed by class and indexed by class
 * level — it comes out of the compendium at creation rather than being
 * hardcoded in the rules. A fixture without one has no slots at all, which is
 * correct and was the first thing this test taught me.
 */
const FULL: readonly (readonly number[])[] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3],
];
const caster = (over: Partial<Build> = {}): Build => ({
  ...EMPTY,
  classes: [{ id: "wizard", level: 5, subclass: null }],
  level: 5, scores: { ...BLANK, int: 16 },
  spells: ["magic-missile", "fireball"],
  slots: { wizard: FULL, cleric: FULL },
  ...over,
});
const settle = () => new Promise((r) => setTimeout(r, 40));
const pips = (p: Phone, level: number) =>
  [...p.doc.querySelectorAll<HTMLButtonElement>(`[data-testid="slot-${String(level)}"]`)];

describe("what a caster can cast, and what is left", () => {
  it("draws a pip per slot the class actually has", async () => {
    const b = caster();
    phone = await mountPhone(<Spells build={b} vitals={startingVitals(b)} onAct={() => {}} fetcher={fetcher} />);
    /* A fifth-level wizard: four first, three second, two third. */
    expect(pips(phone, 1)).toHaveLength(4);
    expect(pips(phone, 3)).toHaveLength(2);
  });

  it("spends the level the slot was thrown from", async () => {
    /* Upcasting is the whole reason a slot and a spell are different things. */
    const cast: number[] = [];
    const b = caster();
    phone = await mountPhone(
      <Spells build={b} vitals={startingVitals(b)} fetcher={fetcher}
              onAct={(v) => { if (v.act === "cast") cast.push(v.level); }} />,
    );
    pips(phone, 3)[0]?.click();
    expect(cast).toEqual([3]);
  });

  it("shows a spent slot as spent rather than as gone", async () => {
    /* A pip that vanished leaves somebody counting what used to be there. */
    const b = caster();
    const v = { ...startingVitals(b), slots: { 1: 2 } };
    phone = await mountPhone(<Spells build={b} vitals={v} onAct={() => {}} fetcher={fetcher} />);
    expect(pips(phone, 1)).toHaveLength(4);
    expect(pips(phone, 1).filter((x) => x.getAttribute("aria-pressed") === "true")).toHaveLength(2);
    expect(phone.doc.body.textContent).toContain("2 left");
  });

  it("gives a warlock a pact row that says when it comes back", async () => {
    /*
     * V1's third finding, and the thing that makes a warlock a warlock: pact
     * slots are not the same pool and return on a SHORT rest.
     */
    const b = caster({ classes: [{ id: "warlock", level: 5, subclass: null }], spells: [] });
    phone = await mountPhone(<Spells build={b} vitals={startingVitals(b)} onAct={() => {}} fetcher={fetcher} />);
    expect(phone.doc.querySelectorAll('[data-testid="slot-pact"]').length).toBeGreaterThan(0);
    expect(phone.doc.body.textContent).toContain("short rest");
  });

  it("names the spells this character actually holds, and no others", async () => {
    const b = caster({ spells: ["fireball"] });
    phone = await mountPhone(<Spells build={b} vitals={startingVitals(b)} onAct={() => {}} fetcher={fetcher} />);
    await settle();
    expect(phone.doc.body.textContent).toContain("Fireball");
    expect(phone.doc.body.textContent).not.toContain("Magic Missile");
  });

  it("says where to look when a class prepares rather than knows", async () => {
    /* A cleric chooses nothing at creation — `casting.ts` says so — so their
       list is genuinely empty, and saying that beats a box that never fills. */
    const b = caster({ classes: [{ id: "cleric", level: 5, subclass: null }], spells: [] });
    phone = await mountPhone(<Spells build={b} vitals={startingVitals(b)} onAct={() => {}} fetcher={fetcher} />);
    await settle();
    expect(phone.doc.querySelector('[data-testid="spells-empty"]')?.textContent).toContain("Book");
  });

  it("is legible and honestly labelled on a phone", async () => {
    const b = caster();
    phone = await mountPhone(<Spells build={b} vitals={startingVitals(b)} onAct={() => {}} fetcher={fetcher} />);
    await settle();
    expect(phone.smallTargets()).toEqual([]);
    expect(phone.mislabelled()).toEqual([]);
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, DESK, type Phone } from "../../../tests/phone";
import { SpellLookup } from "./SpellLookup";
import type { SpellEntry } from "../../content/schema";
import type { Fetcher } from "../../content/load";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const prov = { tier: "official" as const, source: "Player's Handbook (2014)", book: "phb", order: 0 };

const ROWS: readonly SpellEntry[] = [
  { id: "hold-person", name: "Hold Person", kind: "spell", provenance: prov,
    level: 2, school: "enchantment", classes: ["cleric", "wizard"], isFeature: false },
  { id: "fire-bolt", name: "Fire Bolt", kind: "spell", provenance: prov,
    level: 0, school: "evocation", classes: ["wizard"], isFeature: false },
  { id: "invocation-agonizing-blast", name: "Invocation: Agonizing Blast", kind: "spell", provenance: prov,
    level: 0, school: "", classes: ["eldritch invocations"], isFeature: true },
];

const DETAILS = [
  {
    id: "hold-person", name: "Hold Person", level: 2, school: "enchantment",
    time: "1 action", range: "60 feet", components: "V, S, M",
    duration: "Concentration, up to 1 minute", classes: ["cleric", "wizard"],
    text: "The target must succeed on a Wisdom saving throw or be paralyzed for the duration.",
    ritual: false, concentration: true,
  },
  {
    id: "fire-bolt", name: "Fire Bolt", level: 0, school: "evocation",
    time: "1 action", range: "120 feet", components: "V, S",
    duration: "Instantaneous", classes: ["wizard"],
    text: "You hurl a mote of fire at a creature or object within range.",
    ritual: false, concentration: false,
  },
  // No entry for the invocation: exercises the "not in this build" state.
];

/*
 * One fetcher call per URL is asserted below — the whole point of holding the
 * 3.9MB detail list in state rather than re-fetching it per row.
 */
function makeFetcher(): { fetcher: Fetcher; calls: string[] } {
  const calls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    calls.push(url);
    if (url.includes("index/spell.json")) {
      return new Response(JSON.stringify(ROWS), { headers: { "content-type": "application/json" } });
    }
    if (url.includes("detail/spell.json")) {
      return new Response(JSON.stringify(DETAILS), { headers: { "content-type": "application/json" } });
    }
    return new Response("", { status: 404 });
  };
  return { fetcher, calls };
}

const settle = () => new Promise((r) => setTimeout(r, 50));
const rows = (p: Phone) => p.doc.querySelectorAll('[data-testid="spell-row"]');
const type = (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("the spell lookup", () => {
  it("loads on open and lists what it found, class features hidden", async () => {
    const { fetcher } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    // Two real spells shown; the invocation is a class feature, hidden by default.
    expect(rows(phone)).toHaveLength(2);
    expect(phone.doc.body.textContent).toContain("Hold Person");
    expect(phone.doc.body.textContent).not.toContain("Agonizing Blast");
  });

  it("narrows by name", async () => {
    const { fetcher } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    type(phone.doc.querySelector('[data-testid="spell-search"]')!, "fire");
    await settle();
    expect(rows(phone)).toHaveLength(1);
    expect(rows(phone)[0]!.textContent).toContain("Fire Bolt");
  });

  it("searches the classes that grant it, as well as the name", async () => {
    const { fetcher } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    type(phone.doc.querySelector('[data-testid="spell-search"]')!, "cleric");
    await settle();
    expect(rows(phone)).toHaveLength(1);
    expect(rows(phone)[0]!.textContent).toContain("Hold Person");
  });

  it("narrows by level, and only offers levels actually present", async () => {
    const { fetcher } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    phone.doc.querySelector<HTMLButtonElement>('[aria-label="Only cantrip"]')!.click();
    await settle();
    expect(rows(phone)).toHaveLength(1);
    expect(rows(phone)[0]!.textContent).toContain("Fire Bolt");
  });

  it("shows class features on request, with a count, and hides them again", async () => {
    const { fetcher } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    const toggle = phone.doc.querySelector<HTMLButtonElement>('[data-testid="spell-features-toggle"]')!;
    expect(toggle.textContent).toContain("1");
    toggle.click();
    await settle();
    expect(rows(phone)).toHaveLength(3);
    expect(phone.doc.body.textContent).toContain("Agonizing Blast");
    toggle.click();
    await settle();
    expect(rows(phone)).toHaveLength(2);
  });

  it("closed by default, fetches the 3.9MB detail list once, and reads it in full", async () => {
    const { fetcher, calls } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    expect(phone.doc.querySelector('[data-testid="spell-detail"]')).toBeNull();
    expect(calls.some((u) => u.includes("detail/spell.json"))).toBe(false);

    const hold = [...rows(phone)].find((r) => r.textContent?.includes("Hold Person"))!;
    hold.querySelector("button")!.click();
    await settle();
    const block = hold.querySelector('[data-testid="spell-detail"]');
    // Whole text, not truncated — V1's own rule for this screen.
    expect(block?.textContent).toContain("paralyzed for the duration");
    expect(calls.filter((u) => u.includes("detail/spell.json"))).toHaveLength(1);

    // A second spell opened must not fetch the 3.9MB chunk again.
    const bolt = [...rows(phone)].find((r) => r.textContent?.includes("Fire Bolt"))!;
    bolt.querySelector("button")!.click();
    await settle();
    expect(bolt.querySelector('[data-testid="spell-detail"]')?.textContent).toContain("mote of fire");
    expect(calls.filter((u) => u.includes("detail/spell.json"))).toHaveLength(1);
  });

  it("says when the detail list did not carry an entry", async () => {
    const { fetcher } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    phone.doc.querySelector<HTMLButtonElement>('[data-testid="spell-features-toggle"]')!.click();
    await settle();
    const inv = [...rows(phone)].find((r) => r.textContent?.includes("Agonizing Blast"))!;
    inv.querySelector("button")!.click();
    await settle();
    expect(inv.querySelector('[data-testid="spell-missing"]')?.textContent)
      .toContain("No text for Invocation: Agonizing Blast");
  });

  it("caps the list rather than rendering 3,443 rows", async () => {
    const many: readonly SpellEntry[] = Array.from({ length: 90 }, (_, i) => ({
      ...ROWS[1]!, id: `s${String(i)}`, name: `Spell ${String(i)}`,
    }));
    const big: Fetcher = async (url) => url.includes("index/spell.json")
      ? new Response(JSON.stringify(many), { headers: { "content-type": "application/json" } })
      : new Response("[]", { headers: { "content-type": "application/json" } });
    phone = await mountPhone(<SpellLookup fetcher={big} />);
    await settle();
    expect(rows(phone)).toHaveLength(60);
    expect(phone.doc.querySelector('[data-testid="spell-more"]')?.textContent).toContain("90 match");
  });

  it("keeps every target at 44px and names each field once, at both widths", async () => {
    for (const size of [undefined, DESK]) {
      const { fetcher } = makeFetcher();
      const p = await mountPhone(<SpellLookup fetcher={fetcher} />, "light", size);
      await settle();
      expect(p.smallTargets(), `at ${String(size?.width ?? 390)}`).toEqual([]);
      expect(p.mislabelled()).toEqual([]);
      p.destroy();
    }
  });
});

describe("the filters get out of the way", () => {
  it("hides the level chips while a search is running", async () => {
    /*
     * Ten chips wrap to five rows on a 390px screen. Searching "hold person"
     * put one result below the fold under a wall of filters — and somebody
     * who has typed has already said what they want.
     */
    const { fetcher } = makeFetcher();
    phone = await mountPhone(<SpellLookup fetcher={fetcher} />);
    await settle();
    expect(phone.doc.querySelectorAll('[data-testid="spell-level"]').length).toBeGreaterThan(0);
    type(phone.doc.querySelector('[data-testid="spell-search"]')!, "hold");
    await settle();
    expect(phone.doc.querySelectorAll('[data-testid="spell-level"]')).toHaveLength(0);
  });
});

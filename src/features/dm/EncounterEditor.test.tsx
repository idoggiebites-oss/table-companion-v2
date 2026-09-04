import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, DESK, type Phone } from "../../../tests/phone";
import { EncounterEditor } from "./EncounterEditor";
import type { Encounter } from "./encounter";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const nothing = () => {};

/*
 * The compendium is injected rather than fetched: `bestiary` has always taken
 * an optional fetcher, the same door `statblock` and `pushKey` leave open, and
 * this tier's own config says "no server, no navigation".
 */
const ROWS = [
  { id: "goblin", name: "Goblin", cr: 0.25, kind: "humanoid", hp: 7, ac: 15 },
  { id: "ghoul", name: "Ghoul", cr: 1, kind: "undead", hp: 22, ac: 12 },
];
const fake = (async () =>
  new Response(JSON.stringify(ROWS), { headers: { "content-type": "application/json" } })
) as unknown as typeof fetch;

const editor = (over: Partial<Parameters<typeof EncounterEditor>[0]> = {}) => (
  <EncounterEditor
    partyLevels={[3, 3, 3]} onSave={nothing} onSend={nothing} onClose={nothing}
    fetcher={fake} {...over}
  />
);
const tabTo = async (p: Phone, name: string) => {
  [...p.doc.querySelectorAll('[role="tab"]')]
    .find((b) => b.textContent === name)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
};
const type = async (p: Phone, el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.focus();
  const proto = el.tagName === "TEXTAREA"
    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
};

describe("the encounter editor", () => {
  it("draws the working exactly once", async () => {
    /* The builder panel had its own copy until the split, so a phone rendered
       "100 XP" twice, one line under the other. The editor owns it, because it
       shows on every tab. */
    phone = await mountPhone(editor({
      encounter: { id: "e1", name: "Ghouls", place: "", entries: [
        { statblock: "ghoul", name: "Ghoul", count: 1, max: 22, ac: 12, cr: 1, disclosure: "hidden" },
      ] },
    }));
    await tabTo(phone, "Creatures");
    const shown = [...phone.doc.querySelectorAll("*")]
      .filter((el) => el.children.length === 0 && /\d+ XP/.test(el.textContent ?? ""));
    expect(shown).toHaveLength(1);
  });

  it("opens on Setup and shows one panel at a time", async () => {
    /* Tabs rather than one long form: an encounter has about twenty fields and
       a DM opens this to change one of them. */
    phone = await mountPhone(editor());
    expect(phone.doc.querySelector('[data-testid="panel-setup"]')).not.toBeNull();
    expect(phone.doc.querySelector('[data-testid="panel-creatures"]')).toBeNull();
    await tabTo(phone, "Creatures");
    expect(phone.doc.querySelector('[data-testid="panel-setup"]')).toBeNull();
    expect(phone.doc.querySelector('[data-testid="panel-creatures"]')).not.toBeNull();
  });

  it("keeps the working on every tab, because it is what the rest is adjusted against", async () => {
    phone = await mountPhone(editor({
      encounter: { id: "e1", name: "Ghouls", place: "", entries: [
        { statblock: "ghoul", name: "Ghoul", count: 3, max: 22, ac: 12, cr: 1, disclosure: "hidden" },
      ] },
    }));
    for (const tab of ["Setup", "Creatures", "Environment", "Rewards", "Notes"]) {
      await tabTo(phone, tab);
      expect(phone.doc.querySelector('[data-testid="editor-working"]')?.textContent,
             `on ${tab}`).toContain("×");
    }
  });

  it("will not keep or send a nameless encounter", async () => {
    phone = await mountPhone(editor());
    for (const label of ["Keep it", "Send to combat"]) {
      const b = [...phone.doc.querySelectorAll("button")].find((x) => x.textContent === label)!;
      expect((b as HTMLButtonElement).disabled, label).toBe(true);
    }
  });

  it("saves before it sends, so what reaches the table is what was written down", async () => {
    const order: string[] = [];
    phone = await mountPhone(editor({
      encounter: { id: "e1", name: "Ghouls", place: "", entries: [] },
      onSave: () => order.push("save"),
      onSend: () => order.push("send"),
    }));
    [...phone.doc.querySelectorAll("button")]
      .find((b) => b.textContent === "Send to combat")!.click();
    expect(order).toEqual(["save", "send"]);
  });

  it("carries the environment on the encounter itself", async () => {
    let saved: Encounter | null = null;
    phone = await mountPhone(editor({
      encounter: { id: "e1", name: "Ghouls", place: "", entries: [] },
      onSave: (e) => { saved = e; },
    }));
    await tabTo(phone, "Environment");
    phone.doc.querySelector<HTMLButtonElement>('[aria-label="Prepare light dark"]')!.click();
    await new Promise((r) => setTimeout(r, 50));
    [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === "Keep it")!.click();
    expect((saved as unknown as Encounter | null)?.room?.light).toBe("dark");
  });

  it("offers the measured band as the default, and lets the DM disagree", async () => {
    /* The gauge is right about the arithmetic and blind to a party at half hit
       points. So the override exists, and the app never writes it. */
    phone = await mountPhone(editor());
    const select = phone.doc.querySelector<HTMLSelectElement>("select")!;
    expect(select.value).toBe("");
    expect(select.options[0]!.textContent).toContain("as measured");
  });

  it("keeps every target at 44px and names each field once, at both widths", async () => {
    for (const size of [undefined, DESK]) {
      const p = await mountPhone(editor(), "light", size);
      expect(p.smallTargets(), `at ${String(size?.width ?? 390)}`).toEqual([]);
      expect(p.mislabelled()).toEqual([]);
      p.destroy();
    }
  });

  it("adds a creature from the injected bestiary", async () => {
    phone = await mountPhone(editor());
    await tabTo(phone, "Creatures");
    const field = phone.doc.querySelector<HTMLInputElement>('[data-testid="builder-search"]')!;
    await type(phone, field, "gob");
    expect(phone.doc.body.textContent).toContain("Goblin");
    phone.doc.querySelector<HTMLButtonElement>('[data-testid="builder-hit"]')!.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(phone.doc.querySelector('[data-testid="builder-entries"]')?.textContent).toContain("Goblin");
  });
});

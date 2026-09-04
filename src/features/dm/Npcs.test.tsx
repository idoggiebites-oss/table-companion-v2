import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { Npcs } from "./Npcs";
import type { Npc } from "./npc";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const wait = () => new Promise((r) => setTimeout(r, 40));

const halbrek: Npc = {
  id: "n1", name: "Halbrek the Fence", role: "shopkeeper", trader: true,
  notes: "Owes the party a favour.",
  stock: [{ itemId: "rope", name: "Rope", price: 100, qty: -1 }],
};
const nothing = () => {};
const mount = (npcs: readonly Npc[], onSave = nothing as (n: Npc) => void) =>
  mountPhone(<Npcs npcs={npcs} onSave={onSave} onForget={nothing} />);

describe("the people list, on the reference phone", () => {
  it("keeps every target at 44px in the list", async () => {
    phone = await mount([halbrek]);
    expect(phone.smallTargets()).toEqual([]);
  });

  it("keeps every target at 44px in the open editor, stock rows included", async () => {
    phone = await mount([halbrek]);
    phone.doc.querySelector<HTMLButtonElement>('[aria-label="Edit Halbrek the Fence"]')!.click();
    await wait();
    expect(phone.doc.querySelector('[data-testid="person-draft"]')).not.toBeNull();
    expect(phone.smallTargets()).toEqual([]);
  });

  it("explains what an NPC is when there are none", async () => {
    phone = await mount([]);
    expect(phone.doc.querySelector('[data-testid="people-empty"]')?.textContent)
      .toContain("never roll anything");
  });

  it("says what they are and whether they trade, not a restatement of the name", async () => {
    phone = await mount([halbrek]);
    const row = phone.doc.querySelector('[data-testid="person-card"]')!;
    expect(row.textContent).toContain("Halbrek the Fence · shopkeeper");
    expect(row.textContent).toContain("Trades · 1 item");
  });

  it("hides the shelf until Trades with the party is on", async () => {
    phone = await mount([]);
    phone.doc.querySelector<HTMLButtonElement>("button")!.click();
    await wait();
    expect(phone.doc.querySelector('[data-testid="stock"]')).toBeNull();
    phone.doc.querySelector<HTMLButtonElement>('[aria-pressed="false"]')!.click();
    await wait();
    expect(phone.doc.querySelector('[data-testid="stock"]')).not.toBeNull();
  });

  it("saves what was typed", async () => {
    let saved: Npc | null = null;
    phone = await mount([], (n) => { saved = n; });
    phone.doc.querySelector<HTMLButtonElement>("button")!.click();
    await wait();
    const name = phone.doc.querySelector<HTMLInputElement>('[data-testid="person-draft"] input')!;
    // React listens for input, not assignment — the native setter bypasses
    // React's own value tracker so the change is actually seen.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(name, "Halbrek");
    name.dispatchEvent(new Event("input", { bubbles: true }));
    await wait();
    const save = [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === "Save");
    save!.click();
    expect(saved).not.toBeNull();
    expect((saved as Npc | null)?.name).toBe("Halbrek");
  });

  it("names its fields once — the label the screen shows is the one announced", async () => {
    /* An `aria-label` on a control already named by its <label> replaces that
       name rather than adding to it, so the two disagree. See `mislabelled`. */
    phone = await mount([]);
    phone.doc.querySelector<HTMLButtonElement>("button")!.click();
    await new Promise((r) => setTimeout(r, 40));
    expect(phone.mislabelled()).toEqual([]);
  });
});

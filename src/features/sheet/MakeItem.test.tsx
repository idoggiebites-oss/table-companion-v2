import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { MakeItem } from "./MakeItem";
import type { Item } from "../../rules/5e/items";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const nothing = () => {};
const mount = (made: readonly Item[] = [], onSave: (i: Item) => void = nothing) =>
  mountPhone(<MakeItem made={made} onSave={onSave} onForget={nothing} onClose={nothing} />);

const settle = () => new Promise((r) => setTimeout(r, 30));

/* React listens for input, not assignment — `AbilitiesStep.test.tsx`'s trick. */
const type = async (p: Phone, placeholder: string, value: string) => {
  const el = p.doc.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
};
const press = (p: Phone, text: string) =>
  [...p.doc.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === text)!.click();

describe("making something the books do not have", () => {
  it("keeps every target at 44px", async () => {
    phone = await mount();
    expect(phone.smallTargets()).toEqual([]);
  });

  it("names its fields once", async () => {
    phone = await mount();
    expect(phone.mislabelled()).toEqual([]);
  });

  it("shows only the fields the chosen kind actually has", async () => {
    /* A weapon form asking for a strength minimum, or an armour form asking
       for a damage die, is a form that has to be read to be skipped. */
    phone = await mount();
    expect(phone.doc.querySelector('[data-testid="weapon-fields"]')).not.toBeNull();
    expect(phone.doc.querySelector('[data-testid="armour-fields"]')).toBeNull();
    press(phone, "Armour");
    await settle();
    expect(phone.doc.querySelector('[data-testid="weapon-fields"]')).toBeNull();
    expect(phone.doc.querySelector('[data-testid="armour-fields"]')).not.toBeNull();
  });

  it("previews the REAL record, not a picture of one", async () => {
    /*
     * The preview renders `itemFacts(toItem(draft))` — the same lines the pack
     * prints, off the same record the rules read. So a sword the app is going
     * to read as a simple 1d4 cudgel says so here rather than in a fight.
     */
    phone = await mount();
    await type(phone, "Sunderer", "Sunderer");
    await type(phone, "1d8", "1d8");
    await type(phone, "slashing", "slashing");
    const preview = phone.doc.querySelector('[data-testid="preview"]')!;
    expect(preview.textContent).toContain("Sunderer (HB)");
    expect(preview.textContent).toContain("1d8 slashing");
  });

  it("will not write down a thing with no name", async () => {
    phone = await mount();
    const save = [...phone.doc.querySelectorAll("button")]
      .find((b) => (b.textContent ?? "").includes("Write it down"))! as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("hands back an Item, which is the whole point", async () => {
    let saved: Item | null = null;
    phone = await mount([], (i) => { saved = i; });
    await type(phone, "Sunderer", "Sunderer");
    await type(phone, "1d8", "1d8");
    await type(phone, "slashing", "slashing");
    await type(phone, "15 gp", "15 gp");
    press(phone, "Write it down");
    await settle();
    const out = saved as Item | null;
    expect(out).not.toBeNull();
    expect(out!.category).toBe("weapon");
    expect(out!.damage).toBe("1d8");
    /* Typed as gold, stored as copper, like every other price in the app. */
    expect(out!.cost).toBe(1500);
  });
});

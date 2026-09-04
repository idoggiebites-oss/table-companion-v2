import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, PHONE, DESK, type Phone } from "../../../tests/phone";
import { EncounterBuilder } from "./EncounterBuilder";
import type { Encounter } from "./encounter";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const nothing = () => {};

/*
 * The collapsed state, and the open one.
 *
 * Opening the drawer loads the bestiary, and this tier's config says "no
 * server, no navigation" — so the compendium is injected rather than fetched.
 * `bestiary` has always taken an optional fetcher, the same door `statblock`
 * and `pushKey` leave open; that is what makes this screen testable here at
 * all, and it is why the prop exists.
 */
describe("the encounter builder, collapsed", () => {
  for (const size of [PHONE, DESK]) {
    it(`is one clean button at ${String(size.width)}`, async () => {
      phone = await mountPhone(<EncounterBuilder partyLevels={[]} onSave={nothing} />, "light", size);
      const toggle = phone.doc.querySelector("button");
      expect(toggle?.textContent).toBe("Build one");
      expect(phone.doc.querySelector('[data-testid="builder"]')).toBeNull();
      expect(phone.smallTargets()).toEqual([]);
      expect(phone.mislabelled()).toEqual([]);
    });
  }

  it("names what it does rather than a generic label", async () => {
    phone = await mountPhone(<EncounterBuilder partyLevels={[]} onSave={nothing} />);
    expect(phone.doc.querySelector("button")?.textContent).toBe("Build one");
  });
});

/*
 * The open builder, with the compendium faked.
 *
 * `bestiary` has always taken an optional fetcher — the same door `statblock`
 * and `pushKey` leave open — so this screen does not need the network to be
 * tested, and the component tier's own rule ("no server, no navigation") is
 * kept rather than worked around.
 */
describe("the builder, open", () => {
  const ROWS = [
    { id: "goblin", name: "Goblin", cr: 0.25, kind: "humanoid" },
    { id: "ghoul", name: "Ghoul", cr: 1, kind: "undead" },
  ];
  const fake = (async () =>
    new Response(JSON.stringify(ROWS), { headers: { "content-type": "application/json" } })
  ) as unknown as typeof fetch;

  const openIt = async (onSave: (e: Encounter) => void = () => {}) => {
    const p = await mountPhone(
      <EncounterBuilder partyLevels={[3, 3, 3]} onSave={onSave} fetcher={fake} />,
    );
    [...p.doc.querySelectorAll("button")]
      .find((b) => (b.textContent ?? "").includes("Build one"))!.click();
    await new Promise((r) => setTimeout(r, 60));
    return p;
  };

  it("searches the bestiary it was handed, not the network", async () => {
    phone = await openIt();
    const field = phone.doc.querySelector<HTMLInputElement>('[data-testid="builder-search"]')!;
    field.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "gob");
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    expect(phone.doc.body.textContent).toContain("Goblin");
    expect(phone.doc.body.textContent).not.toContain("Ghoul");
  });

  it("keeps every target at 44px and names each field once", async () => {
    phone = await openIt();
    expect(phone.smallTargets()).toEqual([]);
    expect(phone.mislabelled()).toEqual([]);
  });
});

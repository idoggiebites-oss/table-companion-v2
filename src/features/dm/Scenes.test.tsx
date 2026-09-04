import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { Scenes } from "./Scenes";
import type { Scene } from "./scene";
import type { Encounter } from "./encounter";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const cellar: Scene = {
  id: "s1", name: "The cellar", encounter: "e1",
  room: { light: "dark", terrain: ["difficult"] },
  note: "The stair gives under your weight.",
};
const ghouls: Encounter = {
  id: "e1", name: "Three ghouls", place: "",
  entries: [{ statblock: "ghoul", name: "Ghoul", count: 3, max: 22, ac: 12, cr: 1, disclosure: "hidden" }],
};
const nothing = () => {};
const mount = (scenes: readonly Scene[], onOpen = nothing as (s: Scene) => void) =>
  mountPhone(
    <Scenes scenes={scenes} encounters={[ghouls]}
            onPrepare={nothing} onForget={nothing} onOpen={onOpen} />,
  );

describe("the places drawer, on the reference phone", () => {
  it("keeps every target at 44px", async () => {
    phone = await mount([cellar]);
    expect(phone.smallTargets()).toEqual([]);
  });

  it("says what is IN a place rather than repeating its name", async () => {
    phone = await mount([cellar]);
    const row = phone.doc.querySelector('[data-testid="place-card"]')!;
    /* The encounter is named by its own name, resolved through the list —
       "e1" on screen would be the app talking to itself. */
    expect(row.textContent).toContain("dark · 1 thing about the ground · Three ghouls · a note");
  });

  it("offers one press, and gives back the whole place", async () => {
    let opened: Scene | null = null;
    phone = await mount([cellar], (s) => { opened = s; });
    phone.doc.querySelector<HTMLButtonElement>('[aria-label="Open The cellar"]')!.click();
    expect(opened).toEqual(cellar);
  });

  it("shows no numbers and no running order", async () => {
    /*
     * A drawer, not a track. V1's refusal, and the one place this screen
     * departs from the mockup: "a table goes where it goes, and a tool that
     * assumed an order would be wrong every session and smug about it."
     */
    phone = await mount([cellar, { ...cellar, id: "s2", name: "The mill" }]);
    const rows = [...phone.doc.querySelectorAll('[data-testid="place-card"]')];
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.textContent).not.toMatch(/^\s*\d/);
  });

  it("keeps the editor's own targets at 44px, six terrain rows included", async () => {
    /* The room picker's rows are custom buttons carrying two lines of text —
       the shape most likely to come out short. */
    phone = await mount([]);
    phone.doc.querySelector<HTMLButtonElement>("button")!.click();
    await new Promise((r) => setTimeout(r, 40));
    expect(phone.doc.querySelector('[data-testid="place-draft"]')).not.toBeNull();
    expect(phone.smallTargets()).toEqual([]);
  });

  it("names its fields once — the label the screen shows is the one announced", async () => {
    /* An `aria-label` on a control already named by its <label> replaces that
       name rather than adding to it, so the two disagree. See `mislabelled`. */
    phone = await mount([]);
    phone.doc.querySelector<HTMLButtonElement>("button")!.click();
    await new Promise((r) => setTimeout(r, 40));
    expect(phone.mislabelled()).toEqual([]);
  });

  it("explains what a place is when there are none", async () => {
    phone = await mount([]);
    expect(phone.doc.querySelector('[data-testid="places-empty"]')?.textContent)
      .toContain("what you mean to say when the door opens");
  });
});

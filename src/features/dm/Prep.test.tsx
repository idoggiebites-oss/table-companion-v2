import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, PHONE, DESK, type Phone, type Size } from "../../../tests/phone";
import { Prep } from "./Prep";
import { blankSession, type Prepared } from "./session";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const nothing = () => {};
const noop = {
  onStage: nothing, onForget: nothing, onNew: nothing,
  onSaveEncounter: nothing, onSendEncounter: nothing,
  onSaveSession: nothing, onForgetSession: nothing,
  onPrepare: nothing, onForgetScene: nothing, onOpenScene: nothing,
  onSaveNpc: nothing, onForgetNpc: nothing,
};

const keep: Prepared = { ...blankSession("s1"), title: "The Shattered Keep", number: 12, date: "2025-05-18" };

const mount = (session: Prepared | null, size: Size = PHONE) =>
  mountPhone(
    <Prep session={session} encounters={[]} scenes={[]} npcs={[]} partyLevels={[]} {...noop} />,
    "light", size,
  );

describe("Task 28's session rail, assembled with the outline beneath it", () => {
  for (const size of [PHONE, DESK]) {
    it(`keeps every target at 44px and every label true at ${String(size.width)}`, async () => {
      phone = await mount(keep, size);
      expect(phone.smallTargets()).toEqual([]);
      expect(phone.mislabelled()).toEqual([]);
    });
  }

  it("puts the session card before the outline, matching the mockup's order", async () => {
    phone = await mount(keep);
    const rail = phone.doc.querySelector('[aria-label="This session"]')!;
    const head = rail.querySelector('[data-testid="session-head"]')!;
    const outline = [...rail.querySelectorAll("h2")].find((h) => h.textContent === "Session outline")!;
    // DOCUMENT_POSITION_FOLLOWING: head precedes outline in the tree.
    expect(head.compareDocumentPosition(outline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("counts only what is built — no Quests, Loot, Notes, Random Tables or References row", async () => {
    phone = await mount(keep);
    const rows = [...phone.doc.querySelectorAll('[aria-label="This session"] li')].map((li) => li.textContent);
    expect(rows.some((t) => /Quests|Loot|Notes|Random Tables|References/.test(t ?? ""))).toBe(false);
    // What IS built, unchanged by this task.
    expect(rows.some((t) => t?.includes("Encounters"))).toBe(true);
    expect(rows.some((t) => t?.includes("Places"))).toBe(true);
    expect(rows.some((t) => t?.includes("People"))).toBe(true);
  });

  it("reads on a phone as the first stacked card, above every other rail section", async () => {
    phone = await mount(keep);
    const card = phone.doc.querySelector('[data-testid="session-head"]')!.getBoundingClientRect();
    const outline = phone.doc.querySelector('[aria-label="This session"] ul')!.getBoundingClientRect();
    expect(card.top).toBeLessThan(outline.top);
  });

  it("says so in words, with no session yet, rather than an outline with nothing to count", async () => {
    phone = await mount(null);
    expect(phone.doc.querySelector('[data-testid="session-empty"]')?.textContent)
      .toContain("Nothing planned yet");
  });
});

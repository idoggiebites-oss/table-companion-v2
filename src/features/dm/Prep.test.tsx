import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, PHONE, DESK, type Phone, type Size } from "../../../tests/phone";
import { Prep } from "./Prep";
import { blankEncounter, type Encounter } from "./encounter";
import { blankSession, type Prepared } from "./session";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const nothing = () => {};
const noop = {
  running: false, onReinforce: nothing,
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
    /* The outline is a <nav> now, not a heading and a list: the rail
       navigates, and the middle column shows the section you are on. */
    const outline = rail.querySelector('[aria-label="Session outline"]')!;
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

/* The outline row reads "Encounters" plus its count, so match the label. */
const toEncounters = async (p: Phone) => {
  for (const b of p.doc.querySelectorAll<HTMLButtonElement>("button")) {
    if (b.textContent?.startsWith("Encounters") === true) b.click();
  }
  await new Promise((r) => setTimeout(r, 30));
};

describe("an encounter can start a fight or join one", () => {
  const amb: Encounter = {
    ...blankEncounter("amb"), name: "Roadside Ambush",
    entries: [{ statblock: "goblin", name: "Goblin", count: 2, max: 7, ac: 15, cr: 0.25, disclosure: "hidden" }],
  };

  it("offers no reinforcement while no fight is running", async () => {
    /*
     * Reinforcing nothing is starting a fight the long way round, and
     * `tabs.ts`'s rule applies to buttons as much as tabs: what has nothing
     * behind it is not drawn.
     */
    phone = await mountPhone(
      <Prep session={null} encounters={[amb]} scenes={[]} npcs={[]} partyLevels={[]} {...noop} />,
      "light", DESK,
    );
    await toEncounters(phone);
    expect(phone.doc.querySelector('[data-testid="reinforce"]')).toBeNull();
  });

  it("offers it once there is a fight to join", async () => {
    phone = await mountPhone(
      <Prep session={null} encounters={[amb]} scenes={[]} npcs={[]} partyLevels={[]} {...noop} running />,
      "light", DESK,
    );
    await toEncounters(phone);
    expect(phone.doc.querySelector('[data-testid="reinforce"]')).not.toBeNull();
  });
});

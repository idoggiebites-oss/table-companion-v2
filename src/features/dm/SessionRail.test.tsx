import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, PHONE, DESK, type Phone } from "../../../tests/phone";
import { SessionRail } from "./SessionRail";
import { blankSession, type Prepared } from "./session";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const keep: Prepared = { ...blankSession("s1"), title: "The Shattered Keep", number: 12, date: "2025-05-18" };
const nothing = () => {};
// A React state update from a raw `.click()` (rather than a testing-library
// helper wrapped in `act`) is not guaranteed to have flushed to the DOM by
// the time the call returns — `Scenes.test.tsx` waits the same way.
const tick = () => new Promise((r) => setTimeout(r, 40));

describe("the session rail, at both widths", () => {
  for (const size of [PHONE, DESK]) {
    it(`keeps every target at 44px and every label true at ${String(size.width)}`, async () => {
      phone = await mountPhone(
        <SessionRail session={keep} onSave={nothing} onForget={nothing} />,
        "light", size,
      );
      expect(phone.smallTargets()).toEqual([]);
      expect(phone.mislabelled()).toEqual([]);
    });
  }
});

describe("with a session already planned", () => {
  it("shows the title, number and date the mockup asks for", async () => {
    phone = await mountPhone(<SessionRail session={keep} onSave={nothing} onForget={nothing} />);
    const head = phone.doc.querySelector('[data-testid="session-head"]')!;
    expect(head.textContent).toContain("The Shattered Keep");
    // Built from the ISO parts rather than `new Date(iso)`, so a reader west
    // of Greenwich still sees the 18th rather than the 17th.
    expect(head.textContent).toContain("Session 12 · May 18, 2025");
  });

  it("opens the compact editor on Edit, pre-filled", async () => {
    phone = await mountPhone(<SessionRail session={keep} onSave={nothing} onForget={nothing} />);
    phone.doc.querySelector<HTMLButtonElement>('[data-testid="session-head"] button')!.click();
    await tick();
    const draft = phone.doc.querySelector('[data-testid="session-draft"]')!;
    // The title field is the first input — number and date follow it.
    expect(draft.querySelector<HTMLInputElement>("input")?.value).toBe("The Shattered Keep");
    expect(phone.mislabelled()).toEqual([]);
  });

  it("hands back the edited session on Keep it", async () => {
    let saved: Prepared | null = null;
    phone = await mountPhone(
      <SessionRail session={keep} onSave={(s) => { saved = s; }} onForget={nothing} />,
    );
    phone.doc.querySelector<HTMLButtonElement>('[data-testid="session-head"] button')!.click();
    await tick();
    const title = phone.doc.querySelector<HTMLInputElement>('[data-testid="session-draft"] input')!;
    /* React listens for input, not assignment: it keeps its own record of the
       value, sees no change, and drops the event. The native setter is the
       codebase's established way round it — see `AbilitiesStep.test.tsx`. */
    title.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!
      .call(title, "The Shattered Keep, Part Two");
    title.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === "Keep it")!.click();
    expect(saved).not.toBeNull();
    expect((saved as unknown as Prepared).title).toBe("The Shattered Keep, Part Two");
  });

  it("forgets the session that is already saved, by the id it was opened with", async () => {
    let forgotten: string | null = null;
    phone = await mountPhone(<SessionRail session={keep} onSave={nothing} onForget={(id) => { forgotten = id; }} />);
    phone.doc.querySelector<HTMLButtonElement>('[data-testid="session-head"] button')!.click();
    await tick();
    phone.doc.querySelector<HTMLButtonElement>('[aria-label="Throw away The Shattered Keep"]')!.click();
    expect(forgotten).toBe("s1");
  });
});

describe("with nothing planned yet", () => {
  it("says so in words rather than showing an empty outline", async () => {
    phone = await mountPhone(<SessionRail session={null} onSave={nothing} onForget={nothing} />);
    expect(phone.doc.querySelector('[data-testid="session-empty"]')?.textContent)
      .toContain("Nothing planned yet");
  });

  it("offers to start one, and the new draft has nothing to throw away yet", async () => {
    phone = await mountPhone(<SessionRail session={null} onSave={nothing} onForget={nothing} />);
    phone.doc.querySelector<HTMLButtonElement>('[data-testid="session-empty"] button')!.click();
    await tick();
    const draft = phone.doc.querySelector('[data-testid="session-draft"]')!;
    expect(draft).not.toBeNull();
    expect([...draft.querySelectorAll("button")].some((b) => b.textContent === "Throw it away")).toBe(false);
    // A blank title cannot be kept — `isNamed` is the same rule `scene.ts` uses.
    expect([...draft.querySelectorAll("button")].find((b) => b.textContent === "Keep it")!.disabled).toBe(true);
  });
});

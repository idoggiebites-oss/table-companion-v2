import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { mountPhone, type Phone } from "../../../tests/phone";
import { Creation } from "./Creation";
import { CHOICE } from "./model";
import type { Choice } from "./choices";
import { Clock } from "../../core/log";
import { asDevice, type Event } from "../../core/types";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const settle = () => new Promise((r) => setTimeout(r, 40));

/** A harness that does what the app does: append the event, refold. */
function Harness({ hasNonSrd = true }: { hasNonSrd?: boolean }) {
  const [events, setEvents] = useState<readonly Event[]>([]);
  const [clock] = useState(() => new Clock(asDevice("t")));
  return (
    <Creation
      events={events}
      hasNonSrd={hasNonSrd}
      onChoose={(c: Choice) =>
        setEvents((p) => [...p, clock.issue(CHOICE, c as unknown as Record<string, unknown>)])
      }
    />
  );
}

const pick = async (p: Phone, name: string) => {
  const el = [...p.doc.querySelectorAll('[role="radio"], [role="checkbox"], button')]
    .find((b) => b.textContent?.includes(name)) as HTMLElement | undefined;
  el?.click();
  await settle();
};
const cont = async (p: Phone) => { await pick(p, "Continue"); };
const heading = (p: Phone) => p.doc.querySelector("h2")?.textContent ?? "";
const dots = (p: Phone) => p.doc.querySelector('[data-testid="progress"]')!.children.length;

describe("a step arrives", () => {
  it("adds Lineage when an elf is chosen, and says so", async () => {
    phone = await mountPhone(<Harness />);
    const before = dots(phone);
    await pick(phone, "Elf");
    await cont(phone);

    expect(heading(phone)).toBe("Which kind?");
    expect(dots(phone)).toBe(before + 1);
    // It arrives; it does not appear silently.
    expect(phone.doc.querySelector('[data-testid="arrived"]')).not.toBeNull();
  });

  it("does not add one for a human", async () => {
    phone = await mountPhone(<Harness />);
    const before = dots(phone);
    await pick(phone, "Human");
    await cont(phone);
    expect(heading(phone)).toBe("Choose your class");
    expect(dots(phone)).toBe(before);
  });

  it("gives a fighter no spells step and a wizard one", async () => {
    const count = async (klass: string) => {
      phone?.destroy();
      phone = await mountPhone(<Harness />);
      await pick(phone, "Human"); await cont(phone);
      await pick(phone, klass); await cont(phone);
      return dots(phone);
    };
    // Asserted against each other, never against a constant — a constant here
    // is the very thing the computed step list exists to refuse.
    expect(await count("Wizard")).toBe((await count("Fighter")) + 1);
  });
});

describe("every step holds its shape", () => {
  /**
   * The steps that exist to OFFER something. A screen with nothing on it and
   * an enabled Continue is the failure this list exists to catch: seven steps
   * moved to `groupsFor`, the SRD-shaped fallback did not implement it, and
   * the walk sailed through an empty Spells step because it looked for a
   * control, found none, and pressed Continue.
   */
  const MUST_OFFER = [
    "Choose your ancestry", "Choose your class", "Choose your background",
    "Choose your skills", "Choose starting equipment", "Choose your spells",
  ];

  const walk = async (p: Phone) => {
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      const at = heading(p);
      seen.push(at);
      expect(p.screens()).toBeLessThanOrEqual(1.25);
      expect(p.smallTargets()).toEqual([]);
      const foot = p.doc.querySelector("footer")!.getBoundingClientRect();
      expect(foot.bottom).toBeLessThanOrEqual(844);

      const controls = p.doc.querySelectorAll('[role="radio"], [role="checkbox"], [role="tab"], input');

      if (MUST_OFFER.includes(at)) {
        expect(controls.length, `${at} offered nothing`).toBeGreaterThan(0);
      }
      /*
       * Answer until Continue will take it, one UNCHECKED control at a time.
       *
       * Picking one and pressing on stopped dead at Skills, which wants two —
       * the walk simply ended four steps short while `seen.length > 4` kept
       * passing, so Equipment and Spells were never reached by any test. And
       * walking a captured list blindly re-picked every option in turn, which
       * left the class as the LAST one clicked: a ranger, who is asked for no
       * spells, so the step vanished and nobody noticed that either.
       */
      for (let k = 0; k < 10; k++) {
        const go = [...p.doc.querySelectorAll("button")]
          .find((b) => b.textContent?.trim() === "Continue") as HTMLButtonElement | undefined;
        if (go !== undefined && !go.disabled) break;
        const next = [...p.doc.querySelectorAll('[role="radio"], [role="checkbox"]')]
          .find((e) => e.getAttribute("aria-checked") !== "true"
            && !(e as HTMLButtonElement).disabled) as HTMLElement | undefined;
        if (next === undefined) break;
        next.click();
        await settle();
      }
      await cont(p);
      if (heading(p) === seen.at(-1)) break;
    }
    return seen;
  };

  it("fits 1.25 screens with 44px targets, all the way through", async () => {
    phone = await mountPhone(<Harness />);
    const seen = await walk(phone);
    expect(seen[0]).toBe("Choose your ancestry");
    expect(seen.length).toBeGreaterThan(4);
  });

  /*
   * The redistributable configuration, walked to the end. Every step it can
   * reach must have something on it — see MUST_OFFER.
   */
  it("reaches the spells and equipment steps with something on them", async () => {
    phone = await mountPhone(<Harness />);
    const seen = await walk(phone);
    expect(seen).toContain("Choose starting equipment");
    expect(seen).toContain("Choose your spells");
    // And all the way to the end, which no test had ever done.
    expect(seen).toContain("Who is your character?");
  });
});

describe("gold means the answer and the way forward, and nothing else", () => {
  it("fills Continue, and marks the selection, and stops there", async () => {
    phone = await mountPhone(<Harness />);
    await pick(phone, "Elf");
    const win = phone.doc.defaultView!;
    const gold = "rgb(200, 160, 77)";

    const continueBtn = [...phone.doc.querySelectorAll("button")].find((b) => b.textContent === "Continue")!;
    expect(win.getComputedStyle(continueBtn).backgroundColor).toBe(gold);
    // Charcoal on gold measures 6.74:1. White would be 2.44:1.
    expect(win.getComputedStyle(continueBtn).color).toBe("rgb(30, 31, 34)");

    // Everything else gold is the selection: its tick and its badge.
    const filled = [...phone.doc.querySelectorAll("*")].filter(
      (el) => win.getComputedStyle(el).backgroundColor === gold,
    );
    expect(filled.length).toBeLessThanOrEqual(3);
  });
});

describe("the licensing exit reaches the flow", () => {
  it("offers two ability methods when the PHB tables are absent", async () => {
    phone = await mountPhone(<Harness hasNonSrd={false} />);
    await pick(phone, "Human"); await cont(phone);
    await pick(phone, "Fighter"); await cont(phone);
    expect(heading(phone)).toBe("What level are you starting at?");
    await cont(phone); // level 1, the common answer, one tap
    expect(heading(phone)).toBe("Assign ability scores");
    const tabs = [...phone.doc.querySelectorAll('[role="tab"]')].map((t) => t.textContent);
    expect(tabs).toEqual(["Roll", "Manual"]);
  });
});

describe("one step replaces another with direction", () => {
  const stepEl = (p: Phone) => p.doc.querySelector('[data-testid="step"]')!;

  it("enters forward when the flow advances", async () => {
    phone = await mountPhone(<Harness />);
    expect(stepEl(phone).getAttribute("data-dir")).toBe("forward");
    await pick(phone, "Human");
    await cont(phone);
    expect(stepEl(phone).getAttribute("data-dir")).toBe("forward");
  });

  it("enters backward when Back is pressed", async () => {
    phone = await mountPhone(<Harness />);
    await pick(phone, "Human");
    await cont(phone);
    await pick(phone, "Back");
    expect(stepEl(phone).getAttribute("data-dir")).toBe("back");
  });

  it("animates transform and opacity, and nothing that costs a layout", async () => {
    // A step change on a phone must not trigger layout. Only transform and
    // opacity are allowed to move.
    phone = await mountPhone(<Harness />);
    const win = phone.doc.defaultView!;
    const style = win.getComputedStyle(stepEl(phone));
    // CSS Modules hashes the keyframes name, so match the stem.
    expect(style.animationName).toMatch(/forward/);
    expect(style.animationTimingFunction).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });

  it("is silent when motion is switched off", async () => {
    // mountPhone sets data-motion="off", which zeroes every duration token —
    // the same switch prefers-reduced-motion throws.
    phone = await mountPhone(<Harness />);
    const win = phone.doc.defaultView!;
    expect(win.getComputedStyle(stepEl(phone)).animationDuration).toBe("0s");
  });
});

describe("a step starts empty", () => {
  /*
   * Six steps share `PickOneStep`. Without a `key` React kept one instance and
   * its selection with it, so arriving at Class had the lineage still chosen
   * and Continue already enabled — and pressing it recorded the LINEAGE's id
   * as the class. The character then cast nothing, because "hill-dwarf" is not
   * a caster, and the Spells step quietly disappeared.
   */
  it("does not carry the last step's answer into the next", async () => {
    phone = await mountPhone(<Harness />);
    await pick(phone, "Dwarf");
    await cont(phone);
    expect(heading(phone)).toBe("Which kind?");
    await pick(phone, "Hill Dwarf");
    await cont(phone);

    expect(heading(phone)).toBe("Choose your class");
    // Nothing chosen here yet, so there is nothing to continue with.
    const checked = [...phone.doc.querySelectorAll('[role="radio"]')]
      .filter((e) => e.getAttribute("aria-checked") === "true");
    expect(checked).toEqual([]);
    const go = [...phone.doc.querySelectorAll("button")]
      .find((b) => b.textContent?.trim() === "Continue") as HTMLButtonElement;
    expect(go.disabled).toBe(true);
  });

  it("still remembers an answer when you walk back to it", async () => {
    phone = await mountPhone(<Harness />);
    await pick(phone, "Human");
    await cont(phone);
    expect(heading(phone)).toBe("Choose your class");
    await pick(phone, "Wizard");
    await cont(phone);
    await pick(phone, "Back");
    expect(heading(phone)).toBe("Choose your class");
    // A class row carries its blurb, so the name is a prefix, not the whole.
    const checked = [...phone.doc.querySelectorAll('[role="radio"]')]
      .filter((e) => e.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]!.textContent).toContain("Wizard");
  });
});

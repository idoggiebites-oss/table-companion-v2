import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { RollRequest } from "./RollRequest";
import type { Ask } from "./ask";
import { BLANK } from "../../rules/5e/abilities";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const scores = { ...BLANK, wis: 13, dex: 16 };
const ask: Ask = {
  id: "a1", who: [], name: "Perception", ability: "wis", skill: "perception",
  dc: 14, flavour: "You scan the ruins for hidden details.",
};
const text = (p: Phone) => p.doc.querySelector('[data-testid="roll-request"]')?.textContent ?? "";
const field = (p: Phone) => p.doc.querySelector<HTMLInputElement>('[data-testid="roll-total"]')!;
const type = (el: HTMLInputElement, v: string) => {
  const set = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")!.set!;
  set.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("the DM has asked you for a roll", () => {
  it("says what, why, and what to beat", async () => {
    phone = await mountPhone(
      <RollRequest ask={ask} scores={scores} level={6} proficient onAnswer={() => {}} onPass={() => {}} />,
    );
    /* "Perception Check", with "Wisdom · ability check" beneath — the book's
       Wisdom (Perception). Not "Wisdom Perception check", which is not a
       thing: the skill names the check and the ability is what you roll. */
    /*
     * One name for the roll, in one place. It read "Perception Check" over a
     * large "Wisdom" — two different words in the two biggest slots — and
     * Arturo read it, twice, as the app asking for a Wisdom roll. The ability
     * is said once, small, as where the modifier comes from.
     */
    expect(text(phone)).toContain("Perception Check");
    expect(text(phone)).toContain("rolled with Wisdom");
    expect(text(phone)).not.toContain("ability check");
    expect(text(phone)).toContain("You scan the ruins for hidden details.");
    expect(phone.doc.querySelector('[data-testid="dc"]')?.textContent).toBe("14");
  });

  it("names a bare ability check once", async () => {
    const { skill: _none, ...bare } = ask;
    phone = await mountPhone(
      <RollRequest ask={{ ...bare, name: "Wisdom" }} scores={scores} level={6}
                   onAnswer={() => {}} onPass={() => {}} />,
    );
    expect(text(phone)).toContain("Wisdom Check");
  });

  it("calls a saving throw a saving throw", async () => {
    /* Arturo: "not all rolls are perception checks." A save is what a DM asks
       for every time a spell or a breath weapon lands, and there was no way to
       ask for one — every ask was a check. */
    phone = await mountPhone(
      <RollRequest ask={{ id: "s1", who: [], kind: "save", name: "Dexterity", ability: "dex", dc: 15 }}
                   scores={scores} level={6} onAnswer={() => {}} onPass={() => {}} />,
    );
    expect(text(phone)).toContain("Dexterity Saving Throw");
    expect(text(phone)).not.toContain("Check");
    expect(text(phone)).toContain("rolled with Dexterity");
  });

  it("draws no difficulty class when the DM did not say one", async () => {
    /* A DC of "—" is a number the player would try to read. */
    const { dc: _drop, ...quiet } = ask;
    phone = await mountPhone(
      <RollRequest ask={quiet} scores={scores} level={6} onAnswer={() => {}} onPass={() => {}} />,
    );
    expect(phone.doc.querySelector('[data-testid="dc"]')).toBeNull();
  });

  it("shows the modifier, and adds proficiency only when it applies", async () => {
    phone = await mountPhone(
      <RollRequest ask={ask} scores={scores} level={6} proficient onAnswer={() => {}} onPass={() => {}} />,
    );
    /* WIS 13 is +1; level 6 is +3 proficiency. */
    expect(text(phone)).toContain("+1");
    expect(text(phone)).toContain("+3");
    expect(text(phone)).toContain("+4");
  });

  it("shows Guidance without adding it, because it is a die", async () => {
    /* A total that quietly included a d4 would be a number this app invented. */
    phone = await mountPhone(
      <RollRequest ask={ask} scores={scores} level={6} guidance onAnswer={() => {}} onPass={() => {}} />,
    );
    expect(text(phone)).toContain("+1d4");
    expect(text(phone)).toContain("Total bonus+1");
  });

  it("rolls nothing — it takes the total off a physical die", async () => {
    phone = await mountPhone(
      <RollRequest ask={ask} scores={scores} level={6} onAnswer={() => {}} onPass={() => {}} />,
    );
    expect(text(phone)).toContain("Roll a physical die");
    expect(field(phone).value).toBe("");
  });

  it("will not submit nothing", async () => {
    const got: number[] = [];
    phone = await mountPhone(
      <RollRequest ask={ask} scores={scores} level={6} onAnswer={(t) => got.push(t)} onPass={() => {}} />,
    );
    const submit = phone.doc.querySelector<HTMLButtonElement>('[data-testid="roll-submit"]')!;
    expect(submit.disabled).toBe(true);
    type(field(phone), "17");
    await new Promise((r) => setTimeout(r, 20));
    expect(submit.disabled).toBe(false);
    submit.click();
    expect(got).toEqual([17]);
  });

  it("treats cancel as a pass, which is an answer", async () => {
    let passed = false;
    phone = await mountPhone(
      <RollRequest ask={ask} scores={scores} level={6} onAnswer={() => {}} onPass={() => { passed = true; }} />,
    );
    phone.doc.querySelector<HTMLButtonElement>('[data-testid="roll-pass"]')!.click();
    expect(passed).toBe(true);
  });

  it("is a dialog, legible and honestly labelled on a phone", async () => {
    phone = await mountPhone(
      <RollRequest ask={ask} scores={scores} level={6} onAnswer={() => {}} onPass={() => {}} />,
    );
    const dialog = phone.doc.querySelector('[data-testid="roll-request"]')!;
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(phone.smallTargets()).toEqual([]);
    expect(phone.mislabelled()).toEqual([]);
  });
});

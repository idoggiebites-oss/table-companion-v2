import { describe, it, expect, afterEach, vi } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { AbilitiesStep } from "./AbilitiesStep";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const settle = () => new Promise((r) => setTimeout(r, 30));
const btn = (p: Phone, name: string) =>
  [...p.doc.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent?.trim()) === name);
const tabs = (p: Phone) => [...p.doc.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim());

describe("the ability step, on the reference phone", () => {
  it("fits the creation budget of 1.25 screens", async () => {
    phone = await mountPhone(
      <AbilitiesStep index={2} total={8} onContinue={() => {}} onBack={() => {}}
        recommended={{ klass: "Wizard", order: ["int", "dex", "con", "wis", "cha", "str"] }} />,
    );
    expect(phone.screens()).toBeLessThanOrEqual(1.25);
  });

  it("puts every tap target at 44px", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    expect(phone.smallTargets()).toEqual([]);
  });

  it("keeps the question and the first options above the fold", async () => {
    // You may scroll to reach the sixth ability. You may never scroll to find
    // out what is being asked.
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    const q = phone.doc.querySelector("h2")!.getBoundingClientRect();
    const seg = phone.doc.querySelector('[role="tablist"]')!.getBoundingClientRect();
    expect(q.bottom).toBeLessThan(844);
    expect(seg.bottom).toBeLessThan(844);
  });

  it("pins the counter directly above the action bar", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    const counter = phone.doc.querySelector('[data-testid="counter"]')!.getBoundingClientRect();
    const cont = btn(phone, "Continue")!.getBoundingClientRect();
    expect(counter.bottom).toBeLessThanOrEqual(cont.top + 1);
    expect(counter.bottom).toBeLessThanOrEqual(844);
  });

  it("draws one dot per step in this character's list", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={9} onContinue={() => {}} />);
    const bar = phone.doc.querySelector('[data-testid="progress"]')!;
    expect(bar.children).toHaveLength(9);
    expect(bar.getAttribute("aria-valuenow")).toBe("3");
  });
});

describe("a score is typed, not stepped", () => {
  const field = (p: Phone, name: string) =>
    [...p.doc.querySelectorAll("input")].find((i) => i.getAttribute("aria-label") === name)!;
  const type = async (p: Phone, name: string, value: string) => {
    const el = field(p, name);
    el.focus();
    // React listens for input, not assignment.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    el.blur();
    await settle();
  };

  it("takes a score in one go", async () => {
    // Fifteen is seven presses away with a stepper, and one number to type.
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    await type(phone, "Strength", "15");
    expect(field(phone, "Strength").value).toBe("15");
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("18 / 27");
  });

  it("refuses 16 and says why, rather than silently rewriting it", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    await type(phone, "Strength", "16");
    expect(phone.doc.querySelector('[role="alert"]')!.textContent).toContain("between 8 and 15");
    expect(field(phone, "Strength").value).toBe("8"); // unchanged
  });

  it("refuses a score the budget cannot afford, and names the shortfall", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    for (const a of ["Strength", "Dexterity", "Constitution"]) await type(phone, a, "15");
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("0 / 27");
    await type(phone, "Intelligence", "14");
    expect(phone.doc.querySelector('[role="alert"]')!.textContent).toContain("only 0 left");
    expect(field(phone, "Intelligence").value).toBe("8");
  });

  it("lets a score come back down", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    await type(phone, "Strength", "15");
    await type(phone, "Strength", "10");
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("25 / 27");
  });

  it("reports the choice as an event when continued", async () => {
    const onContinue = vi.fn();
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={onContinue} />);
    await type(phone, "Wisdom", "12");
    btn(phone, "Continue")!.click();
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onContinue.mock.calls[0]![0]).toBe("point-buy");
    expect((onContinue.mock.calls[0]![1] as { wis: number }).wis).toBe(12);
  });
});

describe("the licensing exit", () => {
  it("offers four methods with the PHB tables", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} hasNonSrd onContinue={() => {}} />);
    expect(tabs(phone)).toEqual(["Point Buy", "Standard Array", "Roll", "Manual"]);
  });

  it("offers two, not four with two greyed out, without them", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} hasNonSrd={false} onContinue={() => {}} />);
    expect(tabs(phone)).toEqual(["Roll", "Manual"]);
    expect(phone.doc.body.textContent).not.toContain("Point Buy");
    // No budget to count — Roll counts what has been placed instead.
    expect(phone.doc.body.textContent).not.toContain("Points remaining");
    expect(phone.doc.body.textContent).toContain("Scores placed");
  });
});


describe("Roll hands you six numbers and asks where they go", () => {
  const el = (p: Phone, label: string) =>
    [...p.doc.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === label);
  const pick = async (p: Phone, label: string) => { el(p, label)!.click(); await settle(); };
  const toRoll = async (p: Phone) => {
    [...p.doc.querySelectorAll('[role="tab"]')].find((t) => t.textContent === "Roll")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await settle();
  };

  it("counts 3 to 18, because that is what 4d6 drop lowest can be", async () => {
    // Not 1 to 20. The app never rolls; it holds a total somebody threw.
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    await toRoll(phone);
    expect(el(phone, "Total 3")).toBeTruthy();
    expect(el(phone, "Total 18")).toBeTruthy();
    expect(el(phone, "Total 2")).toBeUndefined();
    expect(el(phone, "Total 19")).toBeUndefined();
  });

  it("becomes a pool once six totals are in", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    await toRoll(phone);
    expect(phone.doc.querySelector('[data-testid="pool"]')).toBeNull();
    for (const v of [15, 14, 13, 12, 10, 8]) await pick(phone, `Total ${v}`);
    expect(phone.doc.querySelector('[data-testid="pool"]')).not.toBeNull();
    expect(el(phone, "Total 15")).toBeUndefined(); // the pad is done
  });

  it("assigns in two taps, a value then an ability", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    await toRoll(phone);
    for (const v of [15, 14, 13, 12, 10, 8]) await pick(phone, `Total ${v}`);

    await pick(phone, "Value 15");
    await pick(phone, "Strength");
    expect(el(phone, "Strength")!.textContent).toContain("15");
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("1 / 6");
  });

  it("puts a value back rather than overwriting it", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    await toRoll(phone);
    for (const v of [15, 14, 13, 12, 10, 8]) await pick(phone, `Total ${v}`);
    await pick(phone, "Value 15");
    await pick(phone, "Strength");
    await pick(phone, "Strength");
    expect(el(phone, "Value 15")).toBeTruthy(); // loose again, not lost
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("0 / 6");
  });

  it("will not continue until all six are placed", async () => {
    const onContinue = vi.fn();
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={onContinue} />);
    await toRoll(phone);
    for (const v of [15, 14, 13, 12, 10, 8]) await pick(phone, `Total ${v}`);
    expect((btn(phone, "Continue") as HTMLButtonElement).disabled).toBe(true);

    for (const [value, ability] of [[15, "Strength"], [14, "Dexterity"], [13, "Constitution"],
                                    [12, "Intelligence"], [10, "Wisdom"], [8, "Charisma"]] as const) {
      await pick(phone, `Value ${value}`);
      await pick(phone, ability);
    }
    expect((btn(phone, "Continue") as HTMLButtonElement).disabled).toBe(false);
    btn(phone, "Continue")!.click();
    expect(onContinue.mock.calls[0]![1]).toMatchObject({ str: 15, dex: 14, cha: 8 });
  });

  it("starts Standard Array with the six the book gives", async () => {
    phone = await mountPhone(<AbilitiesStep index={2} total={8} onContinue={() => {}} />);
    [...phone.doc.querySelectorAll('[role="tab"]')].find((t) => t.textContent === "Standard Array")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    for (const v of [15, 14, 13, 12, 10, 8]) expect(el(phone, `Value ${v}`)).toBeTruthy();
    expect(el(phone, "Total 15")).toBeUndefined(); // nothing to throw
  });
});

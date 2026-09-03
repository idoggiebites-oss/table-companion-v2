import { describe, it, expect, afterEach, vi } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { LevelUp } from "./LevelUp";
import { EMPTY, type Build } from "../creation/model";
import { BLANK } from "../../rules/5e/abilities";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const settle = () => new Promise((r) => setTimeout(r, 40));
const at = (klass: string, level: number): Build => ({
  ...EMPTY,
  classes: [{ id: klass, level, subclass: null }],
  level,
  scores: { ...BLANK, str: 15, con: 14 },
});
const btn = (p: Phone, text: string) =>
  [...p.doc.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes(text));

describe("levelling up, on the reference phone", () => {
  it("fits the creation budget and keeps every target at 44px", async () => {
    phone = await mountPhone(<LevelUp build={at("fighter", 3)} onBack={() => {}} onTake={() => {}} />);
    expect(phone.screens()).toBeLessThanOrEqual(1.25);
    expect(phone.smallTargets()).toEqual([]);
  });

  it("says what the level gives before it is taken", async () => {
    phone = await mountPhone(<LevelUp build={at("fighter", 3)} onBack={() => {}} onTake={() => {}} />);
    const detail = phone.doc.querySelector('[data-testid="detail"]')!;
    // CON 14 is +2, so a d10 class gains 6 + 2. The screen says what the
    // sheet will do, not what the die averages.
    expect(detail.textContent).toContain("+8 hit points");
    expect(detail.textContent).toContain("+2 Constitution");
    expect(detail.textContent).toContain("ability score improvement");
  });

  it("will not take a level until the improvement is spent", async () => {
    const onTake = vi.fn();
    phone = await mountPhone(<LevelUp build={at("fighter", 3)} onBack={() => {}} onTake={onTake} />);
    const take = btn(phone, "Take the level")!;
    expect((take as HTMLButtonElement).disabled).toBe(true);

    btn(phone, "Strength")!.click();
    await settle();
    expect((btn(phone, "Take the level") as HTMLButtonElement).disabled).toBe(true);
    btn(phone, "Constitution")!.click();
    await settle();
    expect((btn(phone, "Take the level") as HTMLButtonElement).disabled).toBe(false);
  });

  it("spends two points and no more", async () => {
    phone = await mountPhone(<LevelUp build={at("fighter", 3)} onBack={() => {}} onTake={() => {}} />);
    for (const a of ["Strength", "Constitution"]) { btn(phone, a)!.click(); await settle(); }
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("2 / 2");
  });

  /*
   * A third tap starts over rather than doing nothing. A button that is
   * pressable and has no effect reads as a bug; restarting is at least legible.
   */
  it("starts over on a third point rather than ignoring the tap", async () => {
    phone = await mountPhone(<LevelUp build={at("fighter", 3)} onBack={() => {}} onTake={() => {}} />);
    for (const a of ["Strength", "Constitution", "Dexterity"]) { btn(phone, a)!.click(); await settle(); }
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("1 / 2");
  });

  /*
   * +2 to one ability is legal and common, and the old toggle could not
   * express it — it only ever offered two DIFFERENT abilities.
   */
  it("puts both points on one ability when asked twice", async () => {
    const onTake = vi.fn();
    phone = await mountPhone(<LevelUp build={at("fighter", 3)} onBack={() => {}} onTake={onTake} />);
    btn(phone, "Strength")!.click(); await settle();
    btn(phone, "Strength")!.click(); await settle();
    expect(phone.doc.querySelector('[data-testid="counter"]')!.textContent).toBe("2 / 2");
    btn(phone, "Take the level")!.click();
    expect(onTake).toHaveBeenCalledWith(
      expect.objectContaining({ asi: { abilities: ["str", "str"] } }),
    );
  });

  it("asks nothing but hit points at a level that grants nothing", async () => {
    const onTake = vi.fn();
    phone = await mountPhone(<LevelUp build={at("fighter", 1)} onBack={() => {}} onTake={onTake} />);
    expect(phone.doc.querySelector('[data-testid="counter"]')).toBeNull();
    btn(phone, "Take the level")!.click();
    expect(onTake).toHaveBeenCalledWith({ klass: "fighter", classLevel: 2, hp: 6 });
  });

  it("asks a wizard for its path at second level", async () => {
    const onTake = vi.fn();
    phone = await mountPhone(
      <LevelUp build={at("wizard", 1)} paths={() => [{ id: "evocation", name: "School of Evocation" }]}
        onBack={() => {}} onTake={onTake} />,
    );
    expect(phone.doc.body.textContent).toContain("School of Evocation");
    expect((btn(phone, "Take the level") as HTMLButtonElement).disabled).toBe(true);

    btn(phone, "School of Evocation")!.click();
    await settle();
    btn(phone, "Take the level")!.click();
    expect(onTake).toHaveBeenCalledWith({ klass: "wizard", classLevel: 2, hp: 4, subclass: "evocation", subclassName: "School of Evocation" });
  });

  it("never asks anyone to throw a hit die", async () => {
    // The app does not roll. The average is taken and shown, not asked for.
    phone = await mountPhone(<LevelUp build={at("wizard", 1)} onBack={() => {}} onTake={() => {}} />);
    const raise = [...phone.doc.querySelectorAll("button")]
      .find((b) => b.getAttribute("aria-label") === "Raise Hit points gained") as HTMLButtonElement;
    expect(raise.disabled).toBe(true);
  });
});

describe("taking a level in something new", () => {
  const OTHERS = [{ id: "wizard", name: "Wizard" }, { id: "barbarian", name: "Barbarian" }];

  /* Without these the list was the character's own classes only, so a
     character could never multiclass after creation at all. */
  it("offers classes the character does not have", async () => {
    phone = await mountPhone(
      <LevelUp build={at("fighter", 3)} others={OTHERS} onBack={() => {}} onTake={() => {}} />,
    );
    expect(btn(phone, "Wizard")).not.toBeNull();
  });

  /*
   * The rule cuts both ways and people forget the first half: taking a level
   * in something new requires the minimums of the class you are LEAVING too.
   */
  it("says why a class will not have them", async () => {
    const weak = { ...at("fighter", 3), scores: { ...BLANK, str: 16, int: 10 } };
    phone = await mountPhone(
      <LevelUp build={weak} others={OTHERS} onBack={() => {}} onTake={() => {}} />,
    );
    btn(phone, "Wizard")!.click();
    await settle();
    expect(phone.doc.querySelector('[data-testid="blocked"]')!.textContent)
      .toContain("Wizard needs Intelligence 13");
    expect((btn(phone, "Take the level") as HTMLButtonElement).disabled).toBe(true);
  });

  it("lets them through when the minimums are met", async () => {
    const able = { ...at("fighter", 3), scores: { ...BLANK, str: 16, int: 14 } };
    phone = await mountPhone(
      <LevelUp build={able} others={OTHERS} onBack={() => {}} onTake={() => {}} />,
    );
    btn(phone, "Wizard")!.click();
    await settle();
    expect(phone.doc.querySelector('[data-testid="blocked"]')).toBeNull();
  });

  /* A dip rolls its NEW class's die, not the one they started with. */
  it("offers the new class's die, not the old one", async () => {
    const onTake = vi.fn();
    const able = { ...at("fighter", 3), scores: { ...BLANK, str: 16, int: 14 } };
    phone = await mountPhone(
      <LevelUp build={able} others={OTHERS} dieFor={(k: string) => (k === "wizard" ? 6 : 10)}
               onBack={() => {}} onTake={onTake} />,
    );
    btn(phone, "Wizard")!.click();
    await settle();
    btn(phone, "Take the level")!.click();
    // A d6 averages 4; the fighter's d10 averages 6.
    expect(onTake).toHaveBeenCalledWith(expect.objectContaining({ klass: "wizard", hp: 4, die: 6 }));
  });
});

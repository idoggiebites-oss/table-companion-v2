import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { Turn } from "./Turn";
import { FRESH } from "../dm/economy";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const text = (p: Phone) => p.doc.querySelector('[data-testid="turn"]')?.textContent ?? "";
const tiles = (p: Phone) => [...p.doc.querySelectorAll<HTMLButtonElement>('[data-testid="turn-option"]')];
const byName = (p: Phone, name: string) =>
  tiles(p).find((b) => (b.getAttribute("aria-label") ?? "").startsWith(`${name}:`));

describe("the menu is the teaching", () => {
  it("shows every option, including the ones this character cannot take", async () => {
    /*
     * V1's argument, and the reason a menu that hides things is worse than one
     * that greys them: "nobody discovers Dodge by reading a character sheet."
     * An unarmed, spell-less character still gets taught Attack and Cast.
     */
    phone = await mountPhone(<Turn spent={FRESH} armed={false} caster={false} onTake={() => {}} />);
    for (const named of ["Dodge", "Disengage", "Dash", "Hide", "Help", "Shove", "Ready", "Search"]) {
      expect(text(phone)).toContain(named);
    }
    expect(byName(phone, "Attack")).toBeDefined();
    expect(byName(phone, "Cast a spell")).toBeDefined();
  });

  it("says WHY an option is blocked, where the sentence would be", async () => {
    phone = await mountPhone(<Turn spent={FRESH} armed={false} caster={false} onTake={() => {}} />);
    expect(byName(phone, "Attack")?.disabled).toBe(true);
    expect(byName(phone, "Attack")?.getAttribute("aria-label")).toContain("equip a weapon");
    expect(byName(phone, "Cast a spell")?.getAttribute("aria-label")).toContain("no spells");
  });

  it("does not teach a fighter to cast, but does teach a caster", async () => {
    phone = await mountPhone(<Turn spent={FRESH} armed caster onTake={() => {}} />);
    expect(byName(phone, "Cast a spell")?.disabled).toBe(false);
    expect(byName(phone, "Attack")?.disabled).toBe(false);
  });

  it("explains a consequence rather than a mechanism", async () => {
    /* "Attacks against you have disadvantage" teaches; "you take the Dodge
       action" teaches nothing. */
    phone = await mountPhone(<Turn spent={FRESH} armed caster={false} onTake={() => {}} />);
    expect(text(phone)).toContain("Attacks against you have disadvantage");
    expect(text(phone)).toContain("without anyone getting a free swing");
  });

  it("blocks what the turn has already paid for, and leaves the rest", async () => {
    phone = await mountPhone(
      <Turn spent={{ action: true, bonus: false, reaction: false }} armed caster={false} onTake={() => {}} />,
    );
    expect(byName(phone, "Dodge")?.disabled).toBe(true);
    expect(byName(phone, "Dodge")?.getAttribute("aria-label")).toContain("action is gone");
    /* The off-hand swing costs a bonus action, which is still in hand. */
    expect(byName(phone, "Off-hand attack")?.disabled).toBe(false);
  });

  it("shows what is left as pips, spent rather than absent", async () => {
    /* A pip that vanished would leave a player counting what used to be there. */
    phone = await mountPhone(
      <Turn spent={{ action: true, bonus: false, reaction: false }} armed caster={false} onTake={() => {}} />,
    );
    expect(phone.doc.querySelector('[data-testid="pip-action"]')?.textContent).toContain("spent");
    expect(phone.doc.querySelector('[data-testid="pip-bonus"]')?.textContent).not.toContain("spent");
  });

  it("charges the right pip, and rolls nothing", async () => {
    const taken: string[] = [];
    phone = await mountPhone(<Turn spent={FRESH} armed caster onTake={(c) => taken.push(c)} />);
    byName(phone, "Dodge")?.click();
    byName(phone, "Off-hand attack")?.click();
    expect(taken).toEqual(["action", "bonus"]);
  });

  it("is legible and honestly labelled on a phone", async () => {
    phone = await mountPhone(<Turn spent={FRESH} armed caster onTake={() => {}} />);
    expect(phone.smallTargets()).toEqual([]);
    expect(phone.mislabelled()).toEqual([]);
  });
});

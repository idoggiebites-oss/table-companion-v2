import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mountPhone, type Phone } from "../../tests/phone";
import { useTheme } from "./useTheme";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());
beforeEach(() => localStorage.removeItem("theme"));

const settle = () => new Promise((r) => setTimeout(r, 30));

function Toggle() {
  const { showing, flip } = useTheme();
  return <button type="button" data-testid="flip" onClick={flip}>{showing}</button>;
}

const btn = (p: Phone) => p.doc.querySelector('[data-testid="flip"]') as HTMLButtonElement;
const attr = () => document.documentElement.getAttribute("data-theme");

describe("the theme control", () => {
  it("swaps the theme, and says which one is showing", async () => {
    phone = await mountPhone(<Toggle />);
    const was = btn(phone).textContent;

    btn(phone).click();
    await settle();

    expect(btn(phone).textContent).not.toBe(was);
    expect(attr()).toBe(btn(phone).textContent);
  });

  it("flips AGAIN, rather than sticking on the first choice", async () => {
    phone = await mountPhone(<Toggle />);
    btn(phone).click();
    await settle();
    const first = btn(phone).textContent;

    btn(phone).click();
    await settle();

    expect(btn(phone).textContent).not.toBe(first);
  });

  it("remembers the choice, because a theme is device state", async () => {
    phone = await mountPhone(<Toggle />);
    btn(phone).click();
    await settle();
    const chosen = btn(phone).textContent;
    phone.destroy();

    phone = await mountPhone(<Toggle />);
    await settle();
    expect(btn(phone).textContent).toBe(chosen);
  });

  it("starts from what the SCREEN shows, not from a hardcoded light", async () => {
    /*
     * The state was a hardcoded "light" while tokens.css followed the system,
     * so on a phone in dark mode the app rendered dark and the toggle believed
     * it was light: the first press set what was already set, and the button
     * did nothing.
     */
    phone = await mountPhone(<Toggle />);
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    expect(btn(phone).textContent).toBe(dark ? "dark" : "light");
  });
});

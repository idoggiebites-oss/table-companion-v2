import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { mountPhone, type Phone } from "../../../tests/phone";
import { useLongPress } from "./useLongPress";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const settle = () => new Promise((r) => setTimeout(r, 30));

/** Two rows: one that can be held, one beside it that must stay unchosen. */
function Pair({ ms }: { ms: number }) {
  const [asked, setAsked] = useState("");
  const [chose, setChose] = useState("");
  const hold = useLongPress(() => setAsked("elf"), ms);
  return (
    <div>
      <button type="button" data-testid="elf" {...hold} onClick={() => setChose("elf")}>Elf</button>
      <button type="button" data-testid="dwarf" onClick={() => setChose("dwarf")}>Dwarf</button>
      <output data-testid="asked">{asked}</output>
      <output data-testid="chose">{chose}</output>
    </div>
  );
}

const at = (p: Phone, id: string) => p.doc.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const read = (p: Phone, id: string) => at(p, id).textContent;

/* A press, as a phone delivers it: down, then held past the threshold. */
const press = async (p: Phone, id: string, ms: number) => {
  const el = at(p, id);
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
  await new Promise((r) => setTimeout(r, ms + 40));
};

describe("holding a row", () => {
  it("asks about it without choosing it", async () => {
    phone = await mountPhone(<Pair ms={60} />);
    await press(phone, "elf", 60);
    at(phone, "elf").dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    at(phone, "elf").click();
    await settle();

    expect(read(phone, "asked")).toBe("elf");
    expect(read(phone, "chose")).toBe("");
  });

  it("chooses nothing when the click lands on the NEIGHBOUR", async () => {
    /*
     * iOS lifts the art into a native drag and then stops delivering
     * pointermove, so the finger reaches the next card unseen and the click
     * lands there: holding Elf put the tick on Gnome. Movement-cancel is blind
     * to it and the held row's own handler never sees the click, so a fired
     * press has to swallow the next click wherever it lands.
     */
    phone = await mountPhone(<Pair ms={60} />);
    await press(phone, "elf", 60);
    at(phone, "dwarf").click();
    await settle();

    expect(read(phone, "asked")).toBe("elf");
    expect(read(phone, "chose")).toBe("");
  });

  it("lets go, so the next real tap still chooses", async () => {
    phone = await mountPhone(<Pair ms={60} />);
    await press(phone, "elf", 60);
    at(phone, "elf").dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    at(phone, "elf").click();

    /* The guard expires on its own — a press followed by no click at all must
       not leave a trap set for the next one. */
    await new Promise((r) => setTimeout(r, 560));
    at(phone, "dwarf").click();
    await settle();

    expect(read(phone, "chose")).toBe("dwarf");
  });

  it("does not fire when the finger has moved", async () => {
    phone = await mountPhone(<Pair ms={60} />);
    const el = at(phone, "elf");
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 10, clientY: 60 }));
    await new Promise((r) => setTimeout(r, 100));
    el.click();
    await settle();

    expect(read(phone, "asked")).toBe("");
    expect(read(phone, "chose")).toBe("elf");
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { WhatNow } from "./WhatNow";
import type { Prompt } from "./prompts";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const P: readonly Prompt[] = [
  { id: "still-hurt", text: "You are on 7 of 24 hit points.", go: "sheet", where: "Your sheet" },
  { id: "fight-open", text: "A fight is still running — round 3.", go: "fight", where: "The fight" },
];

describe("what to do about it", () => {
  it("keeps every target at 44px", async () => {
    phone = await mountPhone(<WhatNow prompts={P} onGo={() => {}} />);
    expect(phone.smallTargets()).toEqual([]);
  });

  it("says where each one goes before it is pressed", async () => {
    phone = await mountPhone(<WhatNow prompts={P} onGo={() => {}} />);
    const text = phone.doc.querySelector('[data-testid="prompts"]')?.textContent ?? "";
    expect(text).toContain("You are on 7 of 24 hit points.");
    expect(text).toContain("Your sheet");
  });

  it("goes only when pressed — nothing moves anybody on its own", async () => {
    const went: string[] = [];
    phone = await mountPhone(<WhatNow prompts={P} onGo={(t) => went.push(t)} />);
    expect(went).toEqual([]);
    phone.doc.querySelectorAll("button")[1]!.click();
    expect(went).toEqual(["fight"]);
  });

  it("shows nothing when there is nothing to do", async () => {
    phone = await mountPhone(<WhatNow prompts={[]} onGo={() => {}} />);
    expect(phone.doc.querySelector('[data-testid="prompts"]')).toBeNull();
  });
});

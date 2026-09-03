import { describe as suite, it, expect } from "vitest";
import { describe, crName, statblock, bestiary } from "./creatures";
import type { CreatureEntry } from "../../content/schema";

const dragon: CreatureEntry = {
  id: "adult-black-dragon", name: "Adult Black Dragon", kind: "creature",
  provenance: { tier: "unknown", source: "", book: null, order: Number.MAX_SAFE_INTEGER },
  cr: 14, type: "dragon", size: "H", ac: 19, hp: 195, legendary: 3, lair: true,
};

suite("how a creature reads in a list", () => {
  it("says the four things a DM picks on", () => {
    expect(describe(dragon)).toBe("CR 14 · Huge dragon · AC 19 · 195 hp");
  });

  it("writes a fractional rating the way the book does", () => {
    /* A list of "0.125" is a list nobody recognises. */
    expect(crName(0.125)).toBe("1/8");
    expect(crName(0.25)).toBe("1/4");
    expect(crName(0.5)).toBe("1/2");
    expect(crName(0)).toBe("0");
    expect(crName(14)).toBe("14");
  });

  it("spells the size out rather than showing the letter", () => {
    expect(describe({ ...dragon, size: "T", type: "beast" })).toContain("Tiny beast");
  });
});

suite("fetching, when the compendium is not there", () => {
  const missing = () => Promise.resolve(new Response("", { status: 404 }));

  it("hands back an empty bestiary rather than throwing", async () => {
    /* An SRD-only build ships no creatures at all, and that is a supported
       configuration — the only redistributable one. */
    expect(await bestiary(missing)).toEqual([]);
  });

  it("hands back no statblock rather than throwing", async () => {
    expect(await statblock("adult-black-dragon", missing)).toBeNull();
  });

  it("survives a phone in a basement", async () => {
    const offline = () => Promise.reject(new Error("network"));
    expect(await bestiary(offline)).toEqual([]);
    expect(await statblock("x", offline)).toBeNull();
  });
});

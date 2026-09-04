import { describe, it, expect } from "vitest";
import { detailFor } from "./detail";
import type { Loaded } from "./loaded";

const cls = (id: string, name: string, book: string | null = "phb") =>
  ({
    id, name,
    provenance: { source: book === null ? "" : "Player's Handbook (2014)", book, tier: "core" },
  }) as unknown as Loaded["classes"][number];

const loaded = {
  classes: [cls("fighter", "Fighter"), cls("bloodhunter", "Blood Hunter", null)],
  backgrounds: [],
} as unknown as Loaded;
const from = { byAncestry: new Map(), loaded };

describe("what the card says about a class", () => {
  it("says what it is like, not only where it came from", () => {
    /*
     * The bug this exists for: holding a class showed its name and its book
     * and nothing about the class. The compendium publishes `describe/class`
     * empty, so there was no prose to render — while Task 22's authored line
     * sat unread.
     */
    const d = detailFor("class", ["fighter"], undefined, from);
    expect(d?.label).toBe("Fighter");
    expect(d?.lead).toBe("Player's Handbook (2014)");
    expect(d?.lines?.[0]).toContain("Hit things, take hits");
  });

  it("says nothing extra about a class it ships no judgement about", () => {
    /* Task 22's rule: absent is honest, wrong is not. The card falls back to
       exactly what it always said. */
    const d = detailFor("class", ["bloodhunter"], undefined, from);
    expect(d?.label).toBe("Blood Hunter");
    expect(d?.lines?.some((l) => /Hit things|Wade in|magic/i.test(l))).toBe(false);
  });

  it("marks a class from no book as from elsewhere", () => {
    expect(detailFor("class", ["bloodhunter"], undefined, from)?.lines)
      .toContain("Elsewhere");
  });

  it("declines to explain a skill, which is its own explanation", () => {
    expect(detailFor("skills", ["athletics"], undefined, from)).toBeUndefined();
  });

  it("and an option it has never heard of", () => {
    expect(detailFor("class", ["nothing"], undefined, from)).toBeUndefined();
  });
});

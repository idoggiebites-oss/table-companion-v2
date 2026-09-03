import { describe, it, expect } from "vitest";
import { bookName, bookOrder, BOOKS } from "./books";

describe("headings for a list drawn from many books", () => {
  it("calls a book by the short name a heading can carry", () => {
    expect(bookName("phb")).toBe("Player's Handbook");
    expect(bookName("scag")).toBe("Sword Coast");
    expect(bookName("tce")).toBe("Tasha's");
  });

  it("calls anything it does not know Elsewhere, not nothing", () => {
    // The book table orders the list; it never hides from it.
    expect(bookName(null)).toBe("Elsewhere");
    expect(bookName("nonesuch")).toBe("Elsewhere");
  });

  it("puts Elsewhere last, whatever it contains", () => {
    expect(bookOrder(null)).toBeGreaterThan(bookOrder(BOOKS.at(-1)!.id));
  });

  it("orders headings by publication, not the alphabet", () => {
    const heads = ["tce", "phb", "xge", "scag"].sort((a, b) => bookOrder(a) - bookOrder(b));
    expect(heads.map(bookName)).toEqual([
      "Player's Handbook", "Sword Coast", "Xanathar's", "Tasha's",
    ]);
  });
});

import { describe, it, expect } from "vitest";
import { BOOKS, bookOf, bookOrder, isOfficialSource } from "./books";

/*
 * content.test.ts and books.grouping.test.ts already exercise bookOf/bookOrder/
 * bookName as part of the wider provenance and grouping story. This file is
 * the dedicated one for books.ts itself, and leans on the two things nothing
 * else covers: isOfficialSource (only ever hit indirectly through
 * provenanceOf), and the "elsewhere" families and second BOOKS block that
 * exist purely so a source that matches nothing here is treated correctly.
 */

describe("is this the game's own, at all", () => {
  it("is false for an empty source — no signal is not a positive match", () => {
    expect(isOfficialSource("")).toBe(false);
    expect(isOfficialSource("   ")).toBe(false);
  });

  it("is true for anything that resolves to one of the nineteen", () => {
    expect(isOfficialSource("Player's Handbook (2014)")).toBe(true);
  });

  /* The comment on isOfficialSource names this exact case: a Source: line is
     not a claim of officialness, because every third-party publication has
     one too. "Matthew Mercer - Gunslinger Martial Archetype" is a source,
     and a Gunslinger is not a fighter archetype the game printed. */
  it("does not mistake a person's name in a source line for a book", () => {
    expect(isOfficialSource("Matthew Mercer - Gunslinger Martial Archetype")).toBe(false);
    expect(bookOf("Matthew Mercer - Gunslinger Martial Archetype")).toBeNull();
  });

  it("is true for the free releases and organised-play families, unindexed by name", () => {
    // These never appear in BOOKS at all — matched by the regex family below.
    expect(isOfficialSource("Plane Shift: Amonkhet")).toBe(true);
    expect(isOfficialSource("Adventurers League")).toBe(true);
    expect(isOfficialSource("Adventurer League")).toBe(true); // the "s?" in the regex
    expect(isOfficialSource("Mulmaster Bonds and Backgrounds")).toBe(true);
  });

  it("still returns no book for a family match — it is official, not shelved", () => {
    expect(bookOf("Plane Shift: Amonkhet")).toBeNull();
  });
});

describe("the second block: adventures and companions, not just the nineteen hardcovers", () => {
  /*
   * The comment on this block names the exact failure it exists to prevent:
   * without Curse of Strahd and the Wild Beyond the Witchlight filed here,
   * their backgrounds and ancestries would read as somebody's homebrew.
   */
  it("recognises Curse of Strahd's backgrounds as the game's own", () => {
    expect(isOfficialSource("Curse of Strahd")).toBe(true);
    expect(bookOf("Curse of Strahd")).toBe("cos");
  });

  it("recognises the Wild Beyond the Witchlight's ancestries as the game's own", () => {
    expect(isOfficialSource("The Wild Beyond the Witchlight")).toBe(true);
    expect(bookOf("The Wild Beyond the Witchlight")).toBe("wbtw");
  });

  it("has no id collision between the nineteen and the second block", () => {
    // A copy-pasted id here would silently overwrite an entry in BY_ID/ORDER —
    // the same failure mode as the data-file duplicate this app has hit before.
    const ids = BOOKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("orders every entry before 'elsewhere', second block included", () => {
    for (const b of BOOKS) expect(bookOrder(b.id)).toBeLessThan(bookOrder(null));
  });
});

describe("matching a source past the noise a compendium adds", () => {
  it("matches the bare name", () => {
    expect(bookOf("Tasha's Cauldron of Everything")).toBe("tce");
  });

  it("strips a trailing edition year", () => {
    expect(bookOf("Player's Handbook (2014)")).toBe("phb");
  });

  it("matches a short form as a prefix of the full name", () => {
    // A table might write just "Volo's" — the short name is a prefix of the
    // book's full name, and the match has to run in that direction too.
    expect(bookOf("Volo's")).toBe("vgm");
  });

  it("is case-insensitive, because a compendium is not consistent about it", () => {
    expect(bookOf("PLAYER'S HANDBOOK")).toBe("phb");
  });

  it("does not match a book that only shares a first word", () => {
    // Both start with "Spelljammer" but diverge immediately after — matching
    // on the shared prefix alone would file one book's races under the other.
    expect(bookOf("Spelljammer: Astral Adventurer's Guide")).toBe("sjag");
    expect(bookOf("Spelljammer: Adventures in Space")).toBe("sais");
  });

  it("returns null rather than guessing at an unfiled source", () => {
    expect(bookOf("Grim Hollow: The Monster Grimoire")).toBeNull();
  });
});

describe("publication order for a heading", () => {
  it("sorts the nineteen by the year they shipped", () => {
    expect(bookOrder("phb")).toBeLessThan(bookOrder("scag"));
    expect(bookOrder("tce")).toBeLessThan(bookOrder("plan"));
  });

  it("puts null — unfiled, 'elsewhere' — after everything filed", () => {
    expect(bookOrder(null)).toBe(Number.MAX_SAFE_INTEGER);
    for (const b of BOOKS) expect(bookOrder(b.id)).toBeLessThan(bookOrder(null));
  });
});

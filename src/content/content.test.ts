import { describe, it, expect } from "vitest";
import corpus from "./__fixtures__/corpus.json" with { type: "json" };
import { nameMarks, isAxis, sourceMark, isCore } from "./marks";
import { provenanceOf, parseSource, rawSource, isMarked } from "./source";
import { bookOf, bookOrder, BOOKS } from "./books";
import { isClassFeature } from "./spells";
import { key, exact } from "./names";
import { mergeById } from "./merge";
import { loadKind } from "./load";
import { byProvenance } from "./schema";

type Sample = { kind: string; name: string; source: string; level?: number; school?: string };
const rows = corpus as Sample[];
const of = (kind: string) => rows.filter((r) => r.kind === kind);
const named = (n: string) => rows.find((r) => r.name === n)!;

describe("the axis trap", () => {
  // The expensive one. Reading a rarity or a baked-in choice as provenance
  // hides every magic item in the game, and looks exactly like it working.
  it("never reads a rarity as a source", () => {
    for (const item of of("item")) {
      const marks = nameMarks(item.name);
      if (!marks.some(isAxis)) continue;
      const mark = sourceMark(item.name);
      expect(mark === null || !isAxis(mark)).toBe(true);
    }
  });

  it("keeps a rarity-only item in the game's own material", () => {
    expect(isCore("Glamerweave (common)")).toBe(true);
    expect(isCore("Enchanted Ink (Uncommon)")).toBe(true);
    expect(isCore("Sunwing Crossbow Bolts (Rare) (20)")).toBe(true); // a quantity, not a publisher
    expect(isCore("Hammerhead Ship (Uncommon) (Vehicle)")).toBe(true); // a category
  });

  it("still hides a rarity item that really is somebody else's", () => {
    expect(isCore("Blade of Fire (Rare) (Ryoko)")).toBe(false);
    expect(sourceMark("Blade of Fire (Rare) (Ryoko)")).toBe("Ryoko");
  });

  it("never reads a baked-in choice as a source", () => {
    for (const feat of of("feat")) {
      const mark = sourceMark(feat.name);
      if (mark !== null) expect(isAxis(mark)).toBe(false);
    }
    expect(isCore("Resilient (Constitution)")).toBe(true);
    expect(isCore("Elemental Adept (Fire)")).toBe(true);
  });
});

describe("provenance", () => {
  it("reads the publication out of the Source line", () => {
    expect(parseSource("blah\nSource:\tPlayer's Handbook (2014) p. 110")).toBe("Player's Handbook (2014)");
    expect(parseSource("Source: Xanathar's Guide to Everything")).toBe("Xanathar's Guide to Everything");
  });

  it("keeps the classification that sits after the page number", () => {
    // "Tanares p. 190 (Indie)" loses its marker if the page strip runs first.
    // That is how (Indie) first measured as zero across 3,443 spells.
    const text = "Source: Player's Guide to Tanares p. 190 (Indie)";
    expect(parseSource(text)).toBe("Player's Guide to Tanares");
    expect(rawSource(text)).toContain("(Indie)");
    expect(provenanceOf("Fireball", text).tier).toBe("indie");
  });

  it("resolves every fixture row to a tier and never to undefined", () => {
    for (const r of rows) {
      const p = provenanceOf(r.name, `Source: ${r.source}`);
      expect(["official", "ua", "indie", "homebrew", "unknown"]).toContain(p.tier);
      expect(p).toHaveProperty("book");
      expect(typeof p.order).toBe("number");
    }
  });

  it("lets the name marker beat a source line the record inherited", () => {
    // "Dragonborn, Revenant (UA)" carries no text of its own. Its only Source
    // line comes from the base Dragonborn's description trait, so the prose
    // alone files a UA race under the Player's Handbook.
    const p = provenanceOf("Dragonborn, Revenant (UA)", "Source:\tPlayer's Handbook (2014) p. 32,");
    expect(p.tier).toBe("ua");
    expect(p.tier).not.toBe("official");
  });

  it("still trusts the source line when the name says nothing", () => {
    const p = provenanceOf("Dragonborn", "Source:\tPlayer's Handbook (2014) p. 32,");
    expect(p.tier).toBe("official");
    expect(p.book).toBe("phb");
  });

  it("takes the more conservative reading when the two signals disagree", () => {
    // "DnDBeyond Unearthed Arcana (Homebrew)" says both. Homebrew wins.
    const p = provenanceOf("Mousefolk, Softpaw (HB)", "Source: DnDBeyond Unearthed Arcana (Homebrew),");
    expect(p.tier).toBe("homebrew");
  });

  it("files the game's own to a book, and everything else to elsewhere", () => {
    const phb = provenanceOf("Dragonborn", "Source: Player's Handbook (2014) p. 32");
    expect(phb.tier).toBe("official");
    expect(phb.book).toBe("phb");
    expect(phb.order).toBe(0);

    const third = provenanceOf("Erina, Spiritfarer (TP)", "Source: Book of Ebon Tides p. 35 (Homebrew)");
    expect(third.book).toBeNull();
    expect(third.order).toBe(Number.MAX_SAFE_INTEGER); // elsewhere, and last
  });
});

describe("absence of evidence is not evidence", () => {
  // Classes carry no Source line and no name marker, so all twelve of the
  // game's own resolve to `unknown`. Treating unknown as third-party removed
  // every one of them from the class list. The markers hide; nothing else does.
  it("does not mark something merely because nothing is known about it", () => {
    const unknown = provenanceOf("Fighter", "");
    expect(unknown.tier).toBe("unknown");
    expect(isMarked(unknown)).toBe(false);
  });

  it("marks only what is positively somebody else's", () => {
    const tiers = { homebrew: true, indie: true, ua: true, official: false, unknown: false } as const;
    for (const [tier, marked] of Object.entries(tiers)) {
      expect(isMarked({ tier: tier as never, source: "", book: null, order: 0 })).toBe(marked);
    }
  });

  it("sorts unmarked material above marked, whatever the tier", () => {
    const e = (name: string, tier: "official" | "unknown" | "homebrew") =>
      ({ id: name, name, kind: "class" as const, provenance: { tier, source: "", book: null, order: 0 } });
    const sorted = [e("Zzz Homebrew", "homebrew"), e("Fighter", "unknown"), e("Elf", "official")].sort(byProvenance);
    expect(sorted.map((x) => x.name)).toEqual(["Elf", "Fighter", "Zzz Homebrew"]);
  });
});

describe("the book table", () => {
  it("matches a source string past its page, year and subtitle", () => {
    expect(bookOf("Player's Handbook (2014)")).toBe("phb");
    expect(bookOf("Tasha's Cauldron of Everything")).toBe("tce");
    expect(bookOf("Planescape: Adventures in the Multiverse - Sigil and the Outlands")).toBe("plan");
    expect(bookOf("Valda's Spire of Secrets")).toBeNull();
  });

  it("sorts in publication order and puts the unfiled last", () => {
    expect(bookOrder("phb")).toBeLessThan(bookOrder("tce"));
    expect(bookOrder("tce")).toBeLessThan(bookOrder("plan"));
    expect(bookOrder(null)).toBeGreaterThan(bookOrder(BOOKS.at(-1)!.id));
  });

  it("hides nothing — an unfiled thing still has a place", () => {
    expect(bookOf("Some Book Nobody Filed")).toBeNull();
    expect(Number.isFinite(bookOrder(null))).toBe(true);
  });
});

describe("spells that are not spells", () => {
  it("catches an entry with no school", () => {
    for (const s of of("spell")) {
      if (s.school === "") expect(isClassFeature({ name: s.name, school: s.school })).toBe(true);
    }
  });

  it("leaves a real spell alone", () => {
    const real = of("spell").filter((s) => !/^[A-Za-z ]+:/.test(s.name) && (s.school ?? "") !== "");
    expect(real.length).toBeGreaterThan(0);
    for (const s of real) expect(isClassFeature({ name: s.name, school: s.school ?? "" })).toBe(false);
  });

  it("catches a feature that carries a school anyway", () => {
    // Elemental Disciplines ship with a real school. A school is evidence,
    // not proof — which is why the prefix check is not redundant.
    const disciplines = of("spell").filter((s) => s.name.startsWith("Elemental Discipline:"));
    expect(disciplines.length).toBeGreaterThan(0);
    for (const d of disciplines) {
      expect(d.school).not.toBe("");
      expect(isClassFeature({ name: d.name, school: d.school ?? "" })).toBe(true);
    }
  });

  it("catches a prefixed feature even where a school leaked in", () => {
    expect(isClassFeature({ name: "Invocation: Agonizing Blast", school: "evocation" })).toBe(true);
    expect(isClassFeature({ name: "Maneuver: Riposte", school: "x" })).toBe(true);
    expect(isClassFeature({ name: "Fire Bolt", school: "evocation" })).toBe(false);
  });
});

describe("three spellings", () => {
  it("uninverts a subrace", () => {
    expect(key("Dwarf, Hill")).toBe("hill dwarf");
    expect(key("Elf, High")).toBe("high elf");
  });

  it("unprefixes a fighting style filed as a feat", () => {
    expect(key("Fighting Style: Archery")).toBe("archery");
  });

  it("drops the provenance marker but keeps the name", () => {
    expect(exact("Mousefolk, Softpaw (HB)")).toBe("Mousefolk, Softpaw");
    expect(key("Acid Splash (Alt) (HB)")).toBe("acid splash");
  });
});

describe("three layers, one merge", () => {
  it("lets a richer layer add to a thinner one", () => {
    const base = [{ id: "a", name: "Fireball", text: "" }];
    const over = [{ id: "a", name: "Fireball", text: "A bright streak…" }];
    expect(mergeById(base, over)[0]!.text).toBe("A bright streak…");
  });

  it("never lets a thinner file delete what a richer one knew", () => {
    const rich = [{ id: "a", name: "Fireball", text: "A bright streak…", damage: "8d6" }];
    const thin = [{ id: "a", name: "Fireball", text: "", damage: undefined }];
    const merged = mergeById(rich, thin)[0]!;
    expect(merged.text).toBe("A bright streak…");
    expect(merged.damage).toBe("8d6");
  });

  it("adds rows the base has never heard of", () => {
    const merged = mergeById([{ id: "a" }], [{ id: "b" }]);
    expect(merged.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
});

describe("the fixture is representative", () => {
  it("covers every tier and both trap populations", () => {
    const tiers = new Set(rows.map((r) => provenanceOf(r.name, `Source: ${r.source}`).tier));
    expect(tiers.has("official")).toBe(true);
    expect(tiers.has("homebrew")).toBe(true);
    expect(tiers.has("indie")).toBe(true);
    expect(of("item").some((i) => nameMarks(i.name).some(isAxis))).toBe(true);
    expect(of("feat").some((f) => nameMarks(f.name).some(isAxis))).toBe(true);
    expect(named("Dwarf, Hill")).toBeTruthy();
  });
});

describe("three layers, and absent is normal", () => {
  const res = (body: unknown, ok = true): Response =>
    ({ ok, json: async () => body } as unknown as Response);

  const entry = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
    id, name, kind: "race" as const,
    provenance: { tier: "official" as const, source: "PHB", book: "phb", order: 0 },
    ...extra,
  });

  it("works on the SRD alone when no compendium was built", async () => {
    // The only redistributable configuration. A missing bundle is a supported
    // deployment, not an error.
    const only404 = async (url: string) =>
      url.startsWith("/srd/") ? res([entry("elf", "Elf")]) : res(null, false);
    const rows = await loadKind("race", [], only404);
    expect(rows.map((r) => r.name)).toEqual(["Elf"]);
  });

  it("returns nothing rather than throwing when the device is offline", async () => {
    const offline = async () => { throw new Error("offline"); };
    await expect(loadKind("race", [], offline)).resolves.toEqual([]);
  });

  it("layers the compendium over the SRD without losing the SRD", async () => {
    const fetcher = async (url: string) =>
      url.startsWith("/srd/")
        ? res([entry("elf", "Elf", { traits: ["Darkvision"] })])
        : res([entry("elf", "Elf"), entry("mousefolk", "Mousefolk (HB)")]);
    const rows = await loadKind<ReturnType<typeof entry> & { traits?: string[] }>("race", [], fetcher);
    expect(rows).toHaveLength(2);
    // The bundled row is thinner. It must not delete what the SRD knew.
    expect(rows.find((r) => r.id === "elf")!.traits).toEqual(["Darkvision"]);
  });

  it("puts an imported layer on top of both", async () => {
    const fetcher = async () => res([entry("elf", "Elf")]);
    const rows = await loadKind<ReturnType<typeof entry> & { note?: string }>(
      "race", [{ id: "elf", note: "ours" }], fetcher,
    );
    expect(rows.find((r) => r.id === "elf")!.note).toBe("ours");
  });
});

describe("one comparator, one place", () => {
  it("sorts the game's own first, then by book, then by name", () => {
    const e = (name: string, tier: "official" | "homebrew", book: string | null, order: number) =>
      ({ id: name, name, kind: "race" as const, provenance: { tier, source: "", book, order } });
    const sorted = [
      e("Zzz Homebrew", "homebrew", null, Number.MAX_SAFE_INTEGER),
      e("Tasha Thing", "official", "tce", 11),
      e("Aaa Homebrew", "homebrew", null, Number.MAX_SAFE_INTEGER),
      e("Phb Thing", "official", "phb", 0),
    ].sort(byProvenance);
    expect(sorted.map((x) => x.name)).toEqual(["Phb Thing", "Tasha Thing", "Aaa Homebrew", "Zzz Homebrew"]);
  });
});

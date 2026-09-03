/**
 * Builds the committed test fixture from a real compendium.
 *
 * The corpus is the published books and is never committed, so tier 1 cannot
 * depend on it. This lifts a small, representative sample — a name and the
 * one-line Source string, no rules text — chosen to exercise every branch the
 * derivations have.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { rawSource } from "../../src/content/source";
import { nameMarks, isAxis } from "../../src/content/marks";
import { isClassFeature } from "../../src/content/spells";

type Row = { name?: string; text?: string; description?: string; level?: number; school?: string; traits?: { text?: string }[] };
const dir = process.argv[2]!;
const load = (k: string): Row[] => JSON.parse(readFileSync(join(dir, `${k}.json`), "utf8"));
const textOf = (o: Row) => [o.text, o.description, (o.traits ?? []).map((t) => t?.text).join("\n")].filter(Boolean).join("\n");

type Sample = { kind: string; name: string; source: string; level?: number; school?: string };
const out: Sample[] = [];
const seen = new Set<string>();
const take = (kind: string, rows: Row[], pick: (o: Row) => boolean, n: number) => {
  let taken = 0;
  for (const o of rows) {
    if (taken >= n || !pick(o)) continue;
    if (seen.has(`${kind}:${o.name}`)) continue;
    seen.add(`${kind}:${o.name}`);
    const s: Sample = { kind, name: o.name ?? "", source: rawSource(textOf(o)) ?? "" };
    if (kind === "spell") { s.level = o.level ?? 0; s.school = o.school ?? ""; }
    out.push(s);
    taken++;
  }
};

const races = load("race"), spells = load("spell"), feats = load("feat"), items = load("item"), backgrounds = load("background");

take("race", races, (o) => /Player's Handbook/.test(rawSource(textOf(o)) ?? ""), 3);
take("race", races, (o) => /,/.test(o.name ?? "") && /Player's Handbook/.test(rawSource(textOf(o)) ?? ""), 2);
take("race", races, (o) => /Homebrew/i.test(rawSource(textOf(o)) ?? ""), 2);
take("race", races, (o) => /Unearthed Arcana/i.test(rawSource(textOf(o)) ?? ""), 2);
take("background", backgrounds, (o) => /Player's Handbook/.test(rawSource(textOf(o)) ?? ""), 2);
take("feat", feats, (o) => nameMarks(o.name ?? "").some(isAxis), 4);
take("feat", feats, (o) => /Tasha/.test(rawSource(textOf(o)) ?? ""), 2);
take("feat", feats, (o) => /Indie|Third.Party/i.test(rawSource(textOf(o)) ?? ""), 2);
take("feat", feats, (o) => /Fighting Style:/.test(o.name ?? ""), 2);
take("spell", spells, (o) => !isClassFeature({ name: o.name ?? "", school: o.school ?? "" }) && /Player's Handbook/.test(rawSource(textOf(o)) ?? ""), 3);
take("spell", spells, (o) => (o.school ?? "") !== "" && isClassFeature({ name: o.name ?? "", school: o.school ?? "" }), 2);
take("spell", spells, (o) => (o.school ?? "") === "", 4);
take("spell", spells, (o) => /^(Maneuver|Metamagic|Rune|Infusion):/.test(o.name ?? ""), 3);
take("spell", spells, (o) => /Xanathar/.test(rawSource(textOf(o)) ?? ""), 2);
take("item", items, (o) => nameMarks(o.name ?? "").some(isAxis), 5);
take("item", items, (o) => nameMarks(o.name ?? "").some(isAxis) && nameMarks(o.name ?? "").some((m) => !isAxis(m)), 3);
take("item", items, (o) => nameMarks(o.name ?? "").length === 0, 2);

writeFileSync("src/content/__fixtures__/corpus.json", JSON.stringify(out, null, 1) + "\n");
console.log(`${out.length} samples written`);

/**
 * Runs the compile-time derivations over a real compendium and reports.
 * Not a test: the corpus is the published books and is never committed, so
 * tier 1 uses a small fixture and this exists to check that fixture against
 * reality. Point it at a directory of the bundled JSON.
 *
 *   node scripts/tools/measure-content.mjs ~/table-companion/public/content
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { provenanceOf, parseSource } from "../../src/content/source";
import { sourceMark, isAxis, nameMarks } from "../../src/content/marks";
import { isClassFeature } from "../../src/content/spells";
import { bookOf } from "../../src/content/books";

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error("usage: measure-content.mjs <dir of bundled compendium json>");
  process.exit(2);
}

type Row = { name?: string; text?: string; description?: string; level?: number; school?: string; traits?: { text?: string }[] };

const load = (k: string): Row[] | null => {
  const p = join(dir, `${k}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};
const textOf = (o: Row): string =>
  [o.text, o.description, (o.traits ?? []).map((t: { text?: string }) => t?.text).join("\n")].filter(Boolean).join("\n");

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(0)}%`;

console.log("kind        rows   official      ua   indie  homebrew  unknown   filed to a book");
for (const kind of ["race", "background", "feat", "spell", "item", "class"]) {
  const rows = load(kind);
  if (!rows) continue;
  const t: Record<string, number> = { official: 0, ua: 0, indie: 0, homebrew: 0, unknown: 0 };
  let filed = 0;
  for (const o of rows) {
    const p = provenanceOf(o.name ?? "", textOf(o));
    t[p.tier] = (t[p.tier] ?? 0) + 1;
    if (p.book !== null) filed++;
  }
  console.log(
    kind.padEnd(10), String(rows.length).padStart(6),
    String(t["official"]).padStart(10), String(t["ua"]).padStart(7), String(t["indie"]).padStart(7),
    String(t["homebrew"]).padStart(9), String(t["unknown"]).padStart(8),
    `${String(filed).padStart(9)} (${pct(filed, Math.max(1, t["official"] ?? 0))} of official)`,
  );
}

const items = load("item");
if (items) {
  const rarity = items.filter((o: Row) => nameMarks(o.name ?? "").some(isAxis));
  const wronglyHidden = rarity.filter((o: Row) => sourceMark(o.name ?? "") !== null);
  console.log(`\nAXIS TRAP — items whose name carries a rarity or ability: ${rarity.length}`);
  console.log(`            of those, still read as somebody else's material: ${wronglyHidden.length}`);
  console.log(`            (these are the ones that vanish if isAxis is wrong)`);
}

const feats = load("feat");
if (feats) {
  const axisNamed = feats.filter((o: Row) => nameMarks(o.name ?? "").some(isAxis));
  const misread = axisNamed.filter((o: Row) => {
    const m = sourceMark(o.name ?? "");
    return m !== null && isAxis(m);
  });
  console.log(`\nAXIS TRAP — feats whose name bakes in a choice, e.g. "Resilient (Constitution)": ${axisNamed.length}`);
  console.log(`            of those, misread as provenance: ${misread.length}`);
}

const spells = load("spell");
if (spells) {
  const features = spells.filter((s: Row) => isClassFeature({ name: s.name ?? "", ...(s.school === undefined ? {} : { school: s.school }) }));
  const lvl0 = features.filter((s: Row) => s.level === 0);
  console.log(`\nSPELLS THAT ARE NOT SPELLS — ${features.length} of ${spells.length}, ${lvl0.length} claiming level 0`);
  const noSource = spells.filter((s: Row) => parseSource(textOf(s)) === null);
  console.log(`Spells with no Source line: ${noSource.length}`);
  const unfiled = new Map();
  for (const s of spells) {
    const src = parseSource(textOf(s));
    if (src && bookOf(src) === null) unfiled.set(src, (unfiled.get(src) ?? 0) + 1);
  }
  const top = [...unfiled.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log(`Distinct unfiled sources: ${unfiled.size}. Largest:`);
  for (const [n, c] of top) console.log(`   ${String(c).padStart(4)}  ${n.slice(0, 64)}`);
}

/**
 * Build-time compendium compiler.
 *
 * Reads a raw compendium and emits typed, provenance-carrying, chunked JSON.
 * Every derivation happens here, once — nothing re-parses a name at runtime.
 *
 * Two chunks per kind, because a list screen and a detail card want different
 * things: `index/` carries what a list needs (name, provenance, and the few
 * fields a row shows), `detail/` carries the prose. 605 races are cheap as an
 * index and expensive as documents.
 *
 *   npx vite-node scripts/compile-content.ts <corpus dir> <out dir>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { provenanceOf } from "../src/content/source";
import { isClassFeature } from "../src/content/spells";
import { byProvenance, type Entry, type Kind } from "../src/content/schema";
import { pathsOf, grantName, classSource } from "../src/content/subclasses";
import { startingOf } from "../src/content/starting";
import { grantsOf } from "../src/content/background";
import { languagesFromTrait, isMundaneTool, toolKind } from "../src/content/proficiencies";
import { isBarding, isArmourRow, kindOf } from "../src/content/armour";
import { freeBonusFrom, freeSkillsFrom, grantsFeatFrom } from "../src/content/races";
import { innateFrom } from "../src/content/innate";
import { sensesFrom, hasSenses } from "../src/content/senses";
import { effectsOf } from "../src/rules/5e/feats";
import { findChoices } from "../src/content/choicepoints";
import { rulesFor } from "../src/rules/5e/classes";
import { key } from "../src/content/names";
import { traitsOf } from "../src/content/traits";
import { budget as legendaryBudget, options as legendaryOptions, lair as lairOf } from "../src/content/legendary";

type Row = { properties?: string[]; twoHanded?: string; cost?: number; weight?: number; prerequisite?: string; weaponCategory?: string; weaponRange?: string; damage?: string; damageType?: string; wealth?: string; slots?: number[][]; category?: string; strMinimum?: number; stealthDisadvantage?: boolean; armorCategory?: string; baseAc?: number; dexBonus?: boolean; maxDex?: number; magic?: boolean; detail?: string; id?: string; name?: string; text?: string; description?: string; level?: number; school?: string; classes?: string[]; skills?: string[]; traits?: { name?: string; text?: string }[]; abilityBonuses?: Record<string, number>; speed?: number; size?: string; features?: { level?: number; name?: string; text?: string }[] };

const [, , corpus, outDir = "public/content"] = process.argv;
if (!corpus || !existsSync(corpus)) { console.error("usage: compile-content.ts <corpus dir> [out dir]"); process.exit(2); }

const textOf = (o: Row) => [o.text, o.description, (o.traits ?? []).map((t) => t?.text).join("\n")].filter(Boolean).join("\n");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const kb = (n: number) => `${(n / 1024).toFixed(0)}KB`;

mkdirSync(join(outDir, "index"), { recursive: true });
mkdirSync(join(outDir, "detail"), { recursive: true });

const KINDS: Kind[] = ["race", "background", "feat", "spell", "item", "class"];
const report: Record<string, { rows: number; index: number; indexGz: number; detail: number; detailGz: number }> = {};

for (const kind of KINDS) {
  const path = join(corpus, `${kind}.json`);
  if (!existsSync(path)) continue;
  const rows: Row[] = JSON.parse(readFileSync(path, "utf8"));

  const index: Entry[] = [];
  const detail: Record<string, unknown>[] = [];

  for (const o of rows) {
    const name = o.name ?? "";
    const id = o.id ?? slug(name);
    // A class states its source only inside its features.
    const provenance = provenanceOf(name, kind === "class" ? classSource(o) : textOf(o));
    const base: Entry = { id, name, kind, provenance };
    if (kind === "spell") {
      index.push({
        ...base,
        level: o.level ?? 0,
        school: o.school ?? "",
        classes: o.classes ?? [],
        isFeature: isClassFeature({ name, school: o.school ?? "" }),
      } as Entry);
    } else if (kind === "race") {
      // Names only; the prose stays in the detail chunk.
      const traits = traitsOf((o.traits ?? []).map((t) => t?.name ?? "")).slice(0, 4);
      // The numbers an ancestry actually contributes. Thrown away until now,
      // which left every derived value on the sheet short.
      const said = (o.traits ?? []).find((t) => /^Language/i.test(t?.name ?? ""))?.text ?? "";
      /* The half the ancestry leaves to the player. 66 of 605 leave ability
         points, 32 leave a skill, 4 grant a feat — and V2 dropped all three,
         so a Half-Elf arrived two points short and a Variant Human with none
         at all. */
      const free = freeBonusFrom(o.traits);
      const innate = innateFrom(o.traits);
      const senses = sensesFrom(o.traits);
      index.push({
        ...base, traits,
        bonuses: o.abilityBonuses ?? {},
        speed: o.speed ?? 30,
        size: o.size ?? "M",
        languages: languagesFromTrait(said),
        ...(free === null ? {} : { free }),
        ...(freeSkillsFrom(o.traits) === 0 ? {} : { freeSkills: freeSkillsFrom(o.traits) }),
        ...(grantsFeatFrom(o.traits) ? { grantsFeat: true } : {}),
        /* 119 of 605 ancestries grant a spell and 36 grant one at a LATER
           level — a drow's Faerie Fire at 3rd, a tiefling's Hellish Rebuke.
           This is the whole of racial progression, and it was read past. */
        ...(innate.spells.length === 0 && innate.choices.length === 0 ? {} : { innate }),
        // How far they see in the dark, and what it costs a drow. Shown as a
        // trait NAME and derived from nothing until now.
        ...(hasSenses(senses) ? { senses } : {}),
      } as Entry);
    } else if (kind === "feat") {
      // What the feat asks of you. V2 offered Grappler to a Strength 8 wizard.
      /*
       * The EFFECT, derived here rather than the prose shipped.
       *
       * A feat's effect is stated in its text — "proficiency in saving throws
       * using the chosen ability" — and the sheet must not need the detail
       * chunk open to know a Resilient character's saves. Carrying the prose
       * costs 45KB and takes the creation chunk past its budget; carrying the
       * conclusion costs almost nothing, and derivation belongs here anyway.
       */
      const fx = effectsOf({ name, text: o.text ?? "" });
      index.push({
        ...base,
        ...(o.prerequisite === undefined || o.prerequisite === "" ? {} : { prerequisite: o.prerequisite }),
        ...(Object.keys(fx).length === 0 ? {} : { effects: fx }),
      } as Entry);
    } else if (kind === "item") {
      /* The fields an inventory needs. The index carried a name and a
         provenance, which is enough for a list and nothing else — no weight
         to add up, no damage to show, no armour to wear. */
      index.push({
        ...base,
        category: o.category ?? "",
        ...(o.weight === undefined ? {} : { weight: o.weight }),
        ...(o.cost === undefined ? {} : { cost: o.cost }),
        ...(o.damage === undefined ? {} : { damage: o.damage }),
        ...(o.damageType === undefined ? {} : { damageType: o.damageType }),
        ...(o.twoHanded === undefined ? {} : { twoHanded: o.twoHanded }),
        ...(o.properties === undefined ? {} : { properties: o.properties }),
        ...(o.weaponCategory === undefined ? {} : { weaponCategory: o.weaponCategory }),
        ...(o.weaponRange === undefined ? {} : { weaponRange: o.weaponRange }),
        ...(o.armorCategory === undefined ? {} : { armorCategory: o.armorCategory }),
        ...(o.baseAc === undefined ? {} : { baseAc: o.baseAc }),
        ...(o.dexBonus === undefined ? {} : { dexBonus: o.dexBonus }),
        ...(o.maxDex === undefined ? {} : { maxDex: o.maxDex }),
        ...(o.strMinimum === undefined ? {} : { strMinimum: o.strMinimum }),
        ...(o.stealthDisadvantage === undefined ? {} : { stealthDisadvantage: o.stealthDisadvantage }),
        ...(o.magic === true ? { magic: true } : {}),
        ...(o.detail === undefined ? {} : { detail: o.detail }),
      } as Entry);
    } else if (kind === "background") {
      index.push({ ...base, skills: o.skills ?? [], grants: grantsOf(o.traits ?? []) } as Entry);
    } else if (kind === "class") {
      const { gear, ...rest } = startingOf(o.features ?? []);
      /* The class's own twenty-row slot table, which was shipping in the
         corpus and read by nothing. A wizard's runs [2] to [4,3,3,3,3,2,2,1,1];
         without it the sheet cannot say what a caster can cast. */
      const slots = (o.slots ?? []).map((row) => row.filter((n) => n > 0));
      index.push({
        ...base, ...rest, gear,
        ...(slots.length === 0 ? {} : { slots }),
        // "5d4x10" — the alternative to taking the kit, and 50 classes state it.
        ...(o.wealth === undefined || o.wealth === "" ? {} : { wealth: o.wealth }),
      } as Entry);
    } else {
      index.push(base);
    }
    detail.push({ id, ...o });
  }

  index.sort(byProvenance);

  const iJson = JSON.stringify(index);
  const dJson = JSON.stringify(detail);
  writeFileSync(join(outDir, "index", `${kind}.json`), iJson);
  writeFileSync(join(outDir, "detail", `${kind}.json`), dJson);
  report[kind] = {
    rows: rows.length,
    index: iJson.length, indexGz: gzipSync(iJson).length,
    detail: dJson.length, detailGz: gzipSync(dJson).length,
  };
}

/* Paths are their own chunk. They live inside the class detail — 1.5MB
   gzipped — and a builder that had to load that to offer eight archetypes
   would be paying six megabytes for a list. */
const classPath = join(corpus, "class.json");
if (existsSync(classPath)) {
  const classes: Row[] = JSON.parse(readFileSync(classPath, "utf8"));
  const paths: Record<string, { grant: string; level: number; options: Entry[] }> = {};
  for (const c of classes) {
    const id = c.id ?? slug(c.name ?? "");
    const level = rulesFor(key(c.name ?? "")).subclassAtLevel;
    const options = pathsOf(c, level).sort(byProvenance);
    if (options.length === 0) continue;
    paths[id] = { grant: grantName(c, level) ?? "Path", level, options };
  }
  const pJson = JSON.stringify(paths);
  writeFileSync(join(outDir, "index", "path.json"), pJson);

  /*
   * Every question a class asks about itself, by ONE rule.
   *
   * A subclass, a fighting style, a sorcerer's Metamagic and a warlock's Pact
   * Boon are all written the same way — "Metamagic" as a plain feature and
   * "Metamagic: Careful Spell" as an answer. V2 had a special case for two of
   * them and never asked about the rest.
   */
  const choices: Record<string, { of: string; level: number; options: Entry[] }[]> = {};
  for (const c of classes) {
    const feats = (c.features ?? []).map((f) => ({ level: f.level, name: f.name, text: f.text }));
    const points = findChoices(feats).map((p) => ({
      of: p.of,
      level: p.level,
      options: p.options
        .map((x) => {
          // The defining feature carries the source line.
          const own = feats.find((f) => f.name === `${p.of}: ${x.full}`);
          return {
            id: slug(x.full), name: x.full, kind: "subclass" as const,
            provenance: provenanceOf(x.full, own?.text ?? ""),
          };
        })
        .sort(byProvenance),
    }));
    if (points.length > 0) choices[c.id ?? slug(c.name ?? "")] = points;
  }
  const cJson = JSON.stringify(choices);
  writeFileSync(join(outDir, "index", "choice.json"), cJson);
  const cPts = Object.values(choices).reduce((n, ps) => n + ps.length, 0);
  const cOpts = Object.values(choices).reduce((n, ps) => n + ps.reduce((m, p) => m + p.options.length, 0), 0);
  console.log(`CHOICES: ${cPts} questions across ${Object.keys(choices).length} classes, ${cOpts} answers, ${kb(gzipSync(cJson).length)} over the wire`);

  /* Feature names by level, one file per class. ~6KB each, and only the
     classes a character actually has are ever fetched — V1's note: a
     fighter's phone was paying for a wizard's picker. */
  mkdirSync(join(outDir, "index", "feature"), { recursive: true });
  let fBytes = 0;
  for (const c of classes) {
    const rows = (c.features ?? []).map((f) => ({ level: f.level ?? 1, name: f.name ?? "" }));
    if (rows.length === 0) continue;
    const j = JSON.stringify(rows);
    fBytes += gzipSync(j).length;
    writeFileSync(join(outDir, "index", "feature", `${c.id ?? slug(c.name ?? "")}.json`), j);
  }
  console.log(`FEATURES: ${classes.length} class files, ${kb(fBytes)} in total, fetched one at a time`);
  const own = Object.values(paths).reduce((n, p) => n + p.options.filter((o) => o.provenance.tier === "unknown").length, 0);
  const all = Object.values(paths).reduce((n, p) => n + p.options.length, 0);
  console.log(`\nPATHS: ${Object.keys(paths).length} classes, ${all} subclasses (${own} unmarked), ${kb(gzipSync(pJson).length)} over the wire`);
}

/* The 54 things a proficiency can name. Cut from a 10,760-row item list, of
   which about 120 more are magical objects shaped like tools — a Wand of
   Wonder is not something a background teaches you. */
const itemPath = join(corpus, "item.json");
if (existsSync(itemPath)) {
  const items: Row[] = JSON.parse(readFileSync(itemPath, "utf8"));
  const tools = items
    .filter((i) => isMundaneTool(i.detail))
    .map((i) => ({ id: i.id ?? slug(i.name ?? ""), name: i.name ?? "", kind: toolKind(i.detail) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tJson = JSON.stringify(tools);
  writeFileSync(join(outDir, "index", "tool.json"), tJson);
  console.log(`TOOLS: ${tools.length} of ${items.length} items, ${kb(gzipSync(tJson).length)} over the wire`);

  /* Armour, so a Fighter who took chain mail is worth 16 rather than 12.
     Magical armour is excluded — 1,307 rows of it, and none of it is starting
     equipment — and so is barding, which a horse wears. */
  const armour = items
    // V1's discriminator, both halves. Barding is armour for a horse.
    .filter((i) => i.magic !== true && isArmourRow(i.category) && !isBarding(i.name ?? "")
      && kindOf(i.armorCategory) !== null)
    .map((i) => ({
      id: i.id ?? slug(i.name ?? ""),
      name: i.name ?? "",
      kind: kindOf(i.armorCategory),
      ac: i.baseAc ?? 10,
      // Heavy states `dexBonus: false`; light states no cap at all.
      ...(i.dexBonus === true && i.maxDex !== undefined ? { maxDex: i.maxDex } : {}),
      // What the armour costs: ten feet if you are too weak for it, and
      // disadvantage on Stealth. V1 carried both; a sheet that says 16 and
      // not "disadvantage on Stealth" has told half the story.
      ...(i.strMinimum === undefined ? {} : { strMinimum: i.strMinimum }),
      ...(i.stealthDisadvantage === true ? { stealthDisadvantage: true } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const aJson = JSON.stringify(armour);
  writeFileSync(join(outDir, "index", "armour.json"), aJson);
  console.log(`ARMOUR: ${armour.length} suits and shields, ${kb(gzipSync(aJson).length)} over the wire`);

  /* Weapons, so "any martial weapon" can be a question rather than a phrase
     nobody ever answers. */
  const weapons = items
    .filter((i) => i.magic !== true && (i.category ?? "").toLowerCase() === "weapon"
      && i.weaponCategory !== undefined)
    .map((i) => ({
      id: i.id ?? slug(i.name ?? ""),
      name: i.name ?? "",
      weapon: i.weaponCategory,
      range: i.weaponRange,
      damage: [i.damage, i.damageType].filter(Boolean).join(" "),
    }));
  /*
   * The FILE'S order, not alphabetical.
   *
   * Weapons carry no source line and no marker — nothing to sort provenance
   * by — but the compendium lists the game's own first: Club, Dagger,
   * Greatclub, Handaxe… then silvered variants, then everybody else's.
   * Sorting alphabetically threw that away and offered a bard "Acid Bomb" as
   * the first simple weapon on the list.
   */
  const wJson = JSON.stringify(weapons);
  writeFileSync(join(outDir, "index", "weapon.json"), wJson);
  console.log(`WEAPONS: ${weapons.length} of ${items.length} items, ${kb(gzipSync(wJson).length)} over the wire`);
}

/*
 * Prose, one file per record.
 *
 * The builder showed names and never what they MEANT — "Darkvision, Fey
 * Ancestry, Trance" with no way to find out what Trance is. The prose is in
 * the detail chunks, but a race's is 627KB gzipped and nobody loads that to
 * read one trait.
 *
 * So: one small file each, fetched only when somebody asks. A race's is 1.9KB
 * gzipped at the median, a feat's 0.4KB. Bulk chunks were measured too — even
 * trimmed to 160 characters, races and feats and backgrounds come to 270KB
 * against a creation chunk of 62KB, which is four times a player's load for
 * prose they read a handful of.
 */
type Block = { name: string; text: string };
const describe = (kind: string, rows: { id: string; blocks: Block[] }[]) => {
  const dir = join(outDir, "describe", kind);
  mkdirSync(dir, { recursive: true });
  let bytes = 0;
  let written = 0;
  for (const r of rows) {
    const blocks = r.blocks.filter((b) => b.text.trim() !== "");
    if (blocks.length === 0 || r.id === "") continue;
    const j = JSON.stringify(blocks);
    bytes += gzipSync(j).length;
    written += 1;
    writeFileSync(join(dir, `${r.id}.json`), j);
  }
  if (written > 0) {
    console.log(`PROSE ${kind.padEnd(11)} ${String(written).padStart(5)} files, ${kb(bytes)} in total, fetched one at a time`);
  }
};

for (const kind of KINDS) {
  const path = join(corpus, `${kind}.json`);
  if (!existsSync(path)) continue;
  const rows: Row[] = JSON.parse(readFileSync(path, "utf8"));
  describe(kind, rows.map((o) => ({
    id: o.id ?? slug(o.name ?? ""),
    blocks: kind === "race" || kind === "background"
      // An ancestry's meaning is its traits, one block each.
      ? (o.traits ?? []).map((t) => ({ name: t?.name ?? "", text: t?.text ?? "" }))
      : [{ name: o.name ?? "", text: o.text ?? o.description ?? "" }],
  })));
}

/* A subclass, a fighting style, a Metamagic option — each is a class feature,
   and what it DOES is the feature's own text. */
if (existsSync(classPath)) {
  const rows: { id: string; blocks: Block[] }[] = [];
  for (const c of JSON.parse(readFileSync(classPath, "utf8")) as Row[]) {
    for (const f of c.features ?? []) {
      const m = /^([^:]{2,40}):\s+(.+)$/.exec(f.name ?? "");
      if (m === null) continue;
      rows.push({ id: slug(m[2]!.trim()), blocks: [{ name: m[2]!.trim(), text: f.text ?? "" }] });
    }
  }
  describe("choice", rows);
}

/*
 * Creatures, which are their own shape and their own scale.
 *
 * 6,633 of them, and a statblock is a document: the index carries only what a
 * staging list shows and the detail carries the block. Two derivations happen
 * HERE and never again — the legendary budget and the lair — because reading
 * eleven entries to find the three a dragon can do is work, and doing it while
 * a DM is mid-sentence is work in the wrong place.
 *
 * Sorted by NAME, not by provenance: 33 of the 6,633 carry a source line, and
 * file order starts with an adventure's NPCs rather than the game's own. The
 * same trap the weapon list has, answered differently because the answer that
 * worked there — trust file order — is not true here.
 */
type Statblock = Row & {
  cr?: string | number; type?: string; hp?: number; ac?: number; xp?: number;
  hitDice?: string; abilities?: Record<string, number>; senses?: string; acNote?: string;
  saves?: unknown; immunities?: unknown; languages?: string; alignment?: string;
  actions?: { name: string; desc?: string }[];
  reactions?: { name: string; desc?: string }[];
  legendary?: { name: string; desc?: string }[];
};

const creaturePath = join(corpus, "monster.json");
if (existsSync(creaturePath)) {
  const rows: Statblock[] = JSON.parse(readFileSync(creaturePath, "utf8"));
  const index: unknown[] = [];
  const block: { id: string; [k: string]: unknown }[] = [];

  /*
   * Ids in this corpus are NOT unique: 356 are shared by two or more rows, and
   * 233 of those pairs have genuinely different statblocks — an Alseid is a
   * CR 1/2 monstrosity in one book and a CR 1 fey in another. Left alone, both
   * appear in the list and both resolve to whichever file was written last, so
   * a DM picking one gets the other's numbers.
   *
   * Suffixed by order of appearance, which is stable as long as the corpus is:
   * a staged creature has to still resolve after the next build.
   */
  const seen = new Map<string, number>();
  let collisions = 0;

  for (const o of rows) {
    const name = o.name ?? "";
    const raw = o.id ?? slug(name);
    const n = (seen.get(raw) ?? 0) + 1;
    seen.set(raw, n);
    if (n > 1) collisions += 1;
    const id = n === 1 ? raw : `${raw}-${String(n)}`;
    const lair = lairOf(o.legendary);
    const options = legendaryOptions(o.legendary);
    index.push({
      id, name, kind: "creature",
      provenance: provenanceOf(name, textOf(o)),
      cr: Number(o.cr ?? 0),
      type: o.type ?? "", size: o.size ?? "",
      ac: o.ac ?? 10, hp: o.hp ?? 1,
      legendary: legendaryBudget(o.legendary),
      lair: lair !== null,
    });
    block.push({
      id,
      abilities: o.abilities ?? {}, speed: o.speed ?? {}, hitDice: o.hitDice ?? "",
      senses: o.senses ?? "", languages: o.languages ?? "", acNote: o.acNote ?? "",
      saves: o.saves ?? null, skills: o.skills ?? null, immunities: o.immunities ?? null,
      alignment: o.alignment ?? "", xp: o.xp ?? 0,
      traits: o.traits ?? [], actions: o.actions ?? [], reactions: o.reactions ?? [],
      /* Resolved, not the raw eleven entries: the 39% that is lair and
         regional prose never reaches a device. */
      legendary: options, lair,
    });
  }

  index.sort((a, b) => (a as { name: string }).name.localeCompare((b as { name: string }).name));
  const iJson = JSON.stringify(index);
  writeFileSync(join(outDir, "index", "creature.json"), iJson);

  /*
   * ONE FILE PER STATBLOCK, not one file of statblocks.
   *
   * As a single chunk the detail is 2.3MB gzipped, and a DM staging three
   * goblins would pull all 6,633 of them. The prose chunks learned this
   * already; a statblock is the same shape of problem and gets the same
   * answer — fetched when a creature is actually put on the table.
   */
  const dir = join(outDir, "detail", "creature");
  mkdirSync(dir, { recursive: true });
  let bytes = 0;
  let biggest = 0;
  const sizes: number[] = [];
  for (const b of block) {
    if (b.id === "") continue;
    const j = JSON.stringify(b);
    const gz = gzipSync(j).length;
    bytes += gz; sizes.push(gz);
    if (gz > biggest) biggest = gz;
    writeFileSync(join(dir, `${b.id}.json`), j);
  }
  sizes.sort((x, y) => x - y);
  const median = sizes[Math.floor(sizes.length / 2)] ?? 0;
  if (collisions > 0) {
    console.log(`       ${String(collisions).padStart(5)} ids were already taken and were suffixed, so every row has its own block`);
  }
  console.log(`BLOCKS creature   ${String(sizes.length).padStart(5)} files, ${kb(bytes)} in total, ${kb(median)} median, ${kb(biggest)} largest`);
  report["creature"] = {
    rows: rows.length,
    index: iJson.length, indexGz: gzipSync(iJson).length,
    detail: bytes, detailGz: bytes,
  };
}

writeFileSync(join(outDir, "index.json"), JSON.stringify({ builtAt: Date.now(), report }, null, 1));

console.log("kind         rows      index   index gz       detail  detail gz");
for (const [k, r] of Object.entries(report)) {
  console.log(k.padEnd(11), String(r.rows).padStart(6), kb(r.index).padStart(10), kb(r.indexGz).padStart(10), kb(r.detail).padStart(12), kb(r.detailGz).padStart(10));
}
const creation = ["race", "background", "feat", "class"].reduce((n, k) => n + (report[k]?.indexGz ?? 0), 0);
console.log(`\nCREATION CHUNK (race + background + feat + class, index only): ${kb(creation)} over the wire`);
const all = Object.values(report).reduce((n, r) => n + r.indexGz, 0);
console.log(`Every index, gzipped: ${kb(all)}`);
void statSync;

# Architecture

The shape is chosen against two failures in V1, and nothing else.

---

## Why V1's shape failed

`src/domain/` held 60 files. `src/ui/` held 60 files. That is a **layer** split,
and it means one feature is spread across four files in different folders that
nothing holds together. The result was predictable and measurable:

| file | lines |
|---|---|
| `src/app.css` | 2,874 |
| `src/ui/CreateCharacter.tsx` | 2,739 |
| `src/ui/Combat.tsx` | 1,602 |
| `src/domain/project.ts` | 1,147 |
| `src/ui/App.tsx` | 946 |

Every feature had to be threaded through those five. A new card had to go
*somewhere*, and the bottom of a file is always free — which is exactly what
law 7 describes and why it had to be written down at all.

---

## The shape

Vertical, with two things pulled out because they are genuinely shared.

```
src/
  core/          the spine. Knows nothing about D&D.
    log.ts           append-only event log
    reduce.ts        fold(events) -> state
    undo.ts          undo as a skip-marker, never a deletion
    persist.ts       IndexedDB
    sync.ts          added at slice 6. A transport, not a redesign.
    types.ts         Creature, Actor, Effect, Roll, Claim — the whole seam

  rules/5e/      the ruleset. Knows nothing about React.
    attack.ts  spellcast.ts  checks.ts  progression.ts  marks.ts  books.ts …

  content/       the compendium, compiled at build time
    schema.ts        the record types. provenance is REQUIRED.
    compile.ts       build-time: raw -> typed, versioned, chunked
    import.ts        runtime: validate, merge field-by-field

  features/      one folder per slice. This is where work happens.
    <slice>/
      model.ts         feature state + the events it writes
      Screen.tsx       the screen
      Screen.test.tsx  its tier-2 test, beside it
      Screen.module.css

  design/
    tokens.css       both themes, from DESIGN.md
    motion.ts        the tokens as values, for JS-driven motion
```

**The dependency rule, and it is one-way:**

```
features/  ->  rules/5e/  ->  core/
features/  ->  content/   ->  core/
core/      ->  nothing
```

`core/` importing anything from `rules/` or `features/` is a lint error. That
single rule is what makes "no engine, but a hard seam" real rather than
aspirational — the seam is enforced by the import graph, not by intention.

---

## Budgets

Enforced by `check-size`, which fails the build. Not guidance.

| kind | ceiling |
|---|---|
| `.tsx` component | 400 lines |
| domain `.ts` | 300 lines |
| CSS Module | 150 lines |
| global stylesheet | **0** — `tokens.css` only |

A file at the ceiling is a file that needs splitting, and the split is
obvious while you are in it and invisible six weeks later. That is the entire
argument for a hard number over judgement.

---

## The log, from commit one

This is the requirement that makes "character first" safe.

State is `fold(events)`. There is no component state that matters, no store
that is written directly, and no "we'll add the log later". On day one there
is no server and no room — the log is local, persisted to IndexedDB, and folded
on load. Slice 6 adds a transport that replicates it. Nothing above `core/`
changes when that happens.

If character creation is built on component state and the log arrives at slice
6, V1's problem has been rebuilt with the order reversed.

**Ordering is a Lamport counter, never the wall clock.** Six phones at a table
have six clocks and one of them is wrong; an event's `at` is for display only.
The total order is `(seq, device, id)`, computed identically everywhere, so a
fold is independent of arrival order — which is what makes slice 6 a transport
rather than a redesign. A device advances its counter past anything it has seen.

**Undo resolves from the newest backwards.** A skip marker can itself be
skipped — that is redo — so effectiveness is decided by walking the log in
reverse: a marker counts unless a later counting marker names it. Resolving
forwards instead oscillates on undo/redo/undo and never settles. This was
found by a property test, not by reasoning.

**Device-local state never enters the log.** Seat, theme, preferences.
Enforced by a type: the log accepts `Event`, and `DeviceState` is not
assignable to it.

**Claims stay device-local, and no third kind of state was added.** The DM's
screen was going to need to know whether a character is held, which is a fact
that fits neither place — not history, because a claim is true while a phone is
awake and false when it is in a pocket; not device-local, because another
device is the one reading it. That would have been *presence*, riding the
room's live connection. The rule it served was reversed instead (DM.md), so
there are still two kinds of state and not three. The design is written down in
DM.md for the day something genuinely needs it.

So presence rides the room's live connection: who is connected and what they
hold, never replayed, never undone, never in the transcript. When a phone dies
mid-fight the claim lapses on its own — which is what a table wants, rather
than the DM being locked out by a stale event.

---

## Content

The first slice that ships is entirely content-driven, so this is designed
rather than retrofitted. The reference is
`~/Desktop/table-companion-compendium.md`, which describes V1's implementation
as actually built; the decisions below either carry it over or say why not.

### Three layers, one merge

Content reaches a screen from three places, always in this order:

| layer | lives in | who has it | committed |
|---|---|---|---|
| **SRD 5.1** | shipped with the app | everyone | yes |
| **Bundled compendium** | fetched at runtime | everyone on that deployment | **no — gitignored** |
| **Imported** | IndexedDB, per device, per kind | that one device | n/a |

Merged base-first, field by field: a field absent in the newer row never
overwrites a present one, so a thinner file cannot delete what a richer one
knew. **Absent is normal** — a deployment built without a compendium resolves
every bundled fetch to empty and works on the SRD alone. That is a supported
configuration, not a degraded one, and it is the only *redistributable* one.

Backgrounds, spells and feats have no SRD layer, because SRD 5.1 does not cover
them. A compendium-less deployment therefore offers a custom background, no
spell list and no feats. Deliberate consequence, not a gap.

### The three axes, resolved at compile time

This is the one place V2 departs from V1's design rather than porting it.

V1 derives provenance at **runtime**, by parsing parentheses out of names in
`marks.ts`, at every call site. That is why book-ordering was fixed twice in
two places after the same bug, and why V1's own docs flag it as a trap for the
third list drawn from a compendium.

V2 resolves all three axes **once, in the build**, and stores them as required
fields. The name-parsing heuristics move into `content/compile.ts` and exist
nowhere else; a screen reads a field.

1. **Provenance** — is this the game's own? A compendium states it as a
   parenthetical (`HB`, `TP`, `UA`, setting names). In the real bundled file
   this is **81% of races, 89% of feats, 65% of spells** — 1,820 of 3,443
   spells are `(HB)` alone.
2. **Book** — which official book printed it? V1's premise was that the
   compendium does not say. **Measured, that is wrong for four kinds of six:**
   every race, background, feat and spell in the shipped file carries a
   `Source:` line in its prose — 5,168 of 5,168 — naming the publication,
   the page, and often a `(Homebrew)` / `(Indie)` / `(Third Party)` marker.
   Items and classes carry none.

   So the book is *parsed*, and the hand-maintained table shrinks to what only
   it can supply: the **19 official books in publication order**, 2014 rules
   only, for matching and grouping. Of records the parse calls official, 99%
   of spells, 98% of feats, 87% of races and 62% of backgrounds match one of
   the nineteen; the rest are third-party publications and land under
   "elsewhere". First printing still wins.
3. **Is it even a spell?** Compendiums file invocations, maneuvers, metamagic,
   runes, infusions and elemental disciplines under spells: **1,539 of 3,443
   entries, 1,409 of them claiming level 0.** Without this a warlock browsing
   cantrips gets a wall of invocations before a single spell.

**The trap, carried over because it is the expensive one.** Not every
parenthetical is provenance. Re-measured against the shipped file:

- a choice baked into the name — `Resilient (Constitution)` and its kin,
  **365 feats**
- a property of the thing — `(Rare)`, `(Very Rare)`, `(Legendary)`, on
  **1,533 magic items**
- and a third kind V1 did not have: a **quantity or a category**.
  `Sunwing Crossbow Bolts (Rare) (20)`, `Hammerhead Ship (Uncommon) (Vehicle)`.
  Twelve records read as third-party because a number was taken for a
  publisher. A number is never a publisher.

Reading any of them as provenance hides material the moment the switch points
at equipment — *and it looks exactly like the switch working.* Tier 1 tests
this against a committed fixture; the corpus itself is the published books and
is never committed.

**A school is evidence, not proof.** Elemental Disciplines ship with a real
school and are still class features, so the school test and the name-prefix
test are both load-bearing. This was found by a test failing, not by reading:
the fixture generator picked three "real spells" that were disciplines.

**Two independent signals, combined conservatively.** The prose source line and
the name parenthetical are read separately, and a record is the game's own only
when neither says otherwise. `DnDBeyond Unearthed Arcana (Homebrew)` claims
both; it resolves to homebrew.

**The name marker beats an inherited source line.** `Dragonborn, Revenant (UA)`
carries no text of its own — its only `Source:` line comes from the base
Dragonborn's description trait — so the prose alone files a UA race under the
Player's Handbook. The file's author, writing about *this* record, wins.

**A source line is not a claim to be official.** Every third-party publication
carries one. `Matthew Mercer - Gunslinger Martial Archetype` is a `Source:`
line, and a Gunslinger is not a fighter archetype the game printed. So official
means a *positive* match against the book table, or one of the official
families (WotC's free Plane Shift releases, Adventurers League). The table
therefore had to grow past the nineteen hardcovers to the adventures and
companions that also carry player options — Curse of Strahd, Ghosts of
Saltmarsh, the Wild Beyond the Witchlight — or their content would have been
filed as somebody's homebrew.

**Classes and subclasses state their source inside their features.** The class
record carries no `Source:` line; its features do. V1 never looked, and filtered
on the name marker alone — so it showed Blood Hunter, Illrigger and Gunslinger
among the game's own, because none of them has a marker in its name. Measured
against the same file, V1 and V2 both showed 18 classes and 9 fighter
archetypes; V2 now shows 16 and 9, and the ones that left are the right ones.

Three traps in reading those features, each of which produced a wrong answer
before it was fixed:

- **Ask the `Starting <Class>` feature, not the commonest source.** A cleric's
  feature list holds 198 subclasses, so the commonest source in it is somebody's
  homebrew — which removed the Cleric from the game.
- **`Multiclass <Class>` is not a source.** It is boilerplate quoting the PHB's
  multiclassing rules, and every homebrew class carries one. It filed Blood
  Hunter and Redeemer (Tanares) under the Player's Handbook.
- **Count per publication, not per line.** `Leftovers p. 10` and `p. 11` are one
  source; keying on the raw line makes every page its own and lets a single PHB
  reference win with a count of one.

**A subclass's features wear the same prefix as the feature that declares it.**
`Martial Archetype: Champion` is a path; `Martial Archetype: Knighthood (Purple
Dragon Knight (Banneret))` is a feature of one. Told apart by the trailing
parenthetical naming another path — and it must be found by counting brackets
from the end, because a greedy regex reads the qualifier as beginning at the
first bracket and lets the feature through.

**`unknown` is not `marked`.** Classes carry no source line and no name marker,
so all twelve of the game's own resolve to `unknown`. Filtering a list to
`tier === "official"` therefore deleted every core class from the builder. The
markers hide; nothing else does — absence of evidence is not evidence. This is
the same shape as the axis trap and the "elsewhere" rule, and it is now a
tier-1 test and a journey test.

**Ancestries are grouped, because the file does not group them.** There is no
plain `Dwarf` record: the compendium files `Dwarf, Hill` and `Dwarf, Mountain`
as separate races. 88 of 186 official races carry a comma, and grouping by the
part before it yields **77 ancestries**.

Grouping alone is not enough, and produced a Human with twelve lineages. Two
further passes:

- **Deduplicate by label.** The same lineage is printed in several books —
  Eladrin in the DMG, Mordenkainen's and as Legacy; Hobgoblin's base three
  times — and the marker telling them apart is stripped before the label is
  read. Rows arrive in publication order, so the survivor is the first
  printing.
- **A dragonmark is not a lineage.** `Mark of …` and `Variant`/`Variants` are
  separate options that share an ancestry's name, not ways of being it. They
  are set aside on the group rather than discarded.

That takes ancestries with a Lineage step from 29 to **12**. Human becomes one
lineage and six variants — so there is no step, and a human is just a human.
An elf keeps seven.

Three spellings are needed per name, because compendiums invert subraces
(`Dwarf, Hill`) and file fighting styles as feats (`Fighting Style: Archery`).

### Chunking

**Index and detail, not one document per kind.** A list screen wants a name and
a provenance; a detail card wants the prose. Splitting them is what makes 605
races cheap:

| kind | rows | index (gz) | detail (gz) |
|---|---:|---:|---:|
| race | 605 | 24KB | 627KB |
| background | 270 | 11KB | 407KB |
| feat | 850 | 14KB | 117KB |
| spell | 3,443 | 110KB | 789KB |
| item | 10,760 | 133KB | 201KB |
| class | 67 | 5KB | 1,521KB |

**The creation chunk — every list the builder needs — is 54KB over the wire**,
against a stated budget of 64KB. V1's equivalent player load was 3.1MB, about
0.3MB gzipped.

It grew from 30KB when the index stopped being names-and-provenance only. An
index row now carries what a choice *grants*, because a screen that has to open
the detail chunk to say what an ancestry gives you has to hold 627KB to draw a
list. So a race carries its ability bonuses, speed, size and languages; a class
carries the skills it offers and how many, its armour, weapons, tools, the
lines of its equipment list and its twenty-row spell-slot table; a background carries its skills and what it hands
over in languages and tools. All of it is parsed **once, at build time**, out of
the prose the books state it in.

Three small chunks ride alongside, for the same reason paths do — the data
lives inside the class detail, and a Fighter offering six styles is not worth a
megabyte:

| chunk | what | over the wire |
|---|---|---:|
| `index/path.json` | 1,084 subclasses across 36 classes | 18KB |
| `index/style.json` | 171 fighting styles across 15 classes | 2KB |
| `index/tool.json` | the 54 things a proficiency can name | 1KB |
| `index/armour.json` | 27 suits and shields | 1KB |

### The item catalogue

`index/item.json` carried a name and a provenance — enough for a list and
nothing else: no weight to add up, no damage to show, no armour to wear. It now
carries the fields an inventory needs, which takes it from 133KB to **225KB
gzipped**, and it is fetched when somebody opens the sheet rather than on the
way to a fight.

The build does **not** hold item records. Creation records the book's own
words — "Leather armor, two daggers, and thieves' tools" — because resolving
"two martial weapons" into two item records is the player's decision and not
the app's. The Inventory screen resolves those words against the catalogue it
loads anyway, so the builder never pulls 225KB it has no use for. Anything the
catalogue cannot name is kept as written and files under Gear.

### Prose

Names are in the index; **what they MEAN is one file per record**, under
`describe/<kind>/<id>.json`, fetched when somebody asks and not before. 7,179
files, 4.5MB on disk, and a median race is 1.9KB gzipped.

Bulk chunks were measured and rejected: even trimmed to 160 characters, races
and feats and backgrounds come to **270KB gzipped** against a creation chunk of
62KB — four times a player's load for prose they read a handful of. The
detail chunks already hold it all, but a race's is 627KB and nobody loads that
to read one trait.

They are not precached (the globs cover `js/css/html/woff2` and art only) and
have their own runtime cache, `CacheFirst` with 120 entries, so re-reading a
trait is instant and the store stays bounded.

`armour.json` is cut the same way, on V1's own discriminator — `category ===
"armor"`, with `armorCategory` saying which of the three shapes. 1,307 of the
1,347 armour rows are magical and none is starting equipment; twelve more are
barding, which a horse wears. 27 remain.

`tool.json` is cut from the 10,760-row item list, which the builder never
loads. About 120 more rows *look* like tools and are magical objects — a Wand
of Wonder is not something a background teaches you — so the cut is on the
compendium's own `detail` field, and anything carrying a rarity or an
attunement clause is treasure.

Chunked by which screen needs it, from one source. **The classes deliberately
ship twice** — whole for the builder, slimmed to names, levels and slots for
the sheet. That split took a player's load from 8.9MB to 3.1MB, and from 1.8MB
to 0.3MB over the wire; it is the optimisation, not a defect to remove. The
spellbook is fetched when a fight is staged, and only on a caster's device.

For scale, the bundled build: 6,633 monsters (13.3MB raw / 2.5MB gz), 3,443
spells (3.9MB / 794KB), 10,760 items (2.4MB / 202KB), 850 feats, 605 races,
270 backgrounds, 67 classes. **Importing defaults to everything except
creatures** — monsters are half the weight and only a DM wants them.

### The switch

One boolean, device-local, off by default. Four rules worth carrying exactly:

1. It **hides itself when it would do nothing**, so a compendium-less
   deployment never shows a switch that changes nothing.
2. **Whatever is already chosen stays listed**, even when the switch would hide
   it. A switch must never silently un-choose something.
3. It is **device-local on purpose** — a preference, not a fact about the
   campaign. Syncing it would let one player's taste reorder another's screen.
   It therefore never enters the log.
4. **Nothing is hidden by the book table.** The markers hide; the table only
   decides the heading. Anything unfiled lands under "elsewhere" and stays
   visible.

V1 wired this into eight call sites. In V2 it is one component and one filter
applied where lists are built, because eight sites is how a rule gets fixed in
two of them.

### Licensing is architecture

The app is **not redistributable as it stands**, and the exit is deliberately
one file: the DMG encounter thresholds and multiplier and the PHB standard
array and point-buy tables live in a single module, imported at two call sites.
Delete it, drop the argument, and the app falls back to raw XP totals with no
difficulty band — the fully-licensed behaviour.

V2 keeps that property as a hard constraint, and `check-imports` enforces it:
**nothing may import the not-SRD module except the encounter code.** The
bundled compendium stays gitignored and is built on whatever machine deploys.

## Styling

`app.css` at 2,874 lines becomes `tokens.css` plus one CSS Module per
component. This is not tidiness — it is the fix for a named V1 defect: 26
browser-suite selectors matched more than one component, because `.saved` was
worn by five components and `.swing-ask` by six. A module class is scoped by
construction, so that class of bug cannot be written.

Combined with tier-4's ban on CSS-class locators in tests, the selector
baseline file that was "meant to shrink" never comes into existence.

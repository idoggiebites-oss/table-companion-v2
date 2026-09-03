# What comes over from V1

This is a rebuild for **progression** reasons — no order to build in, and a
test suite that could report success having run nothing. It is not a rebuild
because the rules were wrong. So: **rebuild the skeleton, port the organs.**

## Ported, largely intact

Each of these comes over only after its tier-1 tests are written **first**,
against the new core types. That ordering is the whole difference between a
rebuild and a copy with extra steps — if it ports without a failing test to
satisfy, it has not been checked, it has been moved.

| from V1 | what it knows |
|---|---|
| `attack.ts`, `attackflow.ts` | the attack sequence, advantage from both sides |
| `spellcast.ts`, `spells.ts`, `slots.ts` | slots, upcasting, concentration displacement |
| `checks.ts`, `roll.ts` | skill checks, saves, contested rolls |
| `progression.ts` | levels, ASI/feat, subclass grants — and the SRD Character Advancement table, which V2 had replaced with a hardcoded `0 / 300` at every level |
| `classes-from-compendium.ts` | that a class's slot table is DATA the compendium already ships — V1 read the first row, V2 read none |
| `marks.ts`, `books.ts` | provenance — **461** entries, 19 books, 2014 rules, first-printing-wins |
| `slots.ts` | six places, and V1's reason for them: **5e has no slot system, it has sentences** — so this is a reading of what is equipped, not a rules model. Plus `displacedBy`: a greatsword and a shield is not a thing, and V1 "allowed it and quietly handed out the armour class for it" |
| `starting-gear.ts` (the item half) | resolving a phrase to a catalogue entry, plurals and counts included — and keeping by name what it cannot resolve |
| `equipment.ts`, `items.ts` | derived AC — the formula, the readable derivation beside it, the Strength minimum and stealth disadvantage, and the rule that armour is a FLOOR over a stored value so a monk's unarmoured defence is never silently stripped |
| `money.ts` | copper as integers, because nothing here is a decimal |
| `visibility.ts`, `permissions.ts` | the disclosure ladder (needed at slice 8) |
| the compendium build scripts | `build-compendium.mjs`, `build-srd.mjs` — both reproducible |
| `content.ts`, `bundled.ts`, `srd.ts` | the three-layer merge, and "absent is normal" |
| `Sources.tsx` | survey-before-parse import, per-kind, creatures off by default |
| `non-srd.ts` + `ATTRIBUTION.md` | the one-file licensing exit — carried as a constraint |
| `proficiencies.ts` | languages and tools read out of prose — 581 of 605 ancestries name a language, and the phrasing is boilerplate, which is what makes reading it safe |
| `background.ts` | what a background gives: the BOOK decides, not the player — an acolyte gets two languages, a criminal two tools |
| `races.ts` (the grant half) | the half an ancestry LEAVES to you — 66 of 605 leave ability points, 32 a skill, 4 a feat |
| `multiclassing.ts` | what a SECOND class brings — three of thirteen grant a skill — plus the COMBINED caster level (artificer rounds up), pact magic on its own track, and the prerequisites, which cut both ways |
| `subclass.ts` → `choicepoints.ts` | ONE rule for every question a class asks: a subclass, a fighting style, Metamagic, a Pact Boon. And `ownFeatures`, which filters a ranger's 372 table entries down to the 22 that are actually theirs |
| `innate.ts` | spells an ancestry grants and WHEN — 119 of 605 grant one, 36 at a later level. This is the whole of racial progression |
| `senses.ts` | darkvision and what it costs a drow — 314 of 605 ancestries say, and a range that cannot be parsed falls back to the rulebook's usual rather than to zero |
| `starting-gear.ts` → `gear.ts` | which phrases in an equipment line name a THING and which name a decision — 18 of 89 options say "any simple weapon" |
| `feats.ts` | prerequisites, checked conservatively — an unrecognised one is ALLOWED with the requirement stated, because the table can say no and the app saying no is the end of it |
| `featvariants.ts` (`effectsOf`) | half-feats raise an ability, and Resilient grants a save — the reason anybody takes it |
| `creation.ts` (`assemble`, `missing`) | skills as a set across every source; hit points honouring the rolls; the gaps list that became Review |

A third pass closed the remaining creation gaps: spells known at creation
(a bard chose two cantrips and no spells while a bard GROWN to the same level
knew one — the two doors disagreeing), the weapon behind "any simple weapon",
the gold a class offers instead of its kit, feat prerequisites, senses, and
Resilient's save.

Two things that pass are worth keeping: weapons carry **no** source line and
no marker, so provenance cannot sort them — but the compendium lists the
game's own first, and sorting alphabetically offered a bard "Acid Bomb" as
their first simple weapon. Keep the file's order. And carrying feat PROSE to
read effects from cost 45KB and pushed the creation chunk past its budget;
deriving the effect at build time costs almost nothing.

A second audit, of PROGRESSION across all classes and races, found twelve
more — the level-up screen being where V2 was thinnest:

- No multiclassing after creation at all; the list was the character's own
  classes. No prerequisites, and no combined caster level.
- Two special cases where V1 has one rule, so a sorcerer was never asked
  about Metamagic and a warlock never about their Pact Boon.
- No features named on gaining them, no spells learned, +2 to one ability
  refused, class ids shown as names.
- And racial progression missing entirely: a tiefling could not cast the one
  thing tieflings are known for.

Fixing it surfaced two bugs of its own, both worth remembering: a step that
DISAPPEARS once answered shifts every later step down by one (Identity was
being skipped), and a question with a screen of its own must be excluded from
the general one or it gets asked twice.

A **logic** audit against V1 — not a feature checklist — found seven
divergences, four of them wrong numbers on the sheet:

1. Background skills never reached the build, so a Sage rolled Arcana untrained.
2. The free half of a racial bonus was dropped: a Half-Elf arrived two points
   short, a Variant Human with none at all.
3. A character created above level one was never asked about the improvements
   they had already passed — the exact bug V1 hit, fixed, and wrote down.
4. Rolled hit points were recorded into the log and then ignored.
5. Race-granted skill and feat were never asked for.
6. No Review step.
7. No multiclass skill grant.

What V2 already had right, and is worth not re-litigating: the hit-point
arithmetic (first level of the FIRST class takes the whole die, Constitution
applies to every level, per-class dice), the per-class ASI levels, and — better
than V1 — background skills shown as *held* rather than deduped after the fact,
so a pick cannot be wasted on one. And where V1 adds `abilityBonuses +
subraceBonuses`, V2 replaces: this corpus states the whole grant on the
lineage, so adding would double-count.

**Read V1's module before designing the V2 one, not after.** Armour was drafted
from the raw item fields first and came out thinner: filtered on
`armorCategory` alone where V1 discriminates on `category === "armor" &&
armorCategory !== "Shield"`, and returning a bare number where V1 returns the
sum in words, a speed penalty and stealth disadvantage. None of that is visible
in the data — it is in V1's comments. The homework is already done; the job is
to port the reasoning, then check it against the corpus.

Both proficiency modules came over with their tier-1 tests written first, and
both gained a case V1 never had: 120 ancestries phrase a language choice as
"Common and one other language that you and your DM agree is appropriate", and
V1's three phrasings did not include it. Measured, not assumed — the reading
went from 93 ancestries offering a choice to 212.

## Rewritten

- **`app.css` (2,874 lines)** → `tokens.css` + one CSS Module per component.
- **`project.ts` (1,147 lines)** → split across `core/` and feature models.
- **`CreateCharacter.tsx` (2,739)**, **`Combat.tsx` (1,602)**, **`App.tsx` (946)**
  → feature folders under the 400-line ceiling.
- **The event log** → same idea, but as `core/` with a one-way import rule and
  a type that refuses device-local state.

## Dies

- The 75 `verify-*.mjs` scripts and `sweep.sh`. Their *assertions* are worth
  reading once each while writing tier 1; the scripts themselves are the defect.
- `selector-baseline.txt` and the 26 ambiguous selectors — made unwritable by
  CSS Modules plus `check-locators`.
- The dark-only palette. Both themes now, and all six semantics re-measured.
- `ROADMAP.md` at 47KB.

## Carried as measurements, not as code

Numbers worth keeping because they are the baseline V2 has to beat:

- Player load 3.1MB, ~0.3MB over the wire; classes shipped twice.
- `item.json` 2.5MB raw, 0.21MB gzipped, ~5ms to parse on desktop.
- The sheet at 2,588px against a 2,600px ceiling (~3.9 screens).
- Damage red shipped at 4.42:1 on its own ground.
- The class split: 8.9MB → 3.1MB loaded, 1.8MB → 0.3MB over the wire.
- Provenance coverage: 81% of races, 89% of feats, 65% of spells marked.
- The two false-provenance populations: 1,499 magic items, 331 `Resilient (X)`.

# The plan

Eleven slices. A slice starts only when the one before it is **done**, and done
is the stated condition, not a feeling. This file is one page and stays one
page — V1's roadmap reached 47KB, at which point you had to read the changelog
to find the plan. The changelog is `git log`.

**First ship is slice 5: a character, end to end, on one device.**

---

## To first ship

### 0 · The workbench — **done, 30 Aug 2026**
Repo, TypeScript, Vite, Worker. `tokens.css` for both themes. CSS Modules.
Vitest node + browser. Playwright test runner. The seven tier-4 checks. SVG
icon pipeline — there are no glyph icons.

**Done when** `npm run verify` runs all four tiers, and a deliberately broken
commit — a `var()` typo, a 401-line component, a white-on-gold button, a
screen one line over its height budget, a deleted test file — fails it for the
right stated reason each time. The height harness (390px iframe, worst-case
fixture) is built here, before there is a screen to point it at.

*Met.* `npm run verify` runs typecheck → 7 invariants → 4 domain → 4 component
→ 3 journey, clean. Nine deliberate breakages each caught by exactly one check,
with the stated message — the table is in TESTING.md. Tier 1 is 91ms, tier 2
runs in real Chromium, tier 3 in WebKit on its own port.

### 1 · The log, alone — **done, 30 Aug 2026**
Append-only log, `fold`, undo-as-marker, IndexedDB persistence. A debug view
and nothing else. No server, no room.

**Done when** property tests hold for `state === fold(events)`, undo appends
and never deletes, `DeviceState` is not assignable to `Event`, and a replay of
1,000 events stays inside a stated budget measured on the target phone.

*Met, with one exception stated plainly.* 11 domain tests (147ms), 7 component,
5 journey. Fold is order-independent under shuffling — the property sync will
depend on. Undo never shortens the log, is idempotent, and alternates correctly
through undo/redo chains. `DeviceState` is proven unassignable at compile time
by `core/types.assert.ts`, and that guard was itself proven to fail when broken.

**Not met: the replay budget has never been measured on a phone.** 1,100 events
fold in 0.20ms best-of-5 in headless Chromium on this Mac, guarded at 5ms as a
regression catch. That is a desktop number. It stays a desktop number until
something runs on a handset.

### 2 · Content, compiled — **done, 30 Aug 2026**
Build-time compiler: raw compendium → typed, versioned, provenance-carrying,
chunked per screen. Runtime import that validates and merges field-by-field.

**Done when** all three axes are non-optional fields resolved in the build and
never re-derived at runtime; the `isAxis` trap is a tier-1 test against its two
real populations — 1,499 `(Rare)`-style magic items and 331 `Resilient (X)`;
a thin import provably cannot delete a rich field; the SRD-only deployment
works; and the creation chunk is under a stated KB over the wire.

*Met.* 39 domain tests, 152ms. Provenance, book and is-it-a-spell are required
fields resolved in `compile-content.ts` and never re-derived. The axis trap is
tested against a committed fixture drawn from the real populations — 1,533
rarity-named items and 365 choice-named feats, zero misread. **Creation chunk:
30KB gzipped against a 64KB budget** (V1: 3.1MB loaded, 0.3MB over the wire).
The SRD-only build is a tested configuration, and an offline fetch returns an
empty layer rather than throwing.

### 3 · A character, made — **underway**
Guided creation and import/export — the nine screens in **CREATION.md**. Quick
Build and Advanced Creation are deferred there and do not block first ship.

**Done when** every choice is an event; the step list is computed per character
so a fighter never sees a Spells step and a step *arrives* rather than changing
underneath the person answering; a level-7 multiclass character is built in one
pass; a character can be exported and re-imported to an identical build; no
screen is over 400 lines; **the question and the actions stay pinned on every
step, with no tap target under 44px**; and the SRD-only build offers Roll and
Manual with no dead segments.

*On that middle clause.* It read "every step fits 1.25 screens", written when
the six-race SRD fallback was the only content, and it is unachievable against
a real compendium: measured in WebKit at 390×844, Choose your background is
**8.95 screens** (109 backgrounds), Choose your ancestry **5.31** (68 grouped),
Spells **2.67**, Languages & Tools **2.52**, Class **1.70**. A list of 109
cannot fit 1.25 screens and should not try. What the budget existed to protect
does hold everywhere, and is what is asserted now: the footer sits at 797 of
844 on every step, and not one tap target is under 44px. The 1.25 figure still
binds the SRD-shaped fallback, which a component test walks end to end.

*Done so far.* The computed step list and `diffSteps` (a step arrives; it never
changes underneath the person answering). The creation model: every choice is
an event, undo works through it for free, and export/import round-trips to an
identical build because the export **is the events**. The licensing seam:
point-buy and the standard array behind one file, `check-imports` enforcing it,
and the SRD-only build offering two segments rather than four with two greyed
out. The step chrome (band order, computed progress, pinned counter) and the
first screen, Abilities.

*Then.* All nine steps, built as three shapes rather than nine files —
`PickOneStep` (ancestry, lineage, class, path, background, equipment),
`PickManyStep` (skills, spells) and `IdentityStep` — plus the flow container
that computes the steps and dispatches the events. 24 component tests and a
journey that builds an elf wizard end to end in WebKit: nine choices, nine
events, still there after a reload. A fighter walks the same flow and is never
asked about spells.

*Then.* Wired to the compiled compendium: 77 grouped ancestries (29 with
lineages), 18 classes past the switch, real backgrounds and cantrips, with
starting gear supplied by the rules rather than a browse of 10,760 items. The
journeys pass **with the compendium and with it deleted** — both are run.

*Then.* The hub — two tiles, not four, because Quick Build and Advanced are
deferred and a tile is not drawn until it exists. A device holds several
characters: every choice carries a character id, and the hub lists them. Export
writes a file and import reads one, with ids reissued on the way in so the same
file twice makes two characters rather than merging one into itself; undo
markers are remapped with their targets. A compendium offered as a character is
refused by name and told where to go. And Back on the first step leaves — a
flow you can only finish is a trap.

*Then.* Multiclassing. A character is no longer one class at one level: the
build carries a list of them, and two steps arrive when they are needed — a
**Level** step (level one is one tap) and a **Classes** step that appears only
above level one. A level-7 fighter/wizard is built in one pass, in one journey
test, and round-trips through export and import.

*Then.* Subclasses. A compendium has no subclass records — they exist inside
each class as features named `"<Grant>: <Subclass>"`. Derived at compile time
into their own chunk: **36 classes, 1,314 subclasses, 292 of them the game's
own, 20KB over the wire** against the 1.5MB the class detail would have cost.
A wizard is asked for its *Arcane Tradition* and a paladin for its *Sacred
Oath*, by name.

*Left.* A character cannot be *viewed*: Open returns to the builder, because
there is no sheet until slice 4. Slice 3 is otherwise done.

### 4 · A character, held — **done, 30 Aug 2026**
The sheet: HP, temp HP, hit dice, rests, death saves, conditions, exhaustion,
inspiration, concentration, slots, resources, gear and derived AC.

**Done when** law 7's order is asserted by a test rather than described in
prose, and the sheet measures **under 1.5 screens** against the worst-case
fixture — a level-20 multiclass caster, full inventory, several conditions
running. V1's equivalent was 3.9 screens. The next addition buys its space by
evicting something, not by shaving a padding.

*Met.* Law 7's order is a test: waiting sits above actions, which sit above
live values. The worst-case fixture is a fighter 12 / wizard 8 with every skill
trained, thirty items, six conditions, concentrating, exhaustion 5 and down —
and it measures inside 1.5 screens. Reference lives in drawers that open OVER
the panel, asserted by measuring that the panel does not grow when one opens.
A condition explains itself rather than being named.

*Since.* Spell slots, racial spells, senses, features and the whole inventory
reached the sheet, and armour class is derived from what is actually worn.

*Left.* Class resources are not on it — a caster can be built and held, but
slots cannot be SPENT: there is no short-rest ledger, so the numbers are read
and never decremented. That belongs with the fight.

### 5 · A character, grown — **first ship · reached 30 Aug 2026**
Level up: hit dice, ASI or feat, subclass choices read out of the compendium.

**Done when** `buildAt(5) === buildAt(1).then(levelTo(5))` for every class,
including multiclass paths.

*Met, and made true by construction rather than by agreement.* There is one
`takeLevel`, and both paths call it: the builder's Level and Classes steps
allocate by *repeating* it, and the level-up screen calls it once. The
invariant is asserted for all twelve classes at level five, for every level
from one to twenty, and for a multiclass split reached from both directions —
plus a test that the two builds differ when the answers differ, so the
equality is not vacuous.

153 domain, 40 component, 19 journey. A character can be created, held, grown,
exported, re-imported and reloaded, on one device, with every one of those
being events in one log.

*Left in the slice.* A feat cannot be taken in place of an ability improvement
on screen — the model carries it and is tested, but the level-up screen offers
only the two ability points. Spell slots, class resources, inventory and
derived armour class are still not on the sheet.

---

---

## First ship reached

Slices 0–5 are done. What that is: a character, end to end, on one device —
built, held, grown, and able to leave and come back as a file. The log has
been the single source of truth since the first commit, so slice 6 replicates
it rather than rewriting anything.

## After first ship

Specified when 5 lands, not before — specifying them now is how a plan becomes
a 47KB document nobody reads.

**6 · The room — underway.** Sync as a transport over the existing log.

*Built.* A `Room` Durable Object storing events keyed by id; a worker routing
`/room/:code`; a client transport that asks for everything and offers
everything on connection, queues while offline, and reconnects. Six-character
codes with no vowels and no look-alikes. A room bar on the hub that says
"Everyone sees this" / "Offline — it will catch up" in words rather than a dot.

*Verified.* 11 tier-1 tests for the protocol. And the room itself, exercised
directly against the Durable Object over real WebSockets: two devices, catch-up
for a late arrival, live broadcast, repeated sends changing nothing, and a
third device receiving the whole log in Lamport order.

*Verified.* All five two-device browser journeys pass: what one device writes
another sees, a late arrival catches up on everything, undo crosses the table,
and a character built on one appears on the other. They run in `verify` under
their own config, because an unrun suite is an unguarded claim.

*And a PWA.* Manifest, maskable icon, service worker. The shell and the
ancestry art are precached; the compendium is not — a player's chunks are 40KB
and worth having offline, the spell and item indexes are 1.4MB and only a
caster in a fight reads them. Two journeys prove the app loads with the network
off and that a log survives an offline reload.

*Left.* Nothing in the room is disclosure-aware: every device sees every event,
which is slice 8's job.
**7 · The fight, both sides — underway.** Seats, creatures and statblocks, staging,
initiative, turn order, rounds, damage, conditions — and the DM half those
need. Combat cannot be built player-only: law 2 makes an attack a claim, and a
claim has nowhere to land without a DM screen to answer it. Staging is a
prerequisite rather than prep, and disclosure is a field on the combatant
rather than a later layer, so both move here from 8 and 9. Principles in
**DM.md**, settled before any of it is written.

*Built so far.* **The seat** (`features/room/seat.ts` + `useSeat`): device-local
and never in the log, defaulting to the DM, remembering which characters are
this device's own so the control cannot offer somebody else's — V1's rule, and
V1's words about how far it goes ("it stops the accident, which is the thing
that actually happens at a table"). A seat pointing at a character who is gone
falls back rather than stranding the device. The crest row's dead `PLAYER` pill
is V1's **"I am"** now: one control, instant, no confirmation.

**The party** (`features/dm/members.ts` + `Party.tsx`), the DM's home: everyone
at the table with hit points, armour class, conditions and what they owe,
derived from the same log every other device reads — a party row holding its
own copy of anybody's hit points would be a second source of truth for the one
number that must never have two. Dying and dead are separate words, because no
single one could carry both. Tablet-first, collapsing to one column.

**And the bar turned by seat**, which was the point of the navigation work: a
DM gets Party, a player gets Sheet, and it is one bar rather than two.

**The bestiary, compiled.** 6,633 creatures: an index of 142KB gzipped fetched
when the staging screen opens, and **one statblock per file** — 1KB at the
median, 3KB at the largest — because as a single chunk the blocks are 2.3MB and
a DM staging three goblins would pay for all six thousand. `content/legendary.ts`
is V1's module ported, and it runs at BUILD time, so what reaches a device is
the three things a dragon can do rather than the eleven entries the book prints.

*Presence: weighed and not built.* The rule it served — the DM acting for a
character only when nobody holds it — was reversed to V1's behaviour, and the
design of the third state layer is written down in DM.md rather than
maintained for a check nobody makes.

**Staging, with disclosure as a field on the combatant** (`features/dm/
fight.ts` + `Staging.tsx`). A creature is staged **hidden** — putting one on
the table is preparation, not narration, and a creature that appears on every
player's screen the instant the DM stages it has spoiled the encounter before
it starts. The ladder is `hidden → present → vague → exact`, drawn as a ladder
and lit cumulatively, per creature: the dragon stays a rumour while the goblins
are an open book. Three goblins are three rows with their own hit points, never
one row with a count — a count cannot say that one of them is nearly down.
Initiative is `null` until rolled, never zero, because "has not rolled" and
"rolled badly" are different facts.

**And the hub's "Enter combat" tile is gone.** It went to the log, was drawn
before the thing behind it existed, and survived three reviews. The fight is a
tab on the DM's bar now, where the seat decides who is offered it.

*Left.* Initiative and turn order, rounds, damage and conditions on creatures,
claims and verdicts, and the player's half of the fight.

**8 · Disclosure, the rest.** The ladder beyond a fight: what a player's log
may say, and the claim/confirm seam applied to everything that is not an
attack.

**9 · Prep.** Places, encounters, NPCs, homebrew, reference.
**10 · Guidance.** Advantage explained, recap, prompts.

---

## The rule for what comes next

Before first ship: the next slice is the next number. There is no judgement
call, and that is the point — V1's plan drifted the moment "what's next" became
a question with more than one answer.

After first ship: the next thing is whatever the weakest module is by a stated
test, and it is named in this file before work starts. Not whatever surfaced.

## The rule for what does not go in this file

Anything that has already been built. That is `git log`. If this file grows
past a page, something has been added that belongs somewhere else.

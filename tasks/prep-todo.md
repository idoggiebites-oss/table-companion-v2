# Phase 8: the DM Prep workspace

*Plan and reasoning: `prep-plan.md`. Numbering continues from the merger's 24.*

---

## Phase 8a — Foundation

## Task 25 · **Opus**: The DM shell

**Description:** DESIGN.md says the DM side starts at tablet and desktop and
collapses to a phone, and that the two surfaces do not share a shell. Only the
player `Shell` exists. This is the DM's: three columns of outline / work /
library, generalising the two-pane grid already in `Staging.module.css`.

**Acceptance criteria:**
- [x] Three columns ≥64rem, two ≥46rem, one below — no horizontal scroll at any width
- [x] The player `Shell` is untouched
- [x] Prep renders inside it with today's content, unchanged in behaviour

**Verification:**
- [x] `npm run check` (size budgets)
- [x] Component test mounting at 390 and at 1024
- [x] Manual: screenshot both widths

**Dependencies:** none · **Scope:** M

**What it turned up.** At 1024 the work column took every spare pixel, so prose
ran to a 750px line and each section's button flew most of a screen from its own
heading — `space-between`, correct inside a card, wrong in a wide column. Capped
to 34rem, the mockup's own centre measure. 46rem was tried first and changed
nothing: it was wider than the track. `tests/phone.tsx` grew a `DESK` size so DM
screens are measured at both widths.

---

## Task 26 · **Sonnet**: The DM's bar

**Description:** The mockup's bar is Combat · Party · Prep · Notes · Log.
Rename Fight to Combat and drop Characters — `Party.tsx` rows are already
buttons wired to open a sheet (`App.tsx:288`), so nothing is lost. Notes joins
when Notes exists, per `tabs.ts`'s own rule that what is not built is not drawn.

**Acceptance criteria:**
- [x] The DM bar reads Combat · Party · Prep · Log
- [x] Tapping a party member still opens their sheet
- [x] The player bar is unchanged — except the fight tab, now also "Combat" (see below)

**Verification:**
- [x] `tabs.test.ts` updated and passing
- [x] The existing party and sheet journeys still pass

**Dependencies:** none · **Scope:** XS

**It opened a hole, and closing it was the real work.** `SeatControl` rendered
only inside the Characters screen, so dropping that tab left a DM with no way
back to their own chair. It now sits in Party's header — the DM's home, and the
screen that absorbed Characters — built once in `App.tsx` and handed to both
homes so the two cannot drift.

**And the player's fight tab was renamed too.** Leaving it would have meant one
screen called "Combat" by the DM and "Fight" by a player: a screen two people at
the same table cannot talk about.

---

### Checkpoint A
- [ ] `npm run verify` clean
- [ ] Both surfaces navigable on phone and desktop

---

## Phase 8b — The session frame

## Task 27 · **Sonnet**: A prepared session

**Description:** `features/dm/session.ts` — a `Prepared` record (title, number,
date, opening recap, goals, checklist) with an event kind and fold mirroring
`scene.ts`. **Not** `recap.ts`'s derived `Session`, which stays as it is: one
is authored, the other observed, and conflating them breaks the recap.

**Acceptance criteria:**
- [x] Saves, replaces by id, and forgets
- [x] Behind the screen in the log — joins `PREP_KINDS`
- [x] `recap.ts`'s derived sessions are unaffected

**Verification:** domain test for the fold and for log privacy
**Dependencies:** none · **Scope:** S

---

## Task 28 · **Sonnet**: The session rail

**Description:** The mockup's left column — title, session number, date, and
the outline with live counts.

**Acceptance criteria:**
- [x] Counts only what is built, so no row promises an unbuilt screen
- [x] Reads on a phone as the first stacked card

**Verification:** component test at both widths; `mislabelled()` empty
**Dependencies:** 25, 27 · **Scope:** M

**Done.** `SessionRail.tsx` carries the title, number and date and a compact
inline editor, because a rail that can only display a session nobody can create
is useless. No hero image and no placeholder for one: an empty frame reads as
broken rather than as not-yet.

---

## Task 29 · **Opus**: Readiness

**Description:** The meter. Derived on every render, never stored — a stored
percentage goes stale the moment anything changes.

**Acceptance criteria:**
- [x] Every line names a fact that is true from the log
- [x] An unbuilt area can never appear in it
- [x] With nothing prepared it draws nothing at all — the rail above already says it

**Verification:** domain test over the derivation
**Dependencies:** 27 · **Scope:** S

**What it threw out of the mockup, and why.** "Boss treasure" and "Session
ending notes" point at loot and notes, neither built — and a percentage that can
never reach 100 is a permanent accusation rather than an overview. "3 encounters
prepared" went too: three is not a rule of the game or of this table, so the
derived checks ask whether a thing exists, never how many. The DM's own
checklist leads, because those are the only lines certainly about tonight, and
the derived ones are statements rather than controls — ticking "An opening to
read out" without writing one would make the meter lie on request.

---

## Task 30 · **Sonnet**: Quick Create

**Description:** The grid from the mockup. Its point, in the brief's words: *"A
DM shouldn't have to dig through menus just to create an NPC they invented
thirty seconds before the session."*

**Acceptance criteria:**
- [x] Every tile opens an editor that exists
- [x] Reachable without scrolling on a phone

**Verification:** component test; journey creating an NPC in two taps
**Dependencies:** 28 · **Scope:** S

**Three tiles, not the mockup's six.** Quest and Loot have nothing behind them,
and a tile that opens nothing is worse than a missing tile — it is a promise
made and broken at the one moment the DM is in a hurry. Scene and Location are
one thing until Task 37 splits them.

**Built alongside a correction.** Arturo asked whether the image-to-code pass had
actually been run on the Prep screen; it had not. The extraction turned up a
structural miss: the rail in the mockup NAVIGATES, with one section highlighted
and the middle column showing only that one. Prep was a stack of everything at
once. Fixed here — see `Outline.tsx`.

---

### Checkpoint B
- [ ] A session can be named and its outline read on phone and desktop
- [ ] `npm run verify` clean

---

## Phase 8c — Encounters, deepened

## Task 31 · **Opus**: The difficulty gauge

**Description:** Port V1's. New `src/rules/5e/encounter.ts` — a path
`check-imports` already permits to reach `non-srd.ts`, written in anticipation
and never created. Brings `thresholdsForLevel`, `budgetForParty`,
`encounterMultiplier`, and a `totals()` whose `budget` is optional.

**Acceptance criteria:**
- [ ] The band is computed from the party the app already holds — no typing in levels
- [ ] The working is shown: `raw × multiplier = adjusted` against the budget
- [ ] Deleting `non-srd.ts` still builds, losing only the band

**Verification:**
- [ ] Monotonicity test over the thresholds — V1's caveat is that *"a wrong digit in a threshold table is invisible; it just quietly mis-rates every fight"*
- [ ] `check-imports` still passes with exactly two importers

**Dependencies:** none · **Scope:** M

---

## Task 32 · **Sonnet**: The encounter builder

**Description:** V1's was 402 lines; V2 has none — an encounter can only be
born from "Keep what is staged". Search the bestiary, add groups, set counts.
Per-group disclosure comes back (V1 had it; the port dropped it).

**Acceptance criteria:**
- [x] An encounter can be built from nothing, without staging first
- [x] Reuses `Staging.tsx`'s bestiary rather than a second picker
- [x] Per-group count and disclosure

**Verification:** domain test; journey building one from empty
**Dependencies:** 31 · **Scope:** M

**Left out of V1's 402 lines, named rather than silent:** the kind and CR-band
filter piles (the plain text search is what `Staging.tsx` proved and what the
brief asked for), V1's hand-drawn gauge (Task 31 computes the band and Task 33
owns the visual), and HP mode — roll-vs-average is not a field on V2's `Entry`
at all.

**A test gap that turned out to be avoidable.** The first pass covered only the
collapsed state, on the grounds that opening it fetches the bestiary and this
tier forbids the network. But `bestiary` has always taken an optional fetcher —
the same door `statblock` and `pushKey` leave open — so the compendium is
injected instead and the open state is covered.

---

## Task 33 · **Opus**: The encounter editor

**Description:** The mockup's tabs — Setup, Creatures, Environment, Rewards,
Notes. Environment reuses `RoomPicker.tsx` unchanged; Send to Combat calls the
existing `openActs()`.

**Acceptance criteria:**
- [x] Five tabs, each holding only its own fields
- [x] Send to Combat leaves the DM on the fight with everything in place

**Verification:**
- [x] **The journey that is the point of this phase:** build an encounter, set
      its environment, send it to combat, and assert the creatures, the room
      *and* the note all arrive on the fight screen

**Dependencies:** 32 · **Scope:** M

**The editor absorbed the builder** rather than sitting beside it: the mockup's
Creatures tab does exactly what T32's builder did, and two screens that build
the same thing is one too many. `EncounterBuilder` is now that controlled panel.

**A precedence rule that had to be written down.** Both a place and an encounter
can carry a room, and they mean different things — a place's is what it is like
to walk into, an encounter's is what it is like when THIS fight starts. The more
specific wins, and "has one" means *not open ground*, because open ground is the
default rather than a choice anybody made. Left implicit it would have been
decided by whichever `room` act happened to be pushed last.

**`send` passes the encounter object, not its id.** `record` appends to the log
and the fold has not run when the next line executes, so a lookup would miss the
encounter saved a microsecond earlier and stage an empty fight.

**Found by looking:** the phone drew "100 XP" twice, because the builder kept
its own working line after the split. The editor owns it — it shows on every tab
— and a test now counts the renderings.

---

## Task 34 · **Sonnet**: Encounter cards

**Description:** The mockup's list rows — name, difficulty and type chips,
creature count, location, status.

**Acceptance criteria:**
- [ ] Status is derived, never typed
- [ ] A card with no location or no creatures still reads

**Verification:** component test at both widths
**Dependencies:** 33 · **Scope:** S

---

### Checkpoint C
- [ ] A DM can prepare a fight from scratch and run it
- [ ] **Stop here and play a session before Phase 8d**

---

## Phase 8d — Images

## Task 35 · **Opus**: Image storage

**Description:** An R2 bucket bound in `wrangler.jsonc`; resize on the client;
upload and serve **behind the gate** — unlike `/gate/`, this is campaign
content. Ids in the log, bytes in R2.

**Acceptance criteria:**
- [~] Bytes round-trip through the live Worker; the second-device check waits on the upload UI
- [x] Served only to an authenticated request — verified live: 401 without the cookie, 201 with it
- [x] The app still runs with the bucket unbound — both routes answer 404 and cards fall back to icons

**Verification:** worker test for the route; room journey across two contexts
**Dependencies:** none · **Scope:** M

---

## Task 36 · **Sonnet**: Images on the cards

**Description:** The session hero and encounter thumbnails from the mockup.

**Acceptance criteria:**
- [ ] Every card still reads with no image — the icon set stays the fallback
- [ ] No layout shift when one loads

**Verification:** component test with and without
**Dependencies:** 35, 34 · **Scope:** S

---

## Task 40 · **Opus**: A face that travels

**Description:** V1 put an edit button on the character portrait, and V1's
`ui/portrait.ts` states the limitation it could not fix:

> *"DEVICE-LOCAL, and deliberately not an event… The cost is honest and worth
> saying out loud: a portrait does NOT travel. The player who set it sees it;
> the DM does not. **Making it travel needs somewhere to put bytes that is not
> the log** — see the map question in ROADMAP.md, which is the same question
> with the same answer missing."*

Task 35 is that missing answer. This is the port, and the fix: the log carries a
64-character id, R2 carries the bytes, and the face reaches the DM's party
screen and every other device at the table.

**What comes across unchanged:** V1's `shrink()` — 256px square, centre-cropped
— which already solves the "a phone hands over eight megabytes" problem this
would otherwise have. And the affordance, which V1 reasoned about carefully: the
portrait IS the button, with a pencil badge riding its rim, because *"a circle
you can press is not obviously a circle you can press — it looks like a
picture"*, and the badge is `aria-hidden` because the button underneath already
says what pressing does.

**What changes:** the storage. `localStorage` and its quota go; an id in the log
and bytes in R2 replace them. The empty state stays the class mark rather than a
grey circle.

**Acceptance criteria:**
- [ ] A portrait set on one device appears on another, and on the DM's party screen
- [ ] With R2 unbound it degrades to the class mark rather than breaking the sheet
- [ ] Removing one leaves no reference in the log; the orphaned object is collectable

**Verification:**
- [ ] Domain test for the id on the character, and for removal
- [ ] Component test: the portrait is one control with one accessible name
- [ ] Manual: set a face on one device, see it on a second

**Dependencies:** 35 · **Scope:** M

---

## Phase 8e — Locations and Scenes

## Task 37 · **Opus**: Scene becomes Location

**Description:** Today's `Scene` is a place with a thing waiting in it and a
note — the brief's Location. Rename it; its events fold forward unchanged.

**Acceptance criteria:**
- [ ] Existing `scene.act` events still fold, now as Locations
- [ ] Nothing in the fight path changes behaviour

**Verification:** the Task 19 journey still passes untouched
**Dependencies:** none · **Scope:** S

---

## Task 38 · **Opus**: Scenes as beats

**Description:** The brief's Scene — title, the Location it happens in,
characters involved, read-aloud, triggers, outcomes, notes.

**Acceptance criteria:**
- [ ] A Scene references a Location rather than restating it
- [ ] Read-aloud reaches the fight screen the way a Location's note does

**Verification:** domain test; journey opening a scene
**Dependencies:** 37 · **Scope:** M

---

## Task 39 · **Sonnet**: Key Scenes

**Description:** The ordered list in the session panel. A plan, not a track.

**Acceptance criteria:**
- [ ] Nothing advances on its own; ticking is manual
- [ ] Any scene opens from any position, in any order

**Verification:** component test asserting order is not enforced
**Dependencies:** 38, 28 · **Scope:** S

---

### Checkpoint D
- [ ] Session prep and campaign prep are visibly separate things
- [ ] `npm run verify` clean, deployed

---

## Task 41 · **Opus**: NPCs, as the brief asks for them

**Description:** V2 has an NPC creator and it is a faithful port — which is the
problem. V1's record had six fields and so does V2's: name, role, notes, a
`trader` flag, stock, and optional stats. The brief asks for eleven.

Adding: **race/species**, **faction**, **attitude toward the party**,
**voice and personality notes**, **goals**, **secrets**, **quick actions**, and
**relationships to other NPCs**. Portrait comes with Task 40.

**The rule that must survive all of it** is V1's, and it is the reason the
record is small today: *"Most of the ones a campaign accumulates never roll
anything — a shopkeeper, a harbourmaster, the contact who knows a guy — and
forcing them through a creature form would mean inventing an armour class for a
man who sells rope."* Eleven fields on one form is exactly that mistake at
greater length. So the form stays notes-first and everything new is folded away
until asked for, the way `stats` and `stock` already are.

**Two that need a decision inside the task:**
- **Attitude** is a short fixed list, authored here rather than transcribed —
  the DMG's reaction table is not SRD, and `non-srd.ts` is a one-file exit that
  should not grow a third reason to exist.
- **Relationships** are links by id and must not become a graph editor. One
  list of "who this person is to whom", read from both ends.

**Acceptance criteria:**
- [ ] A shopkeeper can still be written in a name and one line, with nothing else shown
- [ ] Secrets never reach a player — the whole kind is already in `PREP_KINDS`, so this is a test rather than a change
- [ ] A relationship added from one side is visible from the other

**Verification:** domain tests for the fold and the relationship read-back; a
component test that the empty form is still short
**Dependencies:** none (40 for the portrait) · **Scope:** M-L

---

## Task 42 · **Sonnet**: The library column

**Description:** The mockup's right-hand column, which no task covered — Quick
Access counts, Recent NPCs with faces and roles, and Pinned Notes. `DmShell`
already has the `library` slot and drops the third track when nothing fills it,
which is why the desktop layout currently looks unbalanced.

**The distinction it draws is the point of the whole screen**, in the brief's
words: *"session prep and campaign prep aren't the same thing."* The rail is
tonight; this column is the campaign — everything reusable, so a DM adds
Captain Theron to a scene rather than inventing him twice.

**Acceptance criteria:**
- [ ] Only lists what exists, like the rail
- [ ] Nothing here is tonight's plan — it is the library, and it says so
- [ ] Absent below 64rem rather than stacked at the bottom, where it would be a second copy of the outline

**Verification:** component test at 390 and 1024
**Dependencies:** 28 · **Scope:** M

---

## Task 43 · **Opus**: The DM code

**Description:** V2's seat is self-declared. `seat.ts` keeps it on the device
and the picker offers "The DM" to anybody — so in a shared room a player can
become the DM and read the whole log. Every disclosure decision this app makes
is enforced by seat: `visibility.ts` filters the log by it, `fight.ts` hides
creatures by it, `PREP_KINDS` hides prep by it. **All of it is honour-system
until this exists.**

V1 solved it and the shape is worth copying exactly. The room's creator is a DM
and the room holds a `dmKey`; anyone already joined can claim the DM seat by
presenting it. Two rules from V1's own comment:

> *"Additive — the device that started the room stays a DM, so a laptop and a
> tablet can both be one."*
> *"Joining closes after a window; claiming deliberately does not. Losing a
> device is exactly the case this exists for, and it can happen in week nine."*

**Acceptance criteria:**
- [x] A device in a room cannot take the DM seat without the key
- [x] The creator keeps it, and a second device can claim it too
- [x] Solo play is unaffected — a device in no room is its own DM, as now

**Verification:** worker tests for claim and refusal; a room journey across two
contexts where the second is refused and then succeeds with the key
**Dependencies:** none · **Scope:** M

**What it does not do, and this is the honest limit:** it gates the SEAT, not
the transport. The room still hands every event to every socket, so somebody
with the room code and a terminal can read what the DM hid. Filtering
server-side would mean `Room.ts` folding events and knowing what a creature is,
which is exactly what its header refuses. This stops the accident — a player
finding "The DM" in a picker and looking — which is the thing that actually
happens at a table, and the same line `seat.ts` already draws for characters.

**Two bugs found while building it.** Hiding the option is not enough: `useSeat`
defaults every fresh device to the DM, so a phone that has never been in a room
arrives in somebody else's already sitting there. And the eviction has to run
AFTER `seatIn`, not before — `seatIn` falls back to the DM for a player seat
pointing at nobody, so the first ordering put a keyless device straight back in
the seat it had just left.

---

## Task 44 · **Sonnet**: Settings, behind one button

**Description:** The Characters screen currently spends its top third on things
a person touches twice a campaign: the room code with "Everyone sees this", a
Leave button, and the push toggle. They crowd out the two things that screen is
actually for — making a character and importing one.

Move them behind a cogwheel in the header. The gate's sprite sheet has a gear
and an anvil roundel already cut; use one rather than drawing a new glyph.

**Acceptance criteria:**
- [ ] The room code, Leave, and the push toggle all live behind one control
- [ ] "Everyone sees this" survives in some form — it is the sentence that stops somebody pasting the code publicly
- [ ] Guided creation and Import are the first things on the screen

**Verification:** component test at 390; the room journey still joins and leaves
**Dependencies:** none · **Scope:** S-M

---

## Task 45 · **Opus**: Class descriptions, which never arrive

**Description:** Long-pressing a class in creation shows its provenance and no
prose. Two independent faults:

1. `useProse.ts`'s `pileFor` maps ancestry, background, feat, spells and
   subclass to a pile and **has no case for `class`** — so it returns null and
   never fetches.
2. `describe/class/` is published **empty**. `compile-content.ts` builds each
   block from `o.text ?? o.description`, and class rows in the corpus carry
   neither, so every block is empty and nothing is written.

A class's meaning in this corpus is its FEATURES, the same way a race's is its
traits — which the compiler already special-cases for race and background.

Note the app already has an authored sentence per class from Task 22
(`CLASS_BLURB.sentence`). That is what a chooser most wants and it is already
licensed and accurate; the compendium prose is the depth behind it.

**Acceptance criteria:**
- [x] Long-pressing a class shows something true about it — Task 22's authored sentence, which nothing was reading
- [~] A class the app ships no judgement about falls back to its name and book; the compendium half is below
- [ ] Republishing the compendium emits a non-empty `describe/class/`
- [ ] `pileFor` gains its `class` case — deliberately NOT added yet, because
      until the pile has files in it every long-press would spend a 404

**Verification:** a content-compiler assertion that the pile is non-empty; a
component test on the drawer
**Dependencies:** none · **Scope:** M

---

**Phase 9, not planned yet:** Quests · Loot & Rewards · Notes · Random Tables ·
Reference. Deliberately left until a session has been played on Phase 8. Loot
needs the purse half of `money.ts` that `PORT.md` lists as not ported.

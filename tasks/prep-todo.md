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
- [ ] Every tile opens an editor that exists
- [ ] Reachable without scrolling on a phone

**Verification:** component test; journey creating an NPC in two taps
**Dependencies:** 28 · **Scope:** S

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
- [ ] An encounter can be built from nothing, without staging first
- [ ] Reuses `Staging.tsx`'s bestiary rather than a second picker
- [ ] Per-group count and disclosure

**Verification:** domain test; journey building one from empty
**Dependencies:** 31 · **Scope:** M

---

## Task 33 · **Opus**: The encounter editor

**Description:** The mockup's tabs — Setup, Creatures, Environment, Rewards,
Notes. Environment reuses `RoomPicker.tsx` unchanged; Send to Combat calls the
existing `openActs()`.

**Acceptance criteria:**
- [ ] Five tabs, each holding only its own fields
- [ ] Send to Combat leaves the DM on the fight with everything in place

**Verification:**
- [ ] **The journey that is the point of this phase:** build an encounter, set
      its environment, send it to combat, and assert the creatures, the room
      *and* the note all arrive on the fight screen

**Dependencies:** 32 · **Scope:** M

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

**Phase 9, not planned yet:** Quests · Loot & Rewards · Notes · Random Tables ·
Reference. Deliberately left until a session has been played on Phase 8. Loot
needs the purse half of `money.ts` that `PORT.md` lists as not ported.

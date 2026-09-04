# Implementation Plan: the DM Prep workspace (Phase 8)

*Kept apart from `plan.md`, which is the V1→V2 merger and still has R1 and R4
open. Tasks are in `prep-todo.md`.*

## Overview

Prep is three stacked lists behind one tab. It becomes a **session
workspace**: a command centre on tablet and desktop, the same sections stacked
on a phone, with a session frame, a readiness meter, Quick Create, and an
encounter editor whose last button hands the whole fight to Combat.

DESIGN.md already commits to the direction — *"The DM side starts at tablet and
desktop and collapses to a phone… the two surfaces do not share a shell"* — so
this closes a gap against the project's own law rather than opening a new one.

The three deferrals recorded in `Prep.tsx` (an outline listing unbuilt areas,
scenes as a running order, a readiness metric) were each marked "reversible if
a real session says otherwise". The brief is that answer.

## Skills applied

- **`agent-skills:planning-and-task-breakdown`** — vertical slices, per-task
  acceptance criteria, S/M sizing, checkpoints between phases.
- **`taste-skill:image-to-code-skill`** — the supplied mockup is the source of
  truth. Each screen gets its deep-extraction pass first: exact copy, type
  scale, spacing, component structure, chip and status vocabulary.
- **`taste-skill:soft-skill`, guardrails only** — `transform`/`opacity` only,
  `IntersectionObserver` never scroll listeners, `backdrop-blur` only on fixed
  elements, z-index reserved for systemic layers. Its scroll-entry
  choreography, exaggerated radii and massive type are **rejected**: they
  contradict DESIGN.md's height budgets, and a DM at a live table must read a
  screen instantly rather than watch it arrive.

## Architecture decisions

**1. A planned session and a played session are different objects.**
`recap.ts` derives the played one from a 6-hour log gap and keeps doing so —
it is what the recap and the prompts read. The brief's session is *authored*.
Conflating them would either break the recap or invent a date. The derived one
stays `Session`; the authored one is `Prepared`.

**2. A running order, without a track.** V1: *"a table goes where it goes, and
a tool that assumed an order would be wrong every session and smug about it."*
The order is a **plan, not a track** — ticking is manual, nothing advances on
its own, and any scene opens from any position.

**3. Difficulty is V1's gauge, ported.** `check-imports` already permits
`src/rules/5e/encounter.ts` to reach `non-srd.ts` — a path written in
anticipation and never created. `thresholdsForLevel`, `budgetForParty` and
`encounterMultiplier` come across, and `totals()` takes an **optional** budget:
that optionality *is* the licensing exit, and deleting `non-srd.ts` must still
build, losing only the band. Two rules travel with it — **show the working**
(`raw × multiplier = adjusted`), because *"a band on its own teaches nobody why
adding a seventh goblin mattered"*, and **the band is judged on the adjusted
total; the award is not**.

**4. Today's `Scene` is really a Location.** Rename; its events fold forward
unchanged. The brief's `Scene` is a new record that references a Location.
This is the backbone of session-prep vs campaign-prep.

## What already exists — do not rebuild

| Built | Where |
|---|---|
| Send to Combat: clears, stages, sets the room. Environment **and** the read-aloud note already cross into the fight. | `features/dm/scene.ts` → `openActs()` |
| Environment, hazards, lighting — already feeding `stance.ts` | `rules/5e/terrain.ts`, `RoomPicker.tsx` |
| Party → character sheet (the requested merge) | `Party.tsx`; `App.tsx:288` |
| Creature search over 6,633 creatures | `Staging.tsx`, `creatures.ts` |
| Opening-recap material that refuses to invent | `recap.ts`, `LastTime.tsx` |

## Who runs what

Per task, not per session. The rule that held across the merger's 24: **Sonnet
where the specification already exists and the criteria are precise** — a port
whose V1 file is the spec, a screen whose mockup is the spec, a record type.
**Opus where a plausible-looking wrong answer would survive** — architecture, a
subtle invariant, an auth boundary, or a number that is quietly wrong.

| | task | model | why |
|---|---|---|---|
| 25 | The DM shell | **Opus** | Three breakpoints and two surfaces; a layout that looks right at one width and breaks at another passes every test |
| 26 | The DM's bar | **Sonnet** | One line, precise criteria |
| 27 | A prepared session | **Sonnet** | `scene.ts` is the template, field for field |
| 28 | The session rail | **Sonnet** | The mockup is the spec |
| 29 | Readiness | **Opus** | Its whole job is not lying — a naive meter counts unbuilt areas and shows 0% |
| 30 | Quick Create | **Sonnet** | A grid opening editors that already exist |
| 31 | The difficulty gauge | **Opus** | Transcribed tables where a wrong digit is invisible, a licensing exit that must stay deletable, and a rule that doubles a campaign's progression if inverted |
| 32 | The encounter builder | **Sonnet** | V1's 402-line file is the specification |
| 33 | The encounter editor | **Opus** | The join: everything must arrive on the fight screen together |
| 34 | Encounter cards | **Sonnet** | The mockup is the spec; status is derived |
| 35 | Image storage | **Opus** | An auth boundary, and it must still run with the bucket unbound |
| 36 | Images on the cards | **Sonnet** | Fallback and layout shift, both stated |
| 37 | Scene becomes Location | **Opus** | An event-sourced rename can silently drop history and still pass |
| 38 | Scenes as beats | **Opus** | A new record referencing another, reaching the fight screen |
| 39 | Key Scenes | **Sonnet** | An ordered list that enforces nothing |
| 40 | A face that travels | **Opus** | Storage swapped under a control V1 already reasoned about; the failure mode is a sheet that breaks when R2 is absent |

**Nothing here is Haiku-shaped**, and that is worth writing down rather than
leaving an inviting gap: every task either ports reasoning out of V1 or lands
against a mockup that has to be read closely.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Size budgets: `App.tsx` is at 400, `Prep.tsx` 144 | High | Expect real splits, not shaves. `PrepScreen.tsx` was exactly this. |
| The threshold tables are transcribed by hand | High — silently mis-rates every fight | Monotonicity test (T31). V1's caveat: *"a wrong digit is invisible."* |
| R2 adds infrastructure to a project that had none | Medium | Ids in the log, bytes in R2, served behind the gate; the app must still run with the bucket unbound. |
| Nine content areas invite horizontal slicing | Medium | Every task ships something usable; Checkpoint C is a real stop to go and play. |

## Open questions

- Phase 9 (Quests, Loot, Notes, Random Tables, Reference) is deliberately
  unplanned until a session has been played on Phase 8. Loot additionally needs
  the purse half of `money.ts` that `PORT.md` lists as not ported.

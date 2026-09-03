# Implementation Plan: merging table-companion V1 into V2

## Overview

V1 (`~/table-companion`, 38.8k lines) and V2 (`~/table-companion-v2`, 17.8k lines)
are not two systems to interleave. A dependency graph of both (graphify, 2 Sep
2026) shows V2 has already absorbed the whole bottom of V1's stack: all 18 of
V1's leaf domain modules have V2 counterparts. What is missing is the top —
the fight, disclosure, prep, guidance — which is exactly PLAN.md's slices 7-10.

So "merger" here means: **finish V2 to full parity, lift the Worker pieces V2
lacks, cut over in place, retire V1.** The port is roughly 60% done and the
remaining work is already named.

## Decisions (settled with Arturo, 2 Sep 2026)

- **No character data migrates.** Nothing in V1 is worth keeping, so V1 needs
  no exporter and V2 needs no V1-format importer. This removes an entire phase
  and dissolves the question of building a new feature into a system being
  deprecated.
- **V2 takes V1's origin.** This makes the storage collision (Risk 1) blocking
  rather than theoretical, and it changes the retirement shape: two apps cannot
  serve one origin, so this is a **cutover, not a strangle**. The mitigation is
  therefore a rollback plan, not parallel running.
- **Full parity before retirement.** Slices 8, 9 and 10 stay in scope. V1 is
  not retired until disclosure, prep and guidance exist in V2.

## Architecture Decisions

- **The port order is the dependency graph, but the unit of work is a vertical
  slice.** The graph says what *can* be built when; it is not a work breakdown.
  Porting eleven depth-1 modules leaves eleven modules nothing calls. Each task
  cuts through domain + UI + test and leaves the app working.
- **V1's Worker pieces are copied, not ported.** `gate.ts` (126 lines) and
  `push.ts` (208) are a passphrase gate and web push, with zero rules content.
  The rebuild's "write the tier-1 test first, then port" discipline exists to
  re-derive *reasoning*; there is no 5e reasoning in a VAPID key.
- **V2 already does room admission.** `worker/index.ts` validates the six-character
  code and routes to the Durable Object; `RoomBar` is wired into `App.tsx`.
  An earlier draft of this plan claimed otherwise, having sized the Worker gap
  by line count (847 vs 115) instead of by capability. The actual gap is the
  passphrase gate and web push — nothing about joining a room.
- **V1 stays on disk until Phase 7 closes.** The standing rule is to read V1's
  module before designing V2's, so deleting the reference before the port is
  done removes the thing the port is checked against.

## Who runs what

Settled with Arturo, 2 Sep 2026:

- **Tasks 1 and 3 → Sonnet.** Mechanical and fully specified: a root commit,
  and a database rename with its test. Nothing to re-derive.
- **Everything else → Opus.** Task 2 is import-graph surgery with an unbounded
  set of call sites; Task 4 is an investigation with live unknowns; Tasks 5-11
  port V1's *reasoning*, which is the half that goes thin when re-derived from
  the data (the armour lesson).

Task 3 depends on Task 1, so the two Sonnet tasks run in sequence, not parallel.
A delegated task carries its `todo.md` entry verbatim — the acceptance criteria
and verification commands are the brief.

## Task List

Detailed tasks are in `tasks/todo.md`. Phases 4-6 are named but deliberately
not broken down — per PLAN.md's own rule, the next slice is named before work
starts, and breaking down work three slices out is planning fiction.

### Phase 0: Safety net
- [x] Task 1: Commit V2 — done, commit `9ae2a27`
- [x] Task 2: Break the creation barrel cycle — done; zero runtime cycles, guarded by a new tier-4 `check-cycles`

### Checkpoint: Safety net
- [x] `git log` shows a root commit; `git status` is clean
- [x] Zero **runtime** import cycles, enforced by tier-4 `check-cycles`. (graphify's own cycle count includes type-only edges, which tsc erases and which cannot cause the module-init bug — it reports 24 before and after. Value-import cycles are the real measure.)
- [~] `npm run verify`: typecheck, tier 4 (10 checks), tier 1 (531), tier 2 (91) and tier 3 journey (49) all pass. **Tier 3 "the room" fails on `config.webServer` timeout — `wrangler dev` on 8791 never answers from this shell. Pre-existing and environmental**, reproduced before any Task 2 edit; it is Task 4's verification step, to be run from Arturo's own terminal.

### Phase 1: V2 survives on V1's origin
- [x] Task 3: Namespace V2's IndexedDB away from V1's — done, verified against real IndexedDB and a live browser; surfaced the service-worker risk above
- [x] Task 4: Separate V2's deployment identity from V1's — done; V2 deploys as `table-companion-v2`, `env.ASSETS` bound, DO inheritance ruled out

### Checkpoint: Storage and deployment
- [x] V2 opens cleanly on an origin that already holds V1's database
- [x] V1, if loaded again, still finds its own data intact
- [x] V2 cannot replace V1 by accident
- [~] `npm run verify` — the room tier cannot run until the asset-count question below is answered

### Phase 2: Lift the Worker pieces V2 lacks
*Safe to parallelize with Phase 3 — no shared files.*
- [x] Task 12: Publish the compendium separately, versioned — **unblocked this phase**; `npm run test:room` runs, 5 passed
- [x] Task 5: Port the passphrase gate — done; `run_worker_first` landed with it, and the gate gained the tests it had none of
- [ ] Task 6: Port web push

### Checkpoint: The room
- [ ] `npm run test:room` passes against `npm run dev:worker`
- [ ] An unauthenticated device is challenged; a configured device is not
- [ ] With no passphrase set, the gate fails open

### Phase 3: The fight, end to end (completes slice 7)
- [x] Task 7: Initiative and turn order — done; order derived, not stored. Four bugs found only by the screenshot.
- [x] Task 8: Damage and healing on staged creatures — done; brief had the dying/dead rule wrong, corrected against V1
- [ ] Task 9: Conditions on combatants
- [ ] Task 10: The attack — a player claims, the DM answers
- [ ] Task 11: The player's half of the fight

### Checkpoint: The fight
- [ ] A fight runs start to finish with a DM and one player on two devices
- [ ] The sheet, the party and the fight agree on every hit point number
- [ ] `npm run verify` passes; MINIMUMS ratcheted

### Phase 4: Disclosure (slice 8)
Ports `visibility.ts` + `permissions.ts`. Break down when Phase 3 closes.

### Phase 5: Prep (slice 9)
Ports `encounter.ts`, `scenes.ts`, `npc.ts`, `homebrew-item.ts`, plus V1's
`import/fightclub.ts`. Break down when Phase 4 closes.

### Phase 6: Guidance (slice 10)
Ports `guidance.ts`, `recap.ts`, `prompts.ts`, `nudge.ts`. Break down when
Phase 5 closes.

### Phase 7: Cut over and retire V1
- [ ] Task R1: Measure what V1 is still used for
- [ ] Task R2: Freeze V1 and write the rollback plan
- [ ] Task R3: Cut the origin over to V2
- [ ] Task R4: Archive V1

### Checkpoint: Complete
- [ ] V2 has served two consecutive real sessions with no rollback
- [ ] Every V1 module is either ported, deliberately dropped, or listed in
      PORT.md's "Dies" section with a reason
- [ ] V1 repo archived, not deleted — it is the port's reference

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **V1 and V2 share the IndexedDB name `table-companion`.** V1 created it at version 2; V2 opens at version 1. A lower requested version fails with `VersionError`, so V2 breaks on exactly the devices that ran V1 — invisible on localhost, where different ports are different origins. Confirmed blocking: V2 takes V1's origin. | **High** | Task 3, before any deploy. V2 gets its own database name and never touches V1's. |
| **V2 has 400 untracked files and zero commits.** Every task is a refactor with no rollback. | **High** | Task 1, first. |
| **Both repos declare the same Worker name (`table-companion`).** A `wrangler deploy` from V2 replaces V1 on the same workers.dev subdomain today, with no plan step involved. | **High** | Task 4. Until it lands, do not run `wrangler deploy` from V2. |
| **Same DO class (`Room`) and same migration tag (`v1`) in both.** V2's `Room.ts` would inherit Durable Objects holding room state written by V1's class; the differing binding name (`ROOM` vs `ROOMS`) does not isolate them. | **High** | Task 4 answers it with evidence — reuse safely, or declare a distinct class/tag. |
| **The cutover is not reversible by parallel running.** One origin serves one app, so V2 replacing V1 is a switch, not a gradual migration. | **High** | Task R2 writes the rollback *before* R3 cuts over: V1 stays deployable and one command restores it. |
| **V2's `worker/index.ts:20` calls `env.ASSETS.fetch` but no `ASSETS` binding is declared** — confirmed from wrangler's own bindings table, which lists only `env.ROOMS`. V1 declares both `assets.binding` and `run_worker_first`. Runtime impact unverified: V2's `wrangler dev` on 8791 answers nothing from the Claude Code shell. | Medium | Task 4 — Arturo probes it from his own terminal, then the fix follows the evidence. |
| ~~`dist/` holds 13,683 assets and `wrangler dev` cannot start.~~ **Resolved by Task 12.** Measured: not size (58MB in 6,771 files boots in 4s) but count, with the cliff between ~7,000 and ~10,300. `dist/` is now 51 files, the room tier runs, and the 20,000-asset deploy ceiling no longer applies. | ~~High~~ done | Task 12. |
| **V1 runs a service worker (`vite-plugin-pwa`) at the same scope V2 will occupy.** Verified 2 Sep 2026 in a real browser: swapping the backend server alone did not surface V2 — the page kept rendering V1's cached UI until the SW was explicitly unregistered. A device that has V1 installed will keep running it after R3's cutover until its service worker is superseded, on Workbox's own update timing, not ours. | **High** | New: confirm `vite-plugin-pwa`'s update strategy (`registerType`) in both configs before R3. R2's rollback plan and R3's cutover both need to account for this — a "cut over" that half the table doesn't see for an unknown number of reloads is not a clean switch. |
| **Three runtime import cycles in `features/creation/`**, all caused by `model.ts` re-exporting its own dependents. This is the mechanism behind the `EMPTY.heritage === undefined` bug already fixed once at the symbol level. | Medium | Task 2, before porting anything through that core. |
| `src/ui/Combat.tsx` fails AST parse at line 581 — 11 of ~1,602 lines extracted. V1's combat is under-represented in the graph, so Phase 3 sizing is a floor. | Medium | Read `Combat.tsx` directly when starting Task 6; do not trust the graph's sizing there. |
| Porting reasoning gets dropped and V2 re-derives something thinner (the armour lesson). | Medium | Standing rule: open V1's module first. Each task names its V1 source. |
| Full parity is four more slices; V1 must be maintained throughout. | Medium | V1 is frozen at Task R2 — fixes only, no features. |

## Open Questions

- ~~How should the compendium reach the browser?~~ **Settled 3 Sep 2026: a
  published site, with the version in the path (Task 12).** Local dev and every
  test tier use `scripts/serve-content.mjs`; production points
  `VITE_CONTENT_BASE` at the Pages site. The remaining step is Arturo creating
  that site — `npm run publish:content <checkout>` stages into it.
- **Is the kit-or-gold switch in scope?** Recorded on Review today but never
  offered as a mode; V1's `money.ts` is unported and nothing in slices 7-10
  needs it.

---

*Dependency graph: `graphify-out/graph.html` in both repos, built 2 Sep 2026.
V1: 2,186 nodes / 4,970 edges / 0 cycles. V2: 1,201 / 3,182 / 3 cycles.*

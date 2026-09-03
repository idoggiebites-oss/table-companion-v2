# Tasks: merging table-companion V1 into V2

Plan and rationale: `tasks/plan.md`. Every task names its V1 source module —
open that first, per the standing rule.

Repo-wide Definition of Done, on top of each task's own criteria:
`npm run verify` passes all four tiers, and `scripts/verify.mjs` MINIMUMS
(`{ domain: 493, component: 89, journey: 47 }`) is ratcheted whenever a suite
grows. Silence is not success.

---

## Phase 0: Safety net

## Task 1: Commit V2

**Description:** V2 has zero commits and 400 untracked files. Every task after
this one is a refactor, and there is currently nothing to roll back to. Make
the root commit before touching a line.

**Acceptance criteria:**
- [x] `git log` shows a root commit containing all of `src/`, `worker/`, `tests/`, `scripts/` and the plan docs
- [x] `.gitignore` still excludes `node_modules/`, `dist/`, `shots/`, `test-results/`, `public/content/`, `graphify-out/` (added `.wrangler/` too — untracked local dev state, same as V1's own gitignore)
- [x] No compendium output or `.dev.vars`-style secret is in the commit

**Verification:**
- [x] `git status --short` is empty
- [x] `git ls-files | wc -l` is 299 (fewer than the ~400 estimate — the estimate counted all untracked entries recursively before `.wrangler/` was excluded), and `git ls-files | grep -c public/content` is 0
- [x] Build succeeds: `npm run build` (exit 0, 154 modules, 4.06s)

**DONE** — commit `9ae2a27`, root commit, 299 files, 35,478 insertions.

**Dependencies:** None
**Files likely touched:** `.gitignore`
**Estimated scope:** XS

---

## Task 2: Break the creation barrel cycle

**Description:** `model.ts` re-exports its own dependents (lines 18-22), and
`scores.ts`, `reduce.ts` and `log.ts` import values back from it — three
runtime cycles. This is the mechanism that left `EMPTY.heritage` undefined
once already; moving `Heritage` to a leaf fixed that symbol, not the cause.
Delete the re-exports and repoint call sites at the real modules.

**Acceptance criteria:**
- [x] `model.ts` lines 18-23 (the whole barrel, including the type-only re-exports) are gone — and with them line 13's `import { characterOf, type Choice, type CharacterId } from "./choices"`, which existed *only* to feed the barrel and was unused in the body
- [x] `reduce.ts` imports `NO_HERITAGE` from `./heritage`, not `./scores`
- [x] `scores.ts` no longer re-exports `NO_HERITAGE` / `Heritage`
- [x] Every former barrel consumer imports from the owning module directly — 28 import sites across 25 files
- [x] Also fixed: `choices.ts` was reaching `Heritage` through `./scores` too — same indirection, now straight from `./heritage`

**Verification:**
- [x] **Zero runtime import cycles**, by a new tier-4 check (see below). Note the graphify criterion as written was misleading: its AST edges count `import type` as an edge, so it reports 24 "cycles" for this repo both before *and* after. Type-only edges are erased by tsc and cannot cause module-init failure, which is the entire bug. The measure that matters is cycles among **value** imports: `model↔scores`, `model↔reduce`, `model↔log` — all three gone.
- [x] Tests pass: `npm run test:domain` — 531/531, exit 0
- [x] Tests pass: `npm run test:component` — 91/91, exit 0
- [x] Build succeeds: `npm run build` exit 0; `npm run typecheck` exit 0
- [x] Manual check: tier 3 journey 49/49 including *"a half-elf is asked to place the points the book left them"*. `heritage.skills` held-and-labelled behaviour covered by `scores.test.ts` and `compendium.test.ts:189`. Separately proved the original failure directly: entering the graph via `compendium.ts` first (the entry that broke) now yields a defined `EMPTY.heritage` equal to `NO_HERITAGE`.

**New: `scripts/checks/cycles.mjs`, tier 4 (now 10 checks).** Nothing previously
stopped this returning — `check-imports` enforces layering, not cycles, which is
why the barrel survived the first fix. Tarjan over value-import edges only;
type-only edges deliberately excluded, since flagging two dozen harmless cycles
trains everyone to ignore the check. **Proven by reintroducing one barrel line
and watching it fail**, naming both edges, then restoring.

**On scope:** this passed the "split if it exceeds 5 files" guidance — 27 files.
It was not split, deliberately: removing a re-export and repointing its consumers
is one atomic change, and any intermediate commit would leave `model.ts` still
re-exporting some of its own dependents, i.e. the cycle still present. There is
no partial state worth checkpointing. Applied via a validate-everything-then-write
script so a bad match aborted before touching disk.

**Dependencies:** Task 1
**Files touched:** 25 source files + `scripts/check.mjs` + new `scripts/checks/cycles.mjs`
**Actual scope:** L — 27 files, but one mechanical change

**DONE.**

---

### Checkpoint: Safety net
- [x] Root commit exists, working tree clean
- [x] Zero runtime import cycles, guarded by tier-4 `check-cycles`
- [~] `npm run verify`: typecheck, tier 4 (10), tier 1 (531), tier 2 (91), tier 3 journey (49) pass. Tier 3 "the room" cannot run — see Task 4's asset-count finding.

---

## Phase 1: V2 survives on V1's origin

## Task 3: Namespace V2's IndexedDB away from V1's

**Description:** Both apps call their database `table-companion`. V1 created it
at version 2 with stores `log` + `meta`; V2 opens at version 1 with store
`events`. A lower requested version raises `VersionError`, so V2 fails to open
its log on any origin where V1 ran — which is every device, since V2 is taking
V1's origin. Different local ports hide this entirely.

No data migrates (settled), so this is purely about not crashing. V2 must not
read, upgrade or delete V1's database: V1 stays deployable as the rollback for
Task R2, and a V2 that clobbers V1's data destroys the way back.

**Acceptance criteria:**
- [x] `openLog`'s default name is distinct from V1's (`table-companion-v2`)
- [x] Opening V2 on an origin that already holds V1's `table-companion` database succeeds and reads an empty log
- [x] V1's database is never opened, upgraded or deleted by V2
- [x] Reloading V1 afterwards still finds its own data intact

**Verification:**
- [x] Tests pass — **corrected: `test:component`, not `test:domain`.** Domain tier runs under Node (`environment: "node"` in `vitest.config.ts`), which has no `indexedDB` global at all; a collision this specific has to be proven against real IndexedDB, which only the component tier's real Chromium provides. New file `src/core/persist.test.tsx`, 2 tests, both pass.
- [x] Manual check, done for real against a live browser (Playwright, persistent profile): V1 served on `:4173`, loaded, created `table-companion@2`. Server swapped to V2's build on the **same** port, same profile, reloaded. Both databases coexist: `table-companion@2` (`upgraded: false` — V1 untouched) and `table-companion-v2@1`. Zero console errors either load.
- [x] Build succeeds: `npm run build` (`tsc --noEmit` + vite build, exit 0)

**Also found during the manual check, not part of this task's fix:** V1 registers a
service worker (`vite-plugin-pwa`) at scope `http://localhost:4173/`. Swapping
the backend server alone did **not** show V2 — the browser kept rendering V1's
UI from the stale SW's cache until it was explicitly unregistered. Real finding,
added to `plan.md`'s risk table under Phase 7 (cutover), since that is where it
bites — Task 3 itself is unaffected, the IndexedDB fix is correct and proven
independently of the SW question.

**DONE.** `persist.ts` renamed, `persist.test.tsx` added (2/2 passing),
`scripts/verify.mjs` MINIMUMS.component ratcheted 89 → 91 (component tier grew
by these 2 tests). Full domain (531) and component (91) suites re-run clean.

**Dependencies:** Task 1
**Files likely touched:** `src/core/persist.ts`, `src/ui/useLog.ts`, `src/core/log.test.ts`
**Estimated scope:** S

---

## Task 4: Separate V2's deployment identity from V1's

**Description:** Both repos declare `"name": "table-companion"` in
`wrangler.jsonc`, so a `wrangler deploy` from V2 replaces V1 on the same
`workers.dev` subdomain — today, by accident, with no plan step involved. Three
things follow, and they are the whole of the cutover's mechanics.

*The Durable Objects.* Both declare class `Room` under migration tag `v1`
(`new_sqlite_classes: ["Room"]`). Same class, same tag, same worker name, so
V2's `Room.ts` inherits namespaces already holding room state written by V1's
class. The differing binding name (`ROOM` vs `ROOMS`) does not isolate it.

*The missing bindings.* V1 declares `assets.binding: "ASSETS"` and
`run_worker_first: true`; V2 declares neither, yet `worker/index.ts:20` calls
`env.ASSETS.fetch(request)`. Confirmed absent: `wrangler dev` printed its
bindings table on 2 Sep 2026 listing only `env.ROOMS (Room)`. The runtime
consequence is NOT yet established — V2's `wrangler dev` on 8791 binds the
port and answers nothing from this shell, the known failure. Establish it
before deciding the fix.

*The missing flag.* V1 sets `compatibility_flags: ["nodejs_compat"]`; V2 does
not. Task 6's web push is the likely consumer.

**Acceptance criteria:**
- [x] **Worker name decided: V2 deploys as `table-companion-v2` until cutover.** The name is the guard — a stray `wrangler deploy` from here now lands on a different workers.dev subdomain and V1 keeps serving. Verified: `wrangler deploy --dry-run --outdir` writes *'the worker "table-companion-v2"'*, exit 0.
- [x] An accidental deploy cannot silently replace V1 — see above.
- [x] **DO question answered with evidence, and the answer is that reuse would break.** Both classes are named `Room`, both declare migration tag `v1`, and both create a table called `events` with *incompatible* schemas — V1 `(seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE, payload TEXT)`, V2 `(id TEXT PRIMARY KEY, seq INTEGER, body TEXT)`. `CREATE TABLE IF NOT EXISTS` finds V1's table and leaves it, after which every `SELECT body` and `INSERT ... body` fails — only in rooms that existed under V1. The distinct worker name gives V2 its own DO namespaces, so this cannot arise.
- [x] **`env.ASSETS` was live-broken, not merely unreachable** — now bound. Measured both ways on a booted worker: without the binding a SPA deep link answered **500**; with it, **200**. Room routes were unaffected either way (426 upgrade-required / 400 bad code).
- [x] `nodejs_compat` deliberately absent — nothing here imports a node builtin yet. Web push (Task 6) is the likely first caller; add it with the thing that needs it, not by cargo cult.

**Verification:**
- [x] ~~Arturo runs wrangler in his own terminal~~ — **not needed. The premise was wrong.** V1's `wrangler dev` boots from this shell in 3s (200), so the environment was never the problem. See the finding below.
- [x] `npx wrangler deploy --dry-run` names the expected worker — confirmed, exit 0
- [x] Typecheck passes: `npm run typecheck` exit 0; tier 4 clean (10 checks)
- [x] Manual check: on a booted worker, `/` 200, `/room/BCDFGH` 426 (WebSocket upgrade expected), `/room/AEIOU1` 400 (bad code), `/deep/link` 200 (SPA fallback). Both bindings listed.

**THE REAL CAUSE OF THE WRANGLER HANG — and it is not the shell.** Bisected:

| assets in `dist/` | `wrangler dev` |
|---|---|
| 51 (content moved aside) | boots in **3s**, answers 200 |
| 13,683 (normal build) | **never answered in 5+ minutes** |

V1's `dist` holds 28 files; V2's holds 13,683, because V2 compiles the compendium
to one file per record (7,179 prose + 6,633 statblocks). Wrangler enumerates and
hashes every asset at startup. The old note recording that the file count had been
"ruled out by test" is **wrong** and is corrected.

This blocks `npm run test:room` outright — its `webServer` timeout is 180s — and
therefore blocks Phase 2's checkpoint. Production deploy is *not* blocked: 13,683
is under Cloudflare's 20,000-asset limit and `deploy --dry-run` reads them fine.
Recorded as an open question in `plan.md`; the fix is a content-delivery decision
(serve the compendium from R2/KV, or exclude it from the dev build), which is
Arturo's call, not mine.

**Dependencies:** Task 1
**Files touched:** `wrangler.jsonc`
**Actual scope:** S to change, and the investigation was indeed most of it

**DONE.**

---

### Checkpoint: Storage and deployment
- [x] V2 opens cleanly on an origin holding V1's database — proved in a live browser
- [x] V1's data survives untouched (`upgraded: false`, marker intact)
- [x] V2 cannot replace V1 by accident — deploys as `table-companion-v2`, confirmed by dry-run
- [~] `npm run verify` — as above; the room tier is blocked on the asset count, not on anything in Phase 1

---

## Phase 2: Lift the Worker pieces V2 lacks

*Safe to parallelize with Phase 3 — no shared files.*

## Task 5: Port the passphrase gate

**Description:** V1's `gate.ts` (126 lines) keeps the table private: one shared
passphrase held as a secret, exchanged once per device for a year-long cookie.
It is not room membership — V2 already validates room codes in
`worker/index.ts` — and it is not what hides the DM's monsters, which is the
disclosure ladder working on the seat.

**Do not start until it is confirmed this is still wanted.** `gate.ts` exists
because a workers.dev subdomain cannot use Cloudflare Access. On a custom
domain the right move is to delete it, not port it.

**Acceptance criteria:**
- [ ] An unauthenticated request is challenged with the passphrase page
- [ ] A correct passphrase sets the cookie; subsequent requests pass
- [ ] The cookie holds a salted hash, never the passphrase, compared in constant time
- [ ] **With no passphrase configured, the gate fails open** — a half-deployed gate that locks the table out mid-session is worse than an open one
- [ ] Asset and room routes both sit behind it

**Verification:**
- [ ] Tests pass: `npm run test:room` against `npm run dev:worker` (wrangler boots in ~25s; probe with curl before concluding anything)
- [ ] Typecheck passes: `npm run typecheck` (includes `worker/tsconfig.json`)
- [ ] Manual check: unset the secret, confirm the app opens; set it, confirm the challenge

**Dependencies:** Task 1
**Files likely touched:** `worker/gate.ts` (new), `worker/index.ts`
**Estimated scope:** S-M

---

## Task 6: Port web push

**Description:** V1's `push.ts` (208 lines) is web push — the "a save is falling
due" nudge. Port the worker half and the subscription half together; a push
backend with no client subscription is dead code.

**Acceptance criteria:**
- [ ] A device can subscribe, and a pushed event arrives with the app closed
- [ ] The VAPID private key is a wrangler secret and `.dev.vars` is gitignored — never committed
- [ ] Push failure never blocks an event from reaching the log
- [ ] Only the two things V1 lets move a player on their own can push

**Verification:**
- [ ] Tests pass: `npm run test:room`
- [ ] Manual check: subscribe on a phone, trigger from another device, confirm arrival
- [ ] `git ls-files | grep -c dev.vars` is 0

**Dependencies:** Task 5 (shares `worker/index.ts`)
**Files likely touched:** `worker/push.ts` (new), `worker/index.ts`, `src/core/sync.ts`, one new `src/features/room/usePush.ts`
**Estimated scope:** M

---

### Checkpoint: The room
- [ ] `npm run test:room` passes
- [ ] Gate challenges when configured, fails open when not

---

## Phase 3: The fight, end to end

*Each task is a vertical slice: model + fold + screen + test, app working at
the end. V1 source for all five: `domain/combat.ts` (37 symbols, depth 3),
`attack.ts`, `attackflow.ts`, `checks.ts`, `stance.ts`, and `ui/Combat.tsx` —
read `Combat.tsx` directly, the graph under-represents it.*

## Task 7: Initiative and turn order

**Description:** Staged creatures have `initiative: number | null` and nothing
reads it. Roll it, order the combatants, advance the round.

**Acceptance criteria:**
- [x] The DM rolls initiative for staged creatures; `null` stays null until rolled — the box is blank, never 0, because a 0 asserts "rolled badly" when the fact is "has not rolled"
- [x] Combatants sort by initiative, ties resolved by V1's rule — higher first, **unrolled last rather than as a zero**, ties by staged order so every device computes the same order
- [x] Round advances and the current turn is visible
- [x] Order is derived from the log (`orderOf`), never stored. V1 stores `order` and has to re-anchor the pointer whenever the roster changes; V2 stores only `turn`, which is real information, and computes the rest.

**Verification:**
- [x] `npm run test:domain` — 542/542 (11 new in `fight.test.ts`), exit 0
- [x] `npm run test:component` — 91/91, exit 0
- [x] `npx playwright test` — 50/50 including a new DM journey that rolls, reorders, begins, walks the order, wraps into round 2, **and reloads** to prove the turn survives in the log
- [x] `npm run typecheck` exit 0; tier 4 clean (10 checks)
- [x] **Screenshot taken and read.** It earned its place four times over — see below.

**Ported from V1 `combat.ts`:** `sortOrder`, `beginCombat` (which drops anyone
who never rolled, with V1's reason: a fight starting with somebody at a made-up
position is worse than one starting without them), and `advance`'s `from` guard.
That guard is the interesting one — `advance` carries the turn the presser could
see, so a DM and a player both ending the same turn cannot skip anybody. In a
log-shaped app both events are individually valid and nothing else would catch it.

**Four bugs only the screenshot found**, every one of which passed typecheck,
tier 4, 542 domain tests, 91 component tests and 50 journeys:

1. **The whole roster was below the fold on a phone.** The bestiary pane filled
   the viewport; the round, the initiative boxes and the current-turn marker were
   a full screen down. The fight is the glance posture — a fight you scroll to
   see is not one. The roster now comes first while the fight runs.
2. **"ROUND 1 2"** — the roster count sat beside the round number and read as
   nonsense. It belongs to the roster, so it shows while there is a roster.
3. **The initiative box clipped two digits**: `3.5ch` plus the number spinners
   rendered 11 as "1". A DM reading 1 for 11 is a real misread at the table.
4. **`hidden={phase === "active"}` on the ladder did nothing** — `.ladder` sets
   `display: flex`, which overrides the attribute. Removing it was the right fix
   rather than making it work: DM.md has the ladder slid up *as the fight
   develops*, so hiding it mid-fight contradicted the control's whole purpose.

**Dependencies:** Task 2
**Files touched:** `fight.ts`, `fight.test.ts`, `Staging.tsx`, `Staging.module.css`, `tests/journey/dm.spec.ts`, `scripts/verify.mjs`
**Actual scope:** M

**DONE.** MINIMUMS ratcheted 493/91/47 → 542/91/50.

---

## Task 8: Damage and healing on staged creatures

**Description:** A creature's hit points live in the fight, a character's in the
log — V1's `Source` union. Apply damage and healing to the fight side, keeping
dying and dead as separate fields (`hp <= -max` is death outright).

**Acceptance criteria:**
- [ ] Damage and healing apply to a staged creature and survive reload
- [ ] Dying and dead remain distinct; 999 damage to a healthy creature is death, not dying
- [ ] The party screen and the fight never disagree on a number
- [ ] Disclosure still governs what a player sees of a creature's hit points

**Verification:**
- [ ] Tests pass: `npm run test:domain`, `npm run test:journey`
- [ ] Manual check: damage a goblin from the DM screen, confirm the player's view respects its disclosure rung

**Dependencies:** Task 7
**Files likely touched:** `src/features/dm/fight.ts`, `fight.test.ts`, `Staging.tsx`, `src/features/dm/members.ts`
**Estimated scope:** M

---

## Task 9: Conditions on combatants

**Description:** Port `stance.ts` (13 symbols, depth 4) alongside V2's existing
`rules/5e/conditions.ts` into a condition a DM can apply and both sides see.

**Acceptance criteria:**
- [ ] A condition can be applied to and cleared from any combatant
- [ ] Conditions show on the party screen, the staging screen and the sheet
- [ ] The 2014 condition set matches V1's `CONDITIONS_2014`

**Verification:**
- [ ] Tests pass: `npm run test:domain`, `npm run test:component`
- [ ] Manual check: screenshot the condition row on a 390px viewport; no tap target under 44px

**Dependencies:** Task 8
**Files likely touched:** `src/rules/5e/conditions.ts`, `src/features/dm/fight.ts`, `Staging.tsx`, `src/features/sheet/Overview.tsx`
**Estimated scope:** M

---

## Task 10: The attack — a player claims, the DM answers

**Description:** Port `attack.ts` + `attackflow.ts` + `checks.ts`. Law 2 makes
an attack a claim, so this cannot be built player-only — the claim needs the
DM screen to land on. This also finally earns the sheet's `TO HIT` column,
deliberately absent until a real derivation existed.

**Acceptance criteria:**
- [ ] A player declares an attack from the sheet; to-hit is derived, never fabricated
- [ ] The DM sees the claim and answers it; the verdict reaches the log
- [ ] Advantage from both sides resolves per V1's rule
- [ ] The `TO HIT` column appears only where a real derivation backs it

**Verification:**
- [ ] Tests pass: `npm run test:domain`, `npm run test:journey`
- [ ] Manual check: a fighter with a longsword and +3 STR reads the same to-hit in V1 and V2

**Dependencies:** Task 9
**Files likely touched:** `src/rules/5e/attack.ts` (new), `src/features/dm/fight.ts`, `src/features/sheet/Sheet.tsx`, `src/features/sheet/model.ts`
**Estimated scope:** M-L — split into derivation and claim/verdict if it passes 5 files

---

## Task 11: The player's half of the fight

**Description:** The fight seen from a player's seat: whose turn, what I can do,
what just happened. `tabsFor` already turns on the seat; this fills the screen
it offers.

**Acceptance criteria:**
- [ ] A player sees the fight without seeing what disclosure hides
- [ ] The turn bar is not drawn twice — a second copy is a door into a room you are standing in
- [ ] Only a fight starting moves a player off their page on its own

**Verification:**
- [ ] Tests pass: `npm run test:journey` — a two-device journey, DM and player
- [ ] Manual check: screenshot both seats at 390x844; footer pinned, nothing under 44px

**Dependencies:** Task 10
**Files likely touched:** `src/ui/tabs.ts`, `src/features/dm/fight.ts`, one new `src/features/room/Fight.tsx` + module CSS
**Estimated scope:** M

---

### Checkpoint: The fight
- [ ] A fight runs start to finish, DM and player, two devices
- [ ] Sheet, party and fight agree on every hit point
- [ ] `npm run verify` passes; MINIMUMS ratcheted

---

## Phases 4-6

Slices 8 (disclosure), 9 (prep), 10 (guidance) — full parity is in scope.
Named in `tasks/plan.md`, broken down when the preceding phase closes.

---

## Phase 7: Cut over and retire V1

*Not a strangler: one origin serves one app, so this is a switch. The rollback
is the mitigation, and it is written before the switch is thrown.*

## Task R1: Measure what V1 is still used for

**Description:** Deprecation without measuring usage is guessing. Before
freezing V1, establish what it is actually opened for.

**Acceptance criteria:**
- [ ] A list of V1 features still in use at a real table, and by whom
- [ ] Each one maps to a V2 equivalent, or is named as a deliberate drop
- [ ] Confirmed: no character data needs migrating (re-check, don't assume)

**Verification:** [ ] Manual check: confirmed with the DM, not inferred
**Dependencies:** Phases 4-6 complete
**Estimated scope:** XS

---

## Task R2: Freeze V1 and write the rollback plan

**Description:** V1 goes fixes-only, and the way back gets written down and
**tested** before the cutover. A rollback nobody has run is not a rollback.

**Acceptance criteria:**
- [ ] `ROADMAP.md` / README state V1 is deprecated and name V2
- [ ] The rollback is one documented command, and it has been executed once against a non-production target
- [ ] V1 stays deployable from a tagged commit for the whole cutover window

**Verification:**
- [ ] Manual check: run the rollback, confirm V1 serves, roll forward again
**Dependencies:** R1
**Estimated scope:** S

---

## Task R3: Cut the origin over to V2

**Description:** Point the origin at V2. Existing devices hold a V1 IndexedDB
that Task 3 already made harmless.

**Acceptance criteria:**
- [ ] The origin serves V2; a device that previously ran V1 loads without error
- [ ] V1's database is untouched, so R2's rollback still restores a working app
- [ ] The gate (Task 5) challenges as configured

**Verification:**
- [ ] Manual check: load on a device with V1 history in the browser profile
- [ ] `npm run verify` and `npm run test:room` pass against the deployed V2
**Dependencies:** R2, Tasks 3-4
**Estimated scope:** S

---

## Task R4: Archive V1

**Description:** Only after V2 has held. Archive rather than delete — V1 is the
port's reference for anything Phases 4-6 left thin.

**Acceptance criteria:**
- [ ] V2 has served two consecutive real sessions with no rollback
- [ ] V1's deployment is stopped, its repo archived and kept
- [ ] `PORT.md` accounts for every V1 module: ported, deliberately dropped, or under "Dies" with a reason
- [ ] Deprecation notices removed — they served their purpose

**Verification:**
- [ ] Manual check: two clean sessions confirmed with the DM
**Dependencies:** R3
**Estimated scope:** S

---

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] V1 archived, V2 serving, no module unaccounted for

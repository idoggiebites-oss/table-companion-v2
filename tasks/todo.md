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

**Confirmed wanted (3 Sep 2026).** `gate.ts` exists because a workers.dev
subdomain cannot use Cloudflare Access, and V1's `wrangler.jsonc` has no routes
and no custom domain — so Access really is unavailable and the gate earns its
port. Revisit only if V2 moves to a custom domain, where the right move is to
delete it rather than port it.

**It does NOT protect the compendium, and never did.** The compendium is now
public on GitHub Pages by design. What sits behind this gate is the app and the
room — that is, the campaign — not the published books.

**`run_worker_first: true` belongs to THIS task.** It is deliberately absent
from `wrangler.jsonc` today, with a note saying so: without it the asset layer
answers before the worker runs, so the gate never sees a request for the app
shell and anybody can load the app without the passphrase. Adding it is what
makes the last acceptance criterion true. It is cheap now — the worker serves
~50 files since the compendium left.

**Acceptance criteria:**
- [ ] An unauthenticated request is challenged with the passphrase page
- [ ] A correct passphrase sets the cookie; subsequent requests pass
- [ ] The cookie holds a salted hash, never the passphrase, compared in constant time
- [ ] **With no passphrase configured, the gate fails open** — a half-deployed gate that locks the table out mid-session is worse than an open one
- [ ] Asset and room routes both sit behind it

**Verification:**
- [x] `npm run verify` clean — typecheck, tier 4 (10 checks), **551** domain, 91 component, 50 journey, 5 room
- [x] Manual check against a real `wrangler dev`, run independently of the implementer: with no secret, `/` is 200. With `SITE_PASSPHRASE` set, `/`, `/icon-192.png` **and the JS bundle** all 401 — that last one is what `run_worker_first` buys; without it the asset layer answers first and anyone loads the app unchallenged. A wrong passphrase 401s. The right one returns a 64-hex token that does not contain the passphrase, after which `/`, assets and a SPA deep link are 200 and `/room/BCDFGH` falls through to Room's own 426.

**Added beyond the brief: `worker/gate.test.ts`, 9 tests in tier 1.** The brief's
verification would have passed with the gate completely broken. The room tier
boots with no passphrase, so it exercises the open path only — and nothing else
asserted a word about the one security control in the codebase. That is exactly
what `verify.mjs` refuses at the tier level ("silence is not success"), applied
one level down. `guard` is a pure function of a Request and a secret, so it
needs no server; `vitest.config.ts`'s domain project now includes
`worker/**/*.test.ts`. **Proven by sabotage**: making `sameToken` always return
true turns one test red, and reverting turns it green.

**Dependencies:** Task 1
**Files touched:** `worker/gate.ts` (new), `worker/gate.test.ts` (new), `worker/index.ts`, `wrangler.jsonc`, `vitest.config.ts`, `.gitignore`, `scripts/verify.mjs`
**Actual scope:** S-M

**One deliberate difference from V1, argued in the file:** V1 special-cases
`/api/` so a request expecting JSON gets a bare status rather than an HTML login
page. V2 has no `/api/` prefix — the room is `/room/:code` and only ever answers
a socket upgrade or plain text — so the same reasoning is applied to `/room/`.

**A trap worth knowing:** the room tier boots fail-open because there is no
`.dev.vars`. Leave a real `SITE_PASSPHRASE` in one and the room suite will 401
and look broken for no visible reason. `.dev.vars` is now gitignored (it was
missing entirely — V1 had it), which Task 6 also needs for its VAPID keys.

**DONE.**

---

## Task 6: Port web push

**Description:** V1's `push.ts` (208 lines) is web push — the "a save is falling
due" nudge. Port the worker half and the subscription half together; a push
backend with no client subscription is dead code.

**Two things this task must settle that are not in V1's file.**

`nodejs_compat` is deliberately absent from V2's `wrangler.jsonc`, with a note
saying to add it with whatever first needs a node builtin. V1 sets it, and VAPID
signing is the likely reason. Add it if and only if this actually needs it —
check, do not copy.

**The service worker is the delivery path, and this repo's SW has form.** A push
arrives at `sw.js`, not at the app. V1's registration is `autoUpdate`, and a
stale SW was already caught serving a whole previous app after a backend swap
(see the Phase 7 risk). A push handler that lands in a service worker nobody has
updated to yet is a feature that silently does not exist. Verify against a
device that installed the app BEFORE the change, not only a fresh one.

**Acceptance criteria:**
- [x] A device can subscribe; the room stores the endpoint and who it watches
- [x] The VAPID private key is a wrangler secret and `.dev.vars` is gitignored
- [x] Push failure never blocks an event from reaching the log — sending is `waitUntil`, never awaited by the socket, because a slow push service must not hold up the log
- [x] Only the moments V1 allows can push — see below
- [ ] **A pushed event arrives with the app closed.** NOT verified. Needs a real device and a real push service, and specifically one that already had the app installed.

**`nodejs_compat` answered: not needed.** `push.ts` imports nothing —
`crypto.subtle`, `TextEncoder`, `btoa`/`atob` are workerd natives. Checked by
porting and typechecking the worker, not by copying V1's config.

**The moments, corrected.** This brief said "the two things V1 lets move a
player on their own", which conflated two different V1 concepts. `nudge.ts`
names THREE: your turn has come round, initiative is being rolled and yours is
not in, and the DM has asked YOU for a roll. The first two are built; the third
needs the claim seam running the other way. V1's reason for the shortness of
that list is carried: *a notification that arrives when nothing is being asked
of you teaches people to swipe them away without reading, and then the one that
mattered goes with it.*

**Computed on the device that APPENDS the event**, not in the room — the room
holds a log and has never had to understand it, and the appending device is
awake by definition: it is the DM pressing Next turn. A nudge is also NOT an
event, so a device replaying the log cannot re-buzz a phone a week later.

**Verification:**
- [x] `npm run verify` clean — 715 domain, 91 component, 57 journey, 5 room
- [x] The crypto proved by doing the other half: encrypt, then decrypt from the subscriber's side per RFC 8291. Proven by sabotage — swapping the two public keys in the derivation turns it red.
- [x] `/push/key` verified on the live deployment, behind the gate
- [ ] **The phone check — Arturo's, and the last thing owed.**

**Dependencies:** Task 5
**Files touched:** `worker/push.ts` + test, `worker/Room.ts`, `worker/index.ts`, `core/sync.ts`, `ui/useLog.ts`, `ui/App.tsx`, `features/room/push.ts`, `PushToggle.tsx` + css, `features/dm/nudge.ts` + test, `features/creation/Hub.tsx` + css, `public/push-sw.js`, `vite.config.ts`
**Actual scope:** L, over two commits

**DONE apart from the device check.**

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

**Corrected 3 Sep 2026, after reading V1.** This brief said "dying and dead
remain distinct; 999 damage is death, not dying". That is the CHARACTER rule,
already built in `rules/5e/vitals.ts` and `features/dm/members.ts`. V1 gives
creatures no dying state at all — `project.ts` clamps a creature to
`[0, max]` and treats a negative amount as healing, with a ceiling, because
"a ghoul patched up twice reads 30/22, which is not a state the game has".
Reuse the existing character rule; do not give creatures a second one.

**Acceptance criteria:**
- [x] Damage and healing apply to a staged creature and survive reload
- [x] Clamped to `[0, max]` both ends
- [x] Healing is a negative amount — one act, V1's shape
- [x] The party and the fight cannot disagree: `hurt` ignores a character outright, because their hit points are in the log
- [x] Disclosure governs what a player sees — `healthShown` gives numbers only at `exact`, a WORD at `vague`, nothing below. **The rule is built and tested; no player-facing screen consumes it until Task 11.**

**Verification:**
- [x] `npm run verify` clean — 560 domain, 91 component, 51 journey, 5 room
- [x] Journey: damage, heal, both clamps, and a **reload** proving it is in the log
- [x] Screenshot read

**Reused rather than rebuilt:** `healthStep` and `VAGUE` already existed in
`rules/5e/vitals.ts` and are what the party screen uses, so the two sides of the
table cannot end up describing the same creature with different words.

**Two things the screenshot caught, again:** the row grew a second number box,
and initiative and damage were visually identical with no labels — a DM could
not tell which was which. Both are labelled now (`INIT`, and `±` with the Hit
button as the affordance), and the damage placeholder was `0`, which read as a
value rather than a prompt.

**A split, forced by the size check:** `Staging.module.css` went past its
150-line budget, so the row became `Combatant.tsx` + `Combatant.module.css`.
Done now rather than by compacting, because Task 9 adds conditions to the same
row and would have blown it again immediately. `check-styles` is what makes this
safe — splitting a stylesheet and leaving a reference behind has bitten this
repo before.

**Dependencies:** Task 7
**Files touched:** `fight.ts`, `fight.test.ts`, `Staging.tsx`, `Staging.module.css`, `Combatant.tsx` (new), `Combatant.module.css` (new), `tests/journey/dm.spec.ts`, `scripts/verify.mjs`
**Actual scope:** M

**DONE.**

---

## Task 9: Conditions on combatants

**Description:** Port `stance.ts` (13 symbols, depth 4) alongside V2's existing
`rules/5e/conditions.ts` into a condition a DM can apply and both sides see.

**Corrected 3 Sep 2026.** This brief said to "port `stance.ts`". That is V1's
ADVANTAGE engine — advantage computed from conditions on both sides, shown as a
sentence naming every reason. None of the criteria below mention it, and it
belongs with the attack or with guidance, not here. Conditions themselves
already existed in V2 for CHARACTERS (`rules/5e/conditions.ts`, applied on the
Sheet, shown on the Party screen); what was missing was creatures.

**Acceptance criteria:**
- [x] A condition goes on a creature and comes off, from the fight screen
- [x] Applying twice does not double it and clearing what was never there is not an error — two devices may say the same thing
- [x] Conditions show on the staging screen; the party screen and the sheet already had them for characters
- [x] The set matches V1's `CONDITIONS_2014` — **it did not, and now does**

**The bug the last criterion actually found.** V2 spelled the id `paralysed`;
V1 and the books spell it `paralyzed`, and so does this corpus — **401 times in
the statblocks**. Nothing joins on it yet, which is precisely why it was free to
be wrong; the first thing to match a statblock's condition immunities against
these ids would have silently missed every one. The ID is now the corpus
spelling because it is a matching key. The NAME is prose and stays ours.

**Verification:**
- [x] `npm run verify` clean — 566 domain, 91 component, 52 journey, 5 room
- [x] Journey: on, the effect carried with it, a **reload**, then off
- [x] Screenshot read — the row still reads as a row with a condition on it

**Kept to V1's rule about what a condition SAYS:** the chip carries the effect,
because "poisoned" teaches nothing and "disadvantage on attacks and ability
checks" teaches the rule while it is being used.

**Dependencies:** Task 8
**Files touched:** `rules/5e/conditions.ts`, `fight.ts`, `fight.test.ts`, `Combatant.tsx`, `Combatant.module.css`, `tests/journey/dm.spec.ts`, `scripts/verify.mjs`
**Actual scope:** M

**DONE.**

---

## Task 10: The attack — a player claims, the DM answers

**Description:** Port `attack.ts` + `attackflow.ts` + `checks.ts`. Law 2 makes
an attack a claim, so this cannot be built player-only — the claim needs the
DM screen to land on. This also finally earns the sheet's `TO HIT` column,
deliberately absent until a real derivation existed.

**Acceptance criteria:**
- [x] A player declares an attack from the sheet; to-hit is derived, never fabricated
- [x] The DM sees the claim and answers it; the verdict reaches the log
- [x] The `TO HIT` column appears only where a real derivation backs it
- [ ] **Advantage from both sides — NOT done.** That is V1's `stance.ts`, a
      feature of its own: advantage computed from the conditions on both
      combatants and shown as a sentence naming every reason. It is the thing
      that makes conditions mechanically matter, and it needs the player's
      side of the fight to have somewhere to say it. Left for its own task
      rather than smuggled in here half-built.

**Verification:**
- [x] `npm run verify` clean — 595 domain, 91 component, 54 journey, 5 room
- [x] Journey across both seats: stage, begin, swing as the player, and the
      goblin is still whole until the DM presses Lands
- [x] Screenshot read

**The seam, and V1's reason for it.** A player rolls their own dice and types
what they got; the DM decides whether it lands. That is how a table already
works — "eighteen to hit, seven damage" / "yeah, that hits" — and it is the
only division that keeps the disclosure ladder intact: **a player who could
apply their own damage would learn a creature's armour class by trial, and one
told "that misses" by the app would learn it in one go.**

Both numbers travel together because tables roll them together; asking for
damage only after the DM confirms would put a round trip in the middle of
somebody's turn. The verdict line SUGGESTS — "18 against 13 — hits" — and the
overrule is always one tap away and labelled ("Misses anyway"), because a
shield spell or a cover rule this app has never heard of is still true.

**Split under the size check:** `fight.ts` passed its 300-line budget, so
claims and verdicts are `claim.ts`. The two modules reference each other by
TYPE only, so there is no runtime cycle — `check-cycles` confirms it.

**Dependencies:** Task 9
**Files touched:** `rules/5e/attack.ts` + test, `dm/fight.ts`, `dm/claim.ts` (new), `dm/fight.test.ts`, `dm/Staging.tsx` + css, `sheet/model.ts` + test, `sheet/Attacks.tsx` + css, `sheet/Swing.tsx` + css (new), `sheet/Sheet.tsx`, `ui/App.tsx`, journeys
**Actual scope:** L, over three commits

**DONE apart from advantage, which is named above and is its own task.**

---

## Task 11: The player's half of the fight

**Description:** The fight seen from a player's seat: whose turn, what I can do,
what just happened. `tabsFor` already turns on the seat; this fills the screen
it offers.

**Acceptance criteria:**
- [x] A player sees the fight without seeing what disclosure hides — hidden is absent, vague is a WORD, exact is figures, and the active combatant is not named either
- [x] The turn bar is not drawn twice — swinging MOVED to this screen rather than being copied here; the sheet keeps the list, the fight is where you act
- [x] Only a fight starting puts the tab there at all; nothing navigates on its own

**Verification:**
- [x] `npm run verify` clean — 597 domain, 91 component, 55 journey, 5 room
- [x] Journeys across both seats: the waiting state, the ladder, and a full
      claim → verdict → damage round trip
- [x] Screenshot read — and it earned its keep, see below

**V1's design, kept: this is TWO screens, not one.** "Almost all of a fight is
spent NOT acting, and the two states want opposite things. Waiting is one
enormous number read across the table with nothing to tap, because tapping is
not what that moment is for. Acting is twenty seconds where it becomes a tool."

**A disclosure leak the screenshot found.** The order already filtered hidden
creatures out — but the ACTIVE combatant was named in the largest text on the
screen, so a hidden goblin announced itself the moment its turn came round.
Every test passed. Now a hidden combatant reads "Someone else", and two domain
tests plus a journey hold it.

**A gap this task exposed:** the party could not be put into a fight at all.
The model has supported character combatants since Task 8, but `Staging` only
offered the bestiary — so a player could never be in the order and it could
never be their turn. The DM can now put the table's own characters in. Their
hit points are NOT copied in; they stay on the sheet, which is V1's `Source`
union and the reason the party screen and the fight cannot disagree.

**A belief corrected:** the test "a player is not offered the fight, because it
is not their job" encoded something false. STAGING is not their job; the fight
is, and V1's `playerTabs` carry Combat. Renamed, and the rule is now the
has-content one.

**Dependencies:** Task 10
**Files touched:** `room/Fight.tsx` + css (new), `ui/tabs.ts`, `ui/App.tsx`, `dm/Staging.tsx` + css, `dm/fight.test.ts`, `sheet/Attacks.tsx`, `sheet/Sheet.tsx`, journeys
**Actual scope:** M-L

**DONE.**

---

### Checkpoint: The fight
- [ ] A fight runs start to finish, DM and player, two devices
- [ ] Sheet, party and fight agree on every hit point
- [ ] `npm run verify` passes; MINIMUMS ratcheted

---

## Phase 4: Disclosure (slice 8)

## Task 14: The log reads differently per person

**Description:** `App.tsx` hands the raw event list to `LogView`, and the Log
tab is on every seat's bar. So a player taps Log and reads the DM's prep —
every `stage` naming a hidden creature, every `disclose`, every point of damage
a creature quietly took. **This undoes the disclosure ladder from behind**, and
it is now live on a URL rather than theoretical.

V1's `visibility.ts` is the port, and its rule is the thing to carry: *"The rule
is about the AUDIENCE, not the actor: a thing the table would see happen is
public, and a thing the DM did alone is not. Damage a player dealt is public
because they rolled it out loud; a creature quietly losing hit points is not."*

`LogView`'s own comment already admits what it is — "Slice 1's debug view, and
nothing else."

**Acceptance criteria:**
- [x] A player's log omits staging, unstaging, the ladder, damage to a creature, conditions put on one
- [x] A player's log keeps initiative rolled, the fight beginning, turns passing, a claim made and answered
- [x] The DM's log is unchanged
- [x] Undo follows the same rule — the DM may take anything back; a player only what their own device did, so there is no button on somebody else's
- [x] Filtering is by event KIND, not by reading each creature's rung at render time

**Verification:**
- [x] `npm run verify` clean — 611 domain, 91 component, 56 journey, 5 room
- [x] 14 domain tests; journey compares the two seats against the same log
- [x] Screenshot read

**Why by kind and not by the ladder.** A filter that asked "is this creature
hidden *now*" would answer differently once the DM slid the rung up — so an
event a player was never meant to see would appear retroactively, and a fresh
device replaying the log would disagree with the one that was there. **The
audience of an event is fixed when it happens.**

**A whitelist, not a blacklist.** Only the acts the table watches happen are
public; anything unrecognised is private, because a new fight act is far
likelier to be prep than narration and the failure that matters is the one that
shows too much. `BEHIND_THE_SCREEN` documents the known-private ones rather than
deciding, and a test holds the two in agreement so the list cannot rot into a
comment.

**Caught while writing it:** the first version read
`BEHIND_THE_SCREEN.has(act) || true`, which is always true — the set was dead
logic dressed as a rule. Rewritten to say what it means.

**Filtering happens before the screen**, in `visibility.ts`, so a component can
never accidentally render an event it should not have been handed.

**Dependencies:** Task 11
**Files touched:** `features/room/visibility.ts` + test (new), `ui/LogView.tsx`, `ui/App.tsx`, `tests/journey/dm.spec.ts`, `scripts/verify.mjs`
**Actual scope:** M

**DONE.**

---

## Task 16: Advantage, and why

*Belongs to Phase 3 — it is the last thing Task 10 left owed, and the piece
that turns conditions from labels into rules.*

**Description:** V1's `stance.ts`. Advantage is the most-used mechanic in the
game and the one an app is usually quietest about: the conditions are on one
person's screen, the rule is in a book, and the person who needs both is the
one who has played twice.

**Acceptance criteria:**
- [x] Computed from what the app already knows, and said as a sentence naming every source — "Advantage: the goblin is prone" teaches the rule while you use it; "Advantage" alone teaches nothing
- [x] **Any number of advantages and any number of disadvantages cancel to a straight roll.** Not a tally, not a net. When they cancel the line says so and names both sides, so a missing advantage is not a mystery.
- [x] Prone cuts both ways: advantage in melee, disadvantage at range
- [x] Shown on the swing form, at the moment the dice are about to be picked up

**Task 9's id fix is what makes it work.** `TARGET_GIVES_ADVANTAGE` contains
`paralyzed` with a z; V2 spelled it `paralysed` until that was corrected, and a
near-miss drops the condition from the rule silently. A test asserts exactly
that.

**Named as absent rather than silently missing:** light and darkvision (no
senses on a combatant), the room's effects (slice 9), and the per-turn tags —
helped, dodging, hidden — which belong to the turn economy. V1 also refuses
reach, cover and line of sight: those need positions, and this table keeps its
positions on the table.

**Verification:** 15 domain tests; `npm run verify` clean.
**Files touched:** `rules/5e/stance.ts` + test (new), `sheet/Swing.tsx` + css, `room/Fight.tsx`, `ui/App.tsx`, journeys
**Actual scope:** M

**DONE** — commit `10af48d`.

---

## Task 17: Tests for four untested modules

*Cross-cutting. Belongs to no slice — it is maintenance, and it is recorded
because it found a bug, not because it added coverage.*

**Description:** `content/books.ts`, `content/marks.ts`, `rules/5e/items.ts`
and `rules/5e/progression.ts` had no sibling test file. Delegated to Sonnet
with one instruction that made it worth doing: **V1 is the specification, not
V2** — do not encode present behaviour, and report disagreements rather than
fixing them.

**Acceptance criteria:**
- [x] 66 tests across the four modules
- [x] Written against V1 as the spec; disagreements reported, not silently fixed
- [x] `npm run verify` clean

**The bug it found.** V1's `Item` carries `range?: { normal, long? }` and its
card prints "range 150/600 ft". V2's type had no such field, `itemFacts` had no
branch, and the compiled **index** dropped it while `detail` kept it — which is
why the data looked present. **2,038 index rows were missing it.** Every ranged
weapon said "Martial ranged weapon" and never how far it reached. Restored
through the compiler, the type and the fact line, with three tests. New
compendium version `722d5a038844`.

**Two findings left for a decision, not a fix:**
- `owes()` in `progression.ts` is dead — `features/progression/model.ts` reimplements the same check inline.
- `BOOKS` is in publication order within each block, but adventures are appended after hardcovers, so a 2015 adventure sorts after a 2023 one. Possibly a deliberate two-tier ordering; it contradicts the "publication, not the alphabet" framing used elsewhere.

**DONE** — commit `ebe815b`.

---

## Phase 5: Prep (slice 9)

*Read V1 before writing any of these. The headers carry the reasoning and it is
not derivable from the data — `scenes.ts` in particular reframes the whole
phase.*

**The framing, from V1's `scenes.ts`:** "The app could save encounters, NPCs and
statblocks — three kinds of thing, which is a bestiary rather than a plan. What
a DM actually prepares is a PLACE: the cellar, with its dark and its rubble, the
thing waiting in it, and the line they mean to read out when the door opens."

So the join is the feature, not the glue. Build the thinnest whole thing first
and thicken it, rather than three parts and an assembly step.

## Task 18: An encounter, saved and put live

**Description:** Staging already assembles a fight; nothing keeps one. Save a
staged roster under a name and put it back on the table later. V1's
`encounter.ts` is the port.

**Built to Arturo's mockup** (3 Sep 2026). The palette needed no translation —
it was drawn against these same tokens. Layout, card rhythm and the gold
primary action are copied; three things in it are deliberately absent and each
absence is a decision, recorded in `Prep.tsx`:

  - **The outline lists only what exists.** The mockup shows Quests, Loot,
    Random Tables, References and Locations. `tabs.ts` holds the rule this
    follows — *what is not built is not drawn* — because a row reading
    "Quests 2" that goes nowhere is a promise the app cannot keep.
  - **Scenes are a drawer, not a running order.** The mockup numbers them 1-5
    with drag handles; V1 refuses that ("not a map and not a sequence… a table
    goes where it goes"). Reversible if a real session wants the order.
  - **No readiness percentage or checklist.** A good idea and a NEW one —
    nothing in V1 frames prep as a completion metric. It deserves its own
    decision rather than arriving inside a port.

**Acceptance criteria:**
- [x] A staged roster is kept and survives reload
- [x] Putting one back stages exactly those creatures, fresh, at the rung they were prepared at
- [x] Totals are shown — creatures and experience — with no difficulty band
- [x] **The band is DMG content**, so it is absent. The SRD's experience-by-challenge table is in the rules themselves and is what the totals use.
- [x] Experience is RAW. V1's warning carried: a multiplier estimates danger and is never earned, and getting that backwards roughly doubles a party's progression over a campaign.

**Verification:**
- [x] 12 domain tests; journey keeps, clears the table, puts it back, and reloads
- [x] `npm run verify` clean — 727 domain, 91 component, 58 journey, 5 room
- [x] Screenshot read, and it caught a real bug

**The bug the screenshot found.** The card read "200 XP" only after a fix: a
staged combatant carried no challenge rating, so every kept encounter was worth
10 XP a head — the arithmetic this feature exists to do, wrong quietly. `Source`
now carries `cr`, optional so a fight staged before this still replays. The
auto-name was also "2 creatures", duplicating the line beneath it; it is now
derived from what is actually in it.

**Dependencies:** Task 11
**Files touched:** `dm/encounter.ts` + test (new), `dm/Prep.tsx` + css (new), `dm/fight.ts`, `dm/Staging.tsx`, `ui/tabs.ts` + test, `ui/App.tsx`, journeys
**Actual scope:** M

**DONE.**

---

## Task 19: A scene — the place, not the parts

**Description:** V1's `scenes.ts`. A room, an encounter and a note, under a
name, ready to go live in one press. "Deliberately not a map and not a
sequence. Scenes are a drawer you reach into, not a track a session runs
along — a table goes where it goes."

**Acceptance criteria:**
- [x] A scene holds a name, a note, an optional encounter, and what the room is like
- [x] Putting it live stages the encounter AND sets the room in one press
- [x] Preparing one is behind the screen; setting it live is public
- [x] Scenes are a drawer: no order, no next, no session track

**What it turned up.** `visibility.ts` did NOT already draw that line: it
returns public for every non-fight event, so Task 18's kept encounters were
already being printed to the table. Fixed at the root with `PREP_KINDS` rather
than per feature, so Task 20's NPCs need only join the set.

The room came with it — a scene without one is not V1's scene, and `stance.ts`
named the room's effects as a slice-9 gap. `checkEffects` and `movementCost`
did not: no skill-check screen, no speed on a combatant. Both named absent in
`terrain.ts` rather than written in advance of a caller.

The mockup's numbered running order was refused on V1's reasoning — *"a table
goes where it goes"* — and a test holds the drawer to it.

**Dependencies:** Task 18
**Estimated scope:** M

---

## Task 20: NPCs, notes first

**Description:** V1's `npc.ts`. "An NPC is not a statblock. Most of the ones a
campaign accumulates never roll anything — a shopkeeper, a harbourmaster, the
contact who knows a guy — and forcing them through a creature form would mean
inventing an armour class for a man who sells rope."

**Acceptance criteria:**
- [x] A record is notes-first; stats are optional and absent by default
- [x] Inventory hangs off a `trader` flag rather than existing on every NPC — a stock list on a record that will never sell anything is a field skipped every time the form opens
- [x] NPCs are behind the screen in the log

**What it turned up.** Task 19's `PREP_KINDS` made criterion 3 a one-line
change, which is what a root fix is supposed to buy.

Out of scope and stated rather than silently dropped: V1's `Shop.tsx` buying
and selling, because moving coin needs a party purse V2 does not model, and
the SRD-catalogue stock picker. Stock is typed by hand — a shelf the DM can
describe. `sellOne` came across as a pure function with no caller yet.
`money.ts` brought only `formatPrice` and `parseCoins`; the purse half of V1's
file stayed behind. No stats editor: V1 never built one either, and `stats` is
written by nothing in either version.

**A defect both screens shared.** An `aria-label` on a field that already sits
inside a `<label>` REPLACES the visible name rather than adding to it, so the
screen read "What they are" while a screen reader announced "NPC role". Mine
from Task 19 as much as this one. `mountPhone` grew a `mislabelled()` check
beside `smallTargets()`, holding WCAG 2.5.3's actual rule — the announced name
must contain the visible one, so a terse tag expanded by a fuller sentence
still passes.

**Still open, not fixed here:** `SeatControl.tsx` shows "I am" and announces
"Which seat this device is in", which the rule would flag. Untouched on scope
grounds — it is not this task's file.

**Dependencies:** Task 19
**Estimated scope:** M

---

## Task 21: Homebrew items the app reads as items

**Description:** V1's `homebrew-item.ts`, and its whole point: it produces the
SAME shape the catalogue produces, not a parallel "custom item" type with its
own half of the rules.

**The test is that nothing downstream knows it exists.** Equip it and the
armour class moves; swing it and the damage is right; give it "versatile" and
both grips appear. None of those code paths are told about homebrew.

**Acceptance criteria:**
- [x] A made-up item is an `Item`, indistinguishable downstream
- [x] Equipping one moves AC through the existing `armour.ts` path, untouched
- [x] An attack from one derives to-hit through the existing `attack.ts` path
- [x] No branch anywhere reads "is this homebrew"

**How the last one is held.** It is a property of the source, not of any run —
a parallel path would pass every behavioural test while being the exact thing
the feature prevents. So `scripts/checks/homebrew.mjs` (tier 4) enforces
confinement: only the module, its form and its tests may import from
`homebrew.ts`, and `homebrewFrom` is called EXACTLY ONCE, where the fold is
appended to a catalogue. A second caller is by definition asking which items
are made up.

**The check was wrong first.** Written as "no file may read the `(HB)` marker",
it flagged 51 lines of correct code: `content/marks.ts` reads `(HB)` as
compendium PROVENANCE, and V1 marks a made-up item precisely so it flows
through that same machinery — "the same filters hide it and the same badge
shows it". Forbidding it would have forbidden the design.

**Found by looking.** The drawer opens from inside the scrolling body, which
comes before the tab bar in the DOM, and nothing in this app declares a
`z-index` — so the nav band painted over the panel, its icons showing through
the drawer's own text, and intercepted every tap on the save button. It is
`Drawer.tsx`, so `Sheet`'s drawer had it too.

**And a gap the criteria did not name:** writing an item down put it in the
catalogue and nowhere else, so it could never be carried or equipped — half of
what it exists for. Making one on your own pack screen now grants you one,
through the `carry` step that was defined and unused.

**Dependencies:** Task 20
**Estimated scope:** M-L

---

## Phase 6: Guidance (slice 10)

## Task 22: Plain words for what numbers cannot say

**Description:** V1's `guidance.ts`. "d10 hit die · saves in STR and DEX tells a
returning player what they need and a new one nothing at all. What they are
asking is *what is this class LIKE to play* and *what does Strength even do*,
and neither is derivable from data."

**Acceptance criteria:**
- [ ] A sentence per class and per ability, shown where the choice is made
- [ ] **Only for the classes this app ships.** A compendium brings fifty-five more, and inventing a sentence about a homebrew class is worse than saying nothing — absent is honest, wrong is not.

**Dependencies:** none (independent of Phase 5)
**Estimated scope:** S-M

---

## Task 23: The recap — the log read forwards

**Description:** V1's `recap.ts`. "The log has held every session in full since
the first commit and has never been readable. Scrolling three hundred rows of
'Kira took 7' backwards is not remembering — it is archaeology." A recap is the
shape of a session rather than its transactions.

**Acceptance criteria:**
- [ ] Reads forwards into a shape: fights, who went down, what was gained, where the night ended
- [ ] Per reader, like the log itself — `visibility.ts` already decides what a player may see
- [ ] Says nothing rather than inventing a narrative it cannot stand behind

**Dependencies:** Task 14
**Estimated scope:** L

---

## Task 24: Prompts — what to do about it

**Description:** V1's `prompts.ts`. The recap says what happened and stops; the
table then asks what it changed. Each prompt is a fact and a screen that
answers it.

**Acceptance criteria:**
- [ ] Each prompt names a fact and opens the screen that answers it
- [ ] Filtered by what currently exists — V1's `PROMPT_TABS` rule; a prompt pointing at an unbuilt screen is worse than none
- [ ] Nothing moves a player on its own

**Dependencies:** Task 23
**Estimated scope:** M-L

---

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

---

## Task 12: Publish the compendium separately, with a version in the path

*Sits before Tasks 5 and 6 — Phase 2 is verified by `npm run test:room`, which
could not start a local worker until this landed.*

**Description:** The compendium was shipped as part of the app: 13,683 files
against the app's own 51. `wrangler dev` enumerates every asset before it
answers, so it never started, and the room tier had never run. It also walked
towards Cloudflare's hard 20,000-asset deploy limit as the corpus grows. Now
the compendium is compiled to `content-dist/<version>/`, served on its own
port locally, and published to a Pages site in production.

**Why the version is in the path.** Two separately-deployed halves drift: push
an app that reads a new field and forget to push the compendium that has it,
and every row reads blank while nothing fails loudly. Worse, the halves are
cached independently and for different lengths — the host sets its own, and
this app's service worker keeps prose cache-first — so even two correct pushes
seconds apart leave a window. A version in the path removes the window instead
of narrowing it: a build can only see the compendium it was compiled against.
The version is a hash of the corpus AND the compiler, since either changes the
shape of the output.

**Acceptance criteria:**
- [x] `dist/` holds 51 files, down from 13,683 — `wrangler dev` boots in ~4s
- [x] Every content fetch goes through one `contentUrl()`; no path is built by hand
- [x] The version is baked into the build and cannot be set wrong by hand
- [x] Local dev and every test tier reach the compendium the same way production does
- [x] A published version is immutable — `publish-content.mjs` refuses to overwrite one

**Verification:**
- [x] `npm run verify` — **clean, all four tiers**: typecheck, tier 4 (10 checks), 542 domain, 91 component, 50 journey, and **the room, 5 passed** — the first time that suite has run
- [x] `wrangler dev` boots and answers: `/` 200, `/room/BCDFGH` 426, `/room/AEIOU1` 400, a deep link 200
- [x] Publish script staged 13,631 files, then correctly refused to restage

**Measured, since the old note said the file count had been ruled out:**

| files in `dist/` | `wrangler dev` |
|---|---|
| 51 | 4s |
| 6,771 (58MB) | 4s |
| 7,044 (39MB) | 4s |
| 10,283 | never |
| 13,683 | never (5+ min) |

Not size — 58MB in 6,771 files is fine. Purely count, with the cliff between
~7,000 and ~10,300. `.assetsignore` was tried first and is not honoured: the
read count went *up* by one, the file itself.

**A bug this uncovered, and a file I deleted.** `index/style.json` fed the
dedicated "How do you fight?" step. **The committed compiler has never written
it** — it existed only in the generated tree, which I removed. But it was a
second copy of data `choicepoints` already emits: `choice.json` carries
`{ of: "Fighting Style", level: 1, options: [41] }` for the fighter, and
`compendium.ts` already knew the literal. Fighting styles are now DERIVED from
the class's own questions, which is the "one rule" the port was meant to
establish, and `STYLE` is named once in `choicepoints.ts` for the two places
that must agree. So the file is not needed rather than merely restored — but
it was a generated file the repo could not rebuild, and I should have checked
that before deleting it.

Without the fix the fighter was still asked, on the general "what does your
class ask?" screen instead of its own — degraded quietly, which is exactly how
it got past 49 of 50 journeys.

**Left for Arturo:** the Pages site itself. `publish-content.mjs` stages into a
checkout and prints the git commands rather than pushing to an account on its
own initiative. Production needs `VITE_CONTENT_BASE` set to the Pages URL.

**Dependencies:** Task 1
**Files touched:** `src/content/base.ts` (new), `load.ts`, `useContent.ts`, `useProse.ts`, `useFeatures.ts`, `useCatalogue.ts`, `creatures.ts`, `compendium.ts`, `choicepoints.ts`, `compile-content.ts`, `vite.config.ts`, both playwright configs, `package.json`, `.gitignore`, plus `serve-content.mjs` and `publish-content.mjs` (new)
**Actual scope:** L

**DONE.**

---

## Task 15: Who may change what

**Description:** V1's `permissions.ts` ported. Its header is the point and is
carried: **this is NOT a security boundary.** Everyone holding a room code is a
person at the table and the log is trusted among them — someone who wanted to
forge an event could. What it prevents is accidents: the wrong sheet edited,
two people applying the same hit, a player quietly topping up their own hit
points without anyone seeing.

**Acceptance criteria:**
- [x] A player may change their own sheet and nobody else's
- [x] The DM may change anyone's **by default and on purpose** — waiting for a player to find the right field mid-combat is slower than the DM typing it while narrating, and speed is the point. Acceptable only because every change is attributed to a device in the log and undoable.
- [x] A table can turn that off (`TableRules.dmMayEditCharacters`)
- [x] Creatures are the DM's, always — a player rolls damage and says what they got; the DM applies it. Same division as the claim seam.

**The screen the rule governs.** The rules were worth nothing until something
could break them: the Party screen was read-only, so the DM had to change SEAT
to touch anybody. It now takes a hit or a heal per member without leaving the
screen, which is the behaviour the default exists for.

**Verification:**
- [x] 7 domain tests covering both seats and the rule being turned off
- [x] Journey: the DM hits and heals from the Party screen, and the number lands on the character's own sheet — because there is only one of it
- [x] `npm run verify` clean — 618 domain, 91 component, 57 journey, 5 room

**A structural note:** the party row is one large button, so the hit control
sits BESIDE it rather than inside — nesting a control in a button is neither
valid nor tappable.

**Dependencies:** Task 14
**Files touched:** `features/room/permissions.ts` + test (new), `dm/Party.tsx` + css, `ui/App.tsx`, journeys, `scripts/verify.mjs`
**Actual scope:** M

**DONE.**

# Testing

V1's suite was 75 hand-rolled Playwright scripts driven by `sweep.sh`. It was
slow, it was flaky, and — the part that matters — **it could report success
having run nothing**. A filter looking for lines that were not `N pass, 0 fail`
treated `0 pass, 0 fail` as a pass, so a sweep in which 54 of 60 suites never
started read as clean.

Four separate causes, and each gets a structural answer rather than a habit.

| V1 cause | V2 answer |
|---|---|
| A hand-rolled runner has no guarantee anything ran | Playwright's runner exits 1 on "no tests found"; CI asserts a minimum count per tier |
| ~90% of the scripts asserted **domain rules** through a browser | Tier 1. Milliseconds, not minutes. |
| CSS classes were the only handles → 26 ambiguous selectors | Role and name first, `data-testid` second, **CSS class never** — enforced by tier 4 |
| Tests ran against `vite dev`, which dies under load | Journeys run against a built preview + worker, started with a health check |

---

## The four tiers

### Tier 1 — Domain · Vitest, node, pure

Every rule in `rules/5e/` and every reducer in `core/`. No DOM, no React, no
server. This is where the overwhelming majority of assertions live, and it is
where most of V1's browser scripts actually belonged.

**Budget: the whole tier under 5 seconds.** If it is slower, something impure
got in.

Property tests, not just examples, for the four invariants that must never bend:

- `state === fold(events)` for any sequence
- undo appends and never deletes; undoing an undone event is a no-op
- a thinner import cannot delete a field a richer one set
- **`buildAt(5) === buildAt(1).then(levelTo(5))`**

### Tier 2 — Component · Vitest browser mode, real Chromium

One screen, one constructed store, no server and no navigation. Renders, asks
what is on screen, taps something, asks again.

Three of V1's recurring defects become assertions that run here on every
component, rather than scripts someone has to remember to write:

- **every tappable is ≥44px** — broken four times in V1, found by measuring each time
- **screen order follows law 7** — waiting-on-me, then actions, then live values, then reference
- **the screen is inside its height budget** — in screens, not pixels; see DESIGN.md

Two things the height assertion must get right, both learned the hard way:

1. **Measure in a 390px iframe, not a 390px window.** Headless Chrome with
   `--window-size=390` lays out at 500 and crops, so a screen that overflows
   measures as fitting. The iframe is the only honest phone width.
2. **Measure the worst case, not the demo.** V1's 2,588px was a sample
   campaign with one character. The fixture for this assertion is a level-20
   multiclass caster carrying a full inventory with several conditions
   running — the case that can actually break the budget. A number that could
   not have moved is not evidence.

Motion is set to `--motion-scale: 0` for this tier. This is the reason motion
is tokenised at all.

### Tier 3 — Journey · Playwright test runner, built preview + worker

Small and fixed. Roughly ten tests, and the number is a budget rather than an
outcome. These are the only tests allowed to be slow, and they exist for the
things that are *only* true across a real boundary:

- two devices, one room, both see it
- undo across devices
- offline, then catch up
- install / PWA / service worker
- a character made end to end
- a full round of a fight

Real fixtures, real parallelism, traces on failure, retries only in CI.

### Tier 4 — Invariant · lint

Cheap checks that make a class of bug unwritable.

| check | refuses |
|---|---|
| `check-css` | a `var()` that resolves to nothing — CSS fails silently and *whole* |
| `check-inline` | a literal size or colour in JSX |
| `check-size` | a file over its budget |
| `check-locators` | a CSS-class locator in any test file |
| `check-imports` | `core/` importing from `rules/` or `features/` |
| `check-contrast` | a token pair under 4.5:1 text / 3:1 non-text, in **either** theme |
| `check-glyphs` | a pictographic codepoint anywhere in `src/` — icons are SVG |
| `check-css` (2) | a stylesheet that does not parse — an unbalanced brace |
| `check-styles` | an `s.foo` the imported stylesheet does not define |
| `check-keys` | a `key` carried into JSX by spread, or keyed at some call sites of one props object and not others |

`check-contrast` is already written — it is what produced DESIGN.md's tables,
and it is the check that would have caught V1 shipping a damage red at 4.42:1
on its own ground.

`check-glyphs` has one implementation trap, and getting it wrong is worse than
not writing it. **It must match `\p{Extended_Pictographic}`, never
`\p{Emoji}`** — `\p{Emoji}` matches all ten digits, `#` and `*`, so the naive
version flags every number in an app whose entire subject is numbers. That
produces thousands of false positives, then a baseline file, then it is
ignored. Which is precisely how V1's selector baseline came to sit still for
weeks: nobody works through a list that is mostly noise.

---

## The rules

1. **Silence is not success.** A run that asserts nothing is a failure. The
   runner enforces it, and CI additionally asserts a minimum test count per
   tier, so a suite that quietly stops being collected is loud.
2. **Read the exit code, not the output.** Never pipe a test or build through
   `tail` — a failure then looks like silence.
3. **A journey must pass with the compendium and without it.** `public/content`
   is the published books and is never committed, so a suite written against
   its contents passes here and fails on a fresh clone. Tier 3 drives by
   structure — answer whatever step is on screen — and asks for a name only
   where the name exists in both configurations. Both are run.

4. **Never test against `vite dev`, never reuse a server, and assert on arrival
   that the app under test is yours.** V1's preview was still holding port
   4173 when this harness was first run, so Playwright reused it and ran V2's
   journeys against the *old application*. Tier 3 therefore uses its own port
   (**4271**, strict), `reuseExistingServer: false`, and a first test that
   asserts `html[data-app="table-companion-v2"]`. A fixed port plus reuse is
   how you silently test something else that happens to be listening.
5. **Role and name first, `data-testid` second, CSS class never.**
6. **Assert at the lowest tier that can see it.** A rule proved in tier 1 does
   not get re-proved in tier 3; that trade is what made V1's suite slow enough
   to distrust.
7. **A new test tier is not created.** Four is the number.

---

## Proving the gate

Slice 0 is not done because `verify` passes. It is done because it **fails for
the right stated reason**. Nine deliberate breakages, each caught by exactly
one check:

| broken | caught by | says |
|---|---|---|
| `var(--typo)` | check-css | `uses --typo, which is never defined` |
| a 402-line component | check-size | `the component budget is 400` |
| white-on-gold button | check-contrast | `#FFFFFF on #C89F3D is 2.48:1, needs 4.5:1` |
| an emoji in source | check-glyphs | `contains "🎲" (U+1F3B2) — icons are SVG` |
| `.swing-ask` in a test | check-locators | `selects by CSS class` |
| `core/` importing `ui/` | check-imports | `core/ must import nothing above it` |
| a screen 1.32 screens tall | tier 2 | `expected 1.315 to be less than or equal to 1` |
| a deleted test file | tier 1 | non-zero, named |
| a tier that shrinks | verify | `Silence is not success` |
| a stray `}` in a stylesheet | check-css | `has a closing brace that opens nothing` |
| device state made appendable | typecheck | `Unused '@ts-expect-error' directive` |
| tier 3 shrinking below its minimum | verify | `ran 14 tests, minimum is 15` |

**The gate had a hole in it for four slices.** `MINIMUMS.journey` was declared
and never read: tier 3 ran outside the counting path, so a minimum of 15 sat
happily above a suite of 14. Found by setting the number wrong and noticing it
passed. A guard nobody has watched fail is a guard nobody has checked exists.

Re-run that list whenever the harness changes. Two of the nine did not catch on
the first attempt, and both times the *breakage* was wrong rather than the
check — a `sed` form BSD does not support, and an overflow too small to
overflow. A guard you have never seen fail is a guard you are trusting on
faith.

## Gotchas that have already cost time

- **`getByRole(..., { name })` is a substring match.** `name: "Close"` also
  matches the Frightened condition's *"you cannot move closer"*, which fails as
  a strict-mode violation naming two elements. Pass `exact: true` for any short
  button label that could appear inside a sentence.
- **A number chosen to be dramatic is not a number chosen to test.** Damage of
  999 kills a character outright, and the dead are owed no death saves — so a
  test meaning to check the dying state checked nothing. Derive the input from
  the fixture (`health.max`), never from a round number.
- **A budget measured around an empty box is not a budget.** The sheet's
  height test read 1.4 screens against a ceiling of 1.75 for months. The
  equipment block it was measuring joined `build.equipment` against a hardcoded
  table of three weapons, and the worst-case fixture's thirty ids matched none
  of them — so the block rendered a heading and nothing else. Given real
  content it measured 3.3 screens, and 1.78 with a single row: the block never
  fit at all. **Assert on a count of rows, not on the presence of a container.**
  A container is there whether or not anything is in it.
- **A step list that grows is not a step count that is stable.** `a human is
  just a human` asserted "choosing Human adds no step", using the total as a
  proxy for "no lineage step". It broke correctly the day a Human's extra
  language earned them a proficiencies step. Assert the thing you mean — that
  Class comes straight after Ancestry — not a number that happens to track it.
- **A regex that strips a separator can eat a word.** `(?:or)?\s*$` removed the
  trailing " or" from `(a) scale mail or (b) leather armor` — and also the "or"
  from *armor*, so the Ranger was offered **leather arm**. It only bit when the
  option came last on its line, so the Cleric's identical armour read correctly
  and hid it. Found by sweeping the parser over all 67 classes rather than the
  four that were spot-checked. Require the separator to be preceded by a space.
- **A missing CSS class fails nothing.** Splitting a stylesheet twice left
  classes behind in the component that still named them: rows lost their
  layout and ran a name and its detail into one line, and an armour warning
  meant to be small and red came out large and black. TypeScript is happy —
  `s.note` on a CSS-module object is `any`. The build is happy. Every test
  passed. Only a screenshot showed it. `check-styles` now asserts that every
  class a component names exists in the stylesheet it imports, and it found a
  third case on its first run: the ability rows in `Entry.tsx` had been
  rendering `.name` and `.mod` unstyled since they were written.
- **A walk that stops early passes quietly.** The creation walk picked ONE
  control per step and pressed Continue. Skills wants two, so Continue stayed
  disabled, the heading did not change, and the loop broke — four steps short.
  `expect(seen.length).toBeGreaterThan(4)` kept passing, and **Equipment and
  Spells were never reached by any test in the suite.** Name the steps that
  must be reached, and answer until the button will take it.
- **Clicking down a captured list re-picks every option.** The fix above,
  written carelessly, walked a `querySelectorAll` result clicking each in turn
  — so the class ended as the LAST one clicked, a ranger, who is asked for no
  spells. Click only controls that are not already chosen, and stop the moment
  Continue is enabled.
- **A box measured before the layout settles is the wrong box.** A test held
  down an ancestry tile and toggled a disclosure instead: the detail card grows
  when its prose arrives from the network, and `boundingBox()` had been taken
  before that. Wait for the thing that arrives last — here the prose control —
  then measure. A press against a stale coordinate does not fail; it hits
  something else.
- **The build output is a backup.** A careless two-step refactor deleted a
  reducer from one file before the other had received it. `dist/assets/*.js`
  was minified but complete, and every case body read straight out of it — then
  427 domain tests proved the restoration faithful. Before retyping lost code
  from memory, look in `dist/`.
- **`>>` into a heredoc creates the file if it is missing.** Twice in one
  session a stray `cat >> x.test.ts <<'EOF' EOF` left an empty test file, and
  both times the runner refused it — *"No test suite found"* — rather than
  passing silently. That is tier 1 doing its job, and it is the whole premise
  of the rebuild. Check `wc -c` before assuming a suite is yours.
- **A fixed number of loop turns is not a walk to a step.** Six specs walked
  "answer N times, then assert we are at Identity". Every time the builder
  learned something new they sailed PAST it and asserted against the wrong
  screen — and one hung forever, because Review's button says Finish, not
  Continue. `walkTo(page, "Who is your character?")` in `tests/journey/build.ts`
  stops at the step it means to; the bound is a safety net, not the plan.
- **A helper that answers "the first N checkboxes" answers one pool.** Three
  journey specs each had a copy. When a step became several pools with a count
  each, every copy spent all its picks on the first pool and hung on a disabled
  Continue. Shared in `tests/journey/build.ts`, and each pool is now marked
  `data-testid="quota"` with its own `data-limit` — structure the test can
  drive, rather than a shape it has to guess.

## The machine is part of the harness

Tier 3 drives a real browser against a real build, and on a busy laptop a
one-second test becomes a twenty-second one. Measured in one session: the same
journeys ran in ~1s each at load 2, and timed out at 30s at load 18 — with
leftover servers from V1, orphaned browsers from killed runs, and the suite's
own workers all competing.

Three consequences, all of them now in the config:

1. **Tier 3's timeout is 60s**, not 30. A timeout that fails under load reports
   a machine, not a defect.
2. **The tier-1 speed budget warns, it does not fail.** The same suite measured
   0.5s idle and 13.5s loaded an hour later. A gate that goes red because
   something else is compiling teaches people to ignore the gate.
3. **Kill your orphans.** A killed Playwright run leaves browsers behind;
   ten of them will make the next run look broken.

Before believing a tier-3 failure, run `uptime`.

## Known and unfixed

- **The last write is optimistic.** `push` renders the event and persists it
  without waiting. A page that dies within a few milliseconds of an append
  loses that one event from IndexedDB while having shown it. Found by an
  offline-reload test that passed alone and failed under a parallel suite —
  the suite was simply faster than the transaction. Everything before the last
  event is safe, and store operations are now serialised so a `clear` can no
  longer delete a later write.

## Watched

- **One unexplained tier-3 failure, 30 Aug 2026.** `builds a wizard end to end`
  failed once immediately after a sibling test was added, with no code change
  between that run and three clean ones after it. Not reproduced in three
  repeat runs. Cause not established, so it is written down rather than
  declared fixed. If it returns, suspect the shared default IndexedDB name:
  journeys rely on browser-context isolation rather than a per-test database,
  which is the one piece of state these tests do not name for themselves.

## What the pyramid should look like

Not a target to hit at slice 0, but the shape to keep true as it grows: tier 1
in the thousands and instant, tier 2 in the hundreds and quick, tier 3 around
ten and slow, tier 4 instant. If tier 3 is growing, an assertion is at the
wrong level.

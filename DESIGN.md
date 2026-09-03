---
version: v2-alpha
name: Table-Companion-V2-design
description: "Two real themes, not one filtered into the other. Light is paper on a lit table: an off-white ground (#F7F6F8) with white panels lifted by shadow, near-black ink, and an old gold that only ever appears twice on a screen. Dark is V1's lamplit room, carried whole: near-black greens biased toward the green in the ink, panels separated by hairlines, elevation by luminance because on that ground it can be. One accent, old gold, reserved for whose turn it is and the one control that ends the turn. Every other colour means one thing: red is damage, green is healing, amber is bloodied, violet is concentration, steel is disclosure — and all six were re-measured for light, because all six failed. Type is the operating system's own sans with a serif for names and a monospace for every number that has to line up; no webfont ships, because a table opens this on a phone with no signal. Motion is information: it exists to say a thing changed, it is interruptible, it runs on transform and opacity only, and every duration is a token so a test can set it to zero."
---

# The ground rules

1. **One accent.** Old gold. It marks whose turn it is, and the one control
   that ends the turn. If a third thing on screen is gold, one of them is wrong.
2. **Every other colour means one thing and only that thing.** Never reach for
   one because a screen needs a colour.
3. **Elevation is shadow on light and luminance on dark.** Never a hue — a hue
   already means something.
4. **Colour and motion are information, not decoration** (law 8).

---

# Colour

Every value below was measured, not chosen. Ratios are against the worst
ground the token appears on. Body text targets 4.5:1; non-text indicators —
underlines, bar fills, borders that carry meaning — target 3:1.

## Surfaces

| token | light | dark |
|---|---|---|
| `--canvas` | `#F7F6F8` | `#0F1211` |
| `--surface-1` | `#FFFFFF` | `#161A18` |
| `--surface-2` | `#F1F0F3` | `#1E2320` |
| `--hairline` | `#E2E8F0` | `#272E2A` |

## Ink

| token | light | ratio | dark | ratio |
|---|---|---|---|---|
| `--ink` | `#2D2D2D` | 12.78 | `#E8EDE9` | 14.83 |
| `--ink-dim` | `#6A717F` | 4.55 | `#A7B1AC` | 7.97 |

> The mockup's `#6B7280` measures **4.49:1** on `#F7F6F8` — it misses by 0.01.
> `#6A717F` is the same grey nudged until it passes.

## Gold

| token | light | ratio | dark | ratio | use |
|---|---|---|---|---|---|
| `--gold-fill` | `#C89F3D` | — | `#C9A227` | — | button and active-row fill |
| `--on-gold` | `#2D2D2D` | **5.56** | `#0F1211` | 8.9 | the label on that fill |
| `--gold-ink` | `#8A6D27` | 4.54 | `#C9A227` | 7.26 | gold used as text |
| `--gold-edge` | `#AD8931` | 3.05 | `#C9A227` | 7.26 | underlines, borders, bar fills |
| `--gold-wash` | `#FBF4E2` | — | `#1F1C14` | — | the active initiative row |

Three findings that the mockup as drawn does not survive:

- **White on gold is `2.48:1`.** `END TURN` and `APPLY 8 DAMAGE` cannot carry
  white labels. Ink on gold is `5.56:1`. This was already V1's rule
  (`on-primary: #0f1211`); it just needs carrying over.
- **Gold as ink is `2.30:1`.** The `12 INITIATIVE` numeral in gold on the light
  ground is unreadable by measurement. Gold as *text* is `--gold-ink`.
- **Gold as a bare indicator is `2.30:1` against the canvas**, under the 3:1
  non-text floor — so a gold tab underline on white does not carry on its own.
  Use `--gold-edge`, or let the active label also go to `--ink` and bold.

And one on count: in the mockup `ATTACK` and `END TURN` are both filled gold.
Gold on white is lower-contrast than gold on near-black, so two golds compete
*more* on light, not less. `ATTACK` becomes an ink-filled button.

## Semantics

All six were tuned against `#0F1211` in V1. **All six fail on light.** These are
the re-measured pairs; each passes 4.5:1 on the worst ground it sits on.

| token | meaning | light | ratio | dark | ratio |
|---|---|---|---|---|---|
| `--damage` | damage | `#D2372C` | 4.51 | `#DA564D` | 4.53 |
| `--heal` | healing, unharmed | `#3B7E5B` | 4.51 | `#4FA97A` | 6.10 |
| `--injured` | injured | `#657841` | 4.52 | `#8FA85E` | 6.64 |
| `--bloodied` | bloodied | `#906A20` | 4.57 | `#D4A03C` | 7.44 |
| `--concentration` | concentration | `#7962B9` | 4.58 | `#9887C9` | 5.56 |
| `--steel` | disclosure | `#55758E` | 4.51 | `#6E8FA8` | 5.15 |

> V1's shipped damage red measures **4.42:1 on its own dark surface** — it
> fails marginally on the ground it was picked for. `#DA564D` is that red
> lifted until it passes. This is what a contrast check in CI would have caught.

## Elevation

**Light.** Panels are `--surface-1` on `--canvas`, lifted by one of two shadows
and nothing else:

- `--lift-1` — resting card: `0 1px 2px rgb(0 0 0 / .04), 0 1px 3px rgb(0 0 0 / .06)`
- `--lift-2` — sheet, popover, anything over the page: `0 4px 6px rgb(0 0 0 / .04), 0 10px 20px rgb(0 0 0 / .08)`

**Dark.** No shadows at all. `--surface-1` → `--surface-2` with a `--hairline`
border, exactly as V1. A shadow on a near-black ground is invisible work.

There is no `--lift-3`. Two levels of depth is all this app has.

---

# Type

No webfont ships. A table opens this on a phone in a basement with no signal,
and a font that arrives late is a layout that moves while somebody is reading.

- **Serif display** for names — a character, a creature, a place. The one
  romantic gesture in the app.
  `"Iowan Old Style", "Hoefler Text", Palatino, Georgia, serif`
- **System sans** for everything you read. `system-ui, -apple-system, …`
- **Monospace for every number.** With `font-variant-numeric: tabular-nums`
  wherever digits stack. Numbers that change must not reflow their row.

Twelve steps and nothing between them: `0.54 0.60 0.66 0.72 0.78 0.80 0.84
0.88 0.94 1.00 1.10 1.20` rem, plus display `1.4 1.5 1.6 2 3 3.2`. V1 reached
this from 43 hand-picked sizes, three of which sat within a third of a pixel of
each other. That does not read as hierarchy; it reads as blur.

Weights: 400, 500, 600. Nothing else.

---

# Layout

**Eight spacing steps: 2, 4, 6, 8, 10, 12, 16, 18.** Cards pad 16; rows gap 10.
Prefer `gap` on the flex or grid parent over per-element margins.

**44px minimum on anything a thumb touches.** V1 broke this four separate
times, and every time it was found by measuring rather than by looking. In V2
it is a tier-2 assertion that runs on every component, not a thing to remember.

**Declare your bands.** A grid sized for the children it had when it was
written will silently push the next one onto an implicit row. State the rows,
and give a component one child that holds its controls, so the next control
added joins that strip instead of inventing a band.

**Screen order is law 7**, and it is asserted by a test, not by prose.

---

# Icons, and why none of them are glyphs

Nothing in this app draws an icon with a Unicode character. Measured against
the icon set in the mockup and the marks the app actually needs — damage types,
light, conditions, armour class — **17 of 39 candidates render as colour emoji
on some platform**, and four of them cannot be stopped:

| always colour emoji | | emoji-capable, platform decides |
|---|---|---|
| `🎲` U+1F3B2 roll | | `⚔` U+2694 attack · `⚙` U+2699 settings |
| `⚡` U+26A1 lightning | | `🛡` U+1F6E1 AC · `❤` U+2764 hit points |
| `🔥` U+1F525 fire | | `☠` U+2620 death · `❄` U+2744 cold |
| `🌙` U+1F319 dim light | | `☀` U+2600 bright · `👁` U+1F441 disclosure |

The first column has `Emoji_Presentation=Yes`, which means colour is the
*default* and the text selector U+FE0E is a hint a platform may ignore. The
die is in that column. So is fire damage.

Three of the mockup's own eight icons — attack, settings, roll — are in this
table, and roll is unfixable. **That is the argument for SVG**, not taste:

- deterministic on every platform, with no font-fallback roulette
- `fill: currentColor`, so an icon inherits its token and cannot arrive in a
  colour that means something else — a red sword in this palette is a lie
- no baseline, line-height or advance-width surprises inside a 44px target
- one file, testable, and it cannot become a colour picture on someone's phone

## Defence in depth, for the glyphs that legitimately remain

Dashes, chevrons, arrows, middots and the `−`/`✕`/`✦` family are text-only and
stay. Around them:

1. `font-variant-emoji: text` on `:root`. Cheap, and correct where supported.
2. The font stack never names an emoji family — though note the browser's
   last-resort fallback can still reach one, which is why the stack is not the
   defence, only part of it.
3. U+FE0E after any emoji-capable codepoint that survives review. It helps for
   the second column and not the first.
4. `check-glyphs` refuses the rest at lint time. See TESTING.md.

Imported content is the case the lint cannot reach — a homebrew statblock may
carry an emoji in its name. That is the content author's, and it renders as
they wrote it; the app does not police a table's own words.

---

# Density, and the height budget

A table looks at this between saying words out loud. A screen that has to be
scrolled to be understood has already failed, because the scroll happens while
five people wait.

V1's sheet measured **2,588px against a 2,600px ceiling** — on the reference
phone that is about **3.9 screens**, and the reason law 7 had to be written was
that conditions and concentration sat under fourteen hundred pixels of
equipment. The guard was right and the number was far too generous.

## The unit

Budgets are in **screens**, never pixels — a pixel budget is wrong on the next
device. One screen is the usable content area on the reference phone:

> 390 x 844, standalone. 844 - 47 status - 34 home indicator - 44 header -
> 44 tab bar = **~675px of content**. Call it one screen.

## The budgets

| screen | budget | meaning |
|---|---|---|
| Combat, the turn, any play screen | **1.0** | nothing below the fold, ever |
| Damage / claim sheets | **1.0** | it arrived over the page; it does not then scroll |
| Creation step | **1.25** | question and first options above the fold; Back/Continue pinned |
| The sheet | **1.75** | two deliberate scrolls; see below |
| Compendium and reference lists | exempt | you are browsing; scrolling is the interaction |

An exempt list still owes a sticky filter, so the scroll is never the only way
to reach a row.

The sheet was 1.5 until it gained an identity card and a five-cell stat strip
from the concept — two components the earlier one did not have, and both of
which a table looks at rather than scrolls past. It measures 1.58 with every
skill trained. Raised to 1.75 *after* evicting twice, not instead of: the
reference bands went behind tabs, and the skills column became six highlights
with the other twelve a tap away. V1's equivalent was 3.9.

Creation is the one relaxed budget, because nobody at the table is waiting on
it and the person is reading rather than acting. You may scroll to reach the
sixth ancestry; you may never scroll to discover what is being asked, or that a
Continue exists. See CREATION.md.

## How the budget is met

Only by removing things from the screen. Never by shrinking them — 44px
minimums and eight spacing steps are not negotiable, and V1 already named the
trap: *shaving padding to bank headroom is gaming the guard.*

Four mechanisms, in the order to reach for them:

1. **Drawers over the panel.** V1 proved this: skills, saves and features
   became three buttons that open over the sheet instead of fourteen hundred
   pixels to scroll past. This is the default answer.
2. **Expand in place, one at a time.** The initiative rows in the mockup are
   right — a collapsed row is one line, an open one shows AC, speed, conditions
   and actions. Accordion, not multi-open, so the list length is bounded no
   matter how many creatures are in the fight.
3. **Segments, not sections.** Two bands side by side beat two bands stacked.
4. **Evict by law 7.** If it still does not fit, the lowest of the four
   questions leaves the screen. That is what the ordering is *for*.

## Entering a number

**Never step to a number somebody already knows.** Fifteen is seven presses
away with a `+`, and one number to type. A stepper is for a value being
*discovered* by nudging, and almost nothing here is.

Three ways in, and which one depends on where the number comes from:

| the number comes from | control |
|---|---|
| the person's head — an ability score, a level | **typed** |
| a die they just threw — damage, a hit die | **a pad** of faces |
| moving a quantity between things — levels across classes | a stepper |

**Typed** means a numeric field with the constraint enforced on what was
typed, and a refusal that says why. `16` in point buy is not silently rewritten
to `15`: the score stays where it was and the field says *"Strength must be
between 8 and 15."* Silently correcting somebody's input teaches them the app
is unreliable rather than that the rule exists.

**A pad** is a grid of faces, pinned to the bottom of the viewport rather than
placed in the page — anywhere in the document flow makes the distance between
what you tapped and where you answer depend on where you happened to be
scrolled. Ported from V1 with its rules: only faces the die has, so a d10 has
no 11; advantage is two taps and the pad keeps the right one; and a modifier is
*shown* beside the total, never folded into it, because a printed number that
disagrees with the table's own arithmetic is worse than a line to read.

**A skill check is typed, not padded.** The pad suits a value read off dice in
front of you; a check is a total somebody has already worked out, and twenty
keys is a slower way to say a number you can spell.

## The shell

Play screens are a fixed shell, not a document: header, one scrollable middle,
and a pinned action bar carrying the control that ends the turn. The mockup
already draws this.

- Heights use **`dvh`/`svh`, never `vh`** — `100vh` on iOS includes browser
  chrome that is not there.
- The pinned bar sits above `env(safe-area-inset-bottom)`.
- In a browser tab rather than standalone, iOS's disappearing toolbar will
  fight a pinned bar. Standalone is the supported target; the tab case degrades
  to a normal document rather than being fought.

---

# Motion

Motion says a thing changed. That is its whole job. At a table, motion that
delays a number is a cost paid by six people at once.

## Tokens

Every duration is a token. Nothing hard-codes a millisecond.

| token | value | for |
|---|---|---|
| `--m-press` | 100ms | press feedback, the only motion allowed to be instant-feeling |
| `--m-state` | 180ms | a value changing in place — HP, a condition appearing |
| `--m-expand` | 240ms | an initiative row opening, a drawer |
| `--m-sheet` | 320ms | a sheet arriving over the page |
| `--m-ease-out` | `cubic-bezier(.2,0,0,1)` | anything entering or settling |
| `--m-ease-in-out` | `cubic-bezier(.4,0,.2,1)` | anything moving between two known places |
| `--m-spring` | spring(300, 30) | sheets and anything a finger can catch |
| `--motion-scale` | `1` | **set to `0` in test mode and under reduced-motion** |

## Rules

1. **Transform and opacity only.** Never animate height, width, top, or
   anything else that lays out. A row that expands animates a transform on a
   wrapper or uses a discrete grid-rows trick — not `height: auto`.
2. **Interruptible.** A sheet caught halfway follows the finger from where it
   is. Anything a gesture can touch is a spring, not a duration.
3. **Nothing blocks a number.** The hit/miss reveal gets a beat; the hit points
   underneath it do not wait for that beat to be correct.
4. **`prefers-reduced-motion` collapses to opacity**, and `--motion-scale: 0`
   removes motion entirely. Both paths are tested.
5. **Motion is a token, so a test can kill it.** This is the join between the
   two things this rebuild is for: hand-rolled per-component animation is the
   classic reason a browser suite goes flaky, and V1's suite was already flaky
   without it.

## What earns motion, from the mockup

| moves | why | token |
|---|---|---|
| initiative row expand | the detail was not there and now is | `--m-expand` |
| turn handoff | the single most important state change on the screen | `--m-state` |
| HP bar + number | the value changed and someone must notice | `--m-state` |
| damage sheet | it arrived over the page and can be dragged away | `--m-sheet`, spring |
| hit/miss reveal | a beat before the result lands is the drama the app is allowed | `--m-state` |
| log entry arriving | something happened while you were looking elsewhere | `--m-state` |

Polish, not information — cheap, so allowed, and the first cut if it costs
anything: tab underline slide, press feedback, chevron rotation.

---

# Do's and don'ts

- **Do** put every literal size and colour in a token. **Don't** put one in JSX —
  `check-inline` refuses it.
- **Do** define every custom property you reference. **Don't** trust that a
  `var()` resolves: CSS fails silently and it fails *whole*, so
  `border: 1px solid var(--typo)` is not a wrong colour, it is no border.
- **Do** let CSS Modules scope your class. **Don't** write a global class —
  V1 had 26 selectors matching more than one component, and a redesign thrashes
  exactly those.
- **Do** use colour to carry meaning. **Don't** use it to carry emphasis.
- **Do** run `check-contrast` before adding a colour. **Don't** eyeball a
  ratio; six of V1's six were wrong and one was wrong on its own ground.

## One navigation

The player surface has exactly one, and it is the bar at the bottom: phone-first
means the nav belongs where a thumb is.

It was two, and neither worked. The hub carried its own row — Create, Combat,
Equip, Book, Log — above a `TabBar` of Home, Characters, Companion, Library and
More. `TabBar` took an `onGo` prop and nothing in the app ever passed one, so
all five were decoration, on every screen including all fourteen creation steps.
Of the fifteen controls in the four stacked bars, two did anything.

Every one of the hub's sections already existed somewhere else. Combat and Equip
are a **character's** sections and the sheet carries them as Combat and
Inventory; Book was Library under another name, on the same screen; Create was
the tile immediately below it. Only Log went anywhere, and Log is a place, so it
became a tab.

**The bar holds what exists, and it is computed** — V1's model (`ui/App.tsx`,
`ui/Tabs.tsx`), minus the seat. Three of its rules apply already:

- **A tab appears only when it has something on it.** V1 omits Spells for a
  character who casts nothing — *"a fighter has nothing to put on it."* Here it
  is **Sheet**, which needs a character to be the sheet of: with none, the bar
  is Characters and Log.
- **A tab can carry a dot.** The cost of tabs is that things go out of sight,
  and one of those things is a save owed right now. `waitingOn` is one rule
  with two readers — the sheet says it in full, the tab dots — because two
  copies would drift. Nothing moves you on its own; V1 reserves that for a
  fight starting and a save falling due, and *"being yanked off a page
  mid-sentence is its own kind of wrong."*
- **The tab shown is checked against the set that exists.** V1: *"a seat change
  can also leave you on a tab the other side does not have."* Here it is the
  last character going away while its sheet is open.

**And nothing is drawn that is not built.** Library the day there is a
compendium screen behind it; Home and Companion the day they mean anything.

The fourth rule — **contents by seat**, a DM's Party and Prep against a
player's Sheet and Gear — waits for slice 7, with the crest row's PLAYER pill.

One thing V1 does that V2 cannot copy yet: it has **no hub at all**. A player
lands on their sheet, a DM on the party. V2's Characters screen carries the
room bar, import and several characters, which V1 has nowhere — but it is an
extra hop, and worth re-examining rather than assuming.

The crest row stays, and so does the dead `PLAYER` pill: that one is V1's
`I am` seat control with nothing behind it yet, and slice 7 needs exactly that.
It is the one control worth drawing before it works, because something real is
coming to fill it.

## Two surfaces, two starting widths

Everything built so far is **phone-first**: `Shell` is five declared rows at
`100dvh`, every step holds its actions pinned, and there is not one media query
in the codebase.

**The DM side starts at tablet and desktop** and collapses to a phone, which is
the opposite direction. That is not a preference — it is what the surface is
for. A player looks at one character and a DM looks at a fight, a party, and
their prep at once, and a column that has to be scrolled to is a column that is
not read while five people wait.

So the two surfaces do not share a shell. They share the tokens, the
components, the log and the room.

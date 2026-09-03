# The character builder

The spec for slice 3, from nine concept screens.

## The contract

> **The screens are authoritative for layout, hierarchy and interaction.**
> **The compendium is authoritative for content, counts, filters and numbers.**
> Where they disagree, the drawing wins on shape and the data wins on
> substance.

So: the point-buy stepper rows are the layout, and the values in them come from
the real table with the real cap. The filter chip row is the layout, and what
fills it is whatever the data can actually support. The six-card ancestry grid
is the layout, and it degrades to text rows past the illustrated set.

Nothing below is a complaint about the drawings. §7 is the list of places where
the substance has to come from somewhere else, which is the normal case.

---

## Component inventory

The nine screens are drawn from about twenty components, and most appear three
or more times. Building these once is what keeps every screen file under the
400-line ceiling — the screens become arrangements, not implementations.

| component | appears in |
|---|---|
| `StepHeader` — back · title · help | all eight steps |
| `StepProgress` — dots, **computed** count | all eight steps |
| `StepIntro` — the question + one-line subtitle | all eight steps |
| `Segmented` — 2–4 segments | abilities, equipment, spells |
| `ChipRow` — horizontally scrolling filters | spells |
| `ChoiceGrid` — 2-up image cards, selected check | ancestry |
| `ChoiceRow` — icon · name · role · tag chips | class |
| `CheckRow` — checkbox · label · trailing value | skills |
| `ItemCard` — 3-up, dice and properties | equipment |
| `ListRow` — thumb · label | equipment, spells, hub |
| `Stepper` — label · value · modifier · − + | abilities |
| `DetailCard` — what the current choice means | ancestry, background, skills, abilities |
| `HookCard` — title · one line, tappable | background |
| `Counter` — `n / m` against a limit | abilities, skills, spells |
| `Field` / `FieldPair` | identity |
| `ActionBar` — pinned Back · Continue | all eight steps |
| `EntryTile` — 2×2 | hub |
| `TabBar` | hub only |

## The band order, and it is the same on every step

Law 7 applied to the builder. Every step is this, top to bottom, and a step
that wants a new band is a step that needs a different component:

```
StepHeader        pinned
StepProgress      pinned
─────────────────────────  scrolls
StepIntro         the question
Choices           grid / rows / list
DetailCard        what the current choice means  ← last in the scroll
─────────────────────────  pinned
Counter           n / m, when the step has a limit
ActionBar         Back · Continue
```

`DetailCard` is last in the scroll region rather than pinned, which is what the
drawings already do — the Elf traits preview sits under the six cards, and the
`Arcana +5` breakdown under the skill list. Pinning it would cost ~90px on
every step to show something that only matters after a choice is made.

---

## The flow

```
Hub ─┬─ Guided Creation      (the nine screens)
     ├─ Quick Build          deferred — see §6
     ├─ Advanced Creation    deferred — see §6
     └─ Import Character
```

Steps, for a level-1 wizard: **Ancestry → Class → Abilities → Background →
Skills → Equipment → Spells → Identity.**

### The step list is computed, and it is not eight

This is the first thing the screens get wrong, and V1 has a commit about it:
*a step arrives instead of changing underneath you.*

- A **fighter has no Spells step**. A cleric picks a subclass at level 1; a
  wizard does not.
- **Subrace is missing from the screens entirely.** Elf → High / Wood / Drow.
  V1 has this step and the compendium files subraces comma-inverted
  (`Dwarf, Hill`), which is why three name spellings are normalised.
- **Joining mid-campaign at level N** adds every ASI-or-feat already earned,
  and multiclassing adds a second class's grants.
- A **Fighter is asked how they fight** at level 1, a Paladin and a Ranger at
  2, and the other nine never. The level is not a table — the class lists its
  styles as its own features and states the level on each.
- **Heritage arrives when the ancestry left something open** — a Half-Elf
  places two ability points and picks two skills, a Variant Human places two,
  picks a skill and takes a feat. 66 of 605 ancestries leave points, 32 a
  skill, 4 a feat. It sits *after* Ability Scores, because you place points
  against numbers you can see, and *before* Skills, so a skill it grants shows
  as already held.
- **Improvements arrives for a character joining above level one.** A Fighter
  created at 8 has passed 4, 6 and 8. Both points may land on the same ability
  — that is legal, common, and the level-up screen still will not allow it.
- **Second class arrives for the three classes that bring a skill.** A bard's
  is any skill at all; a ranger's and a rogue's come from their own lists. The
  other ten bring armour and weapons, which are recorded, not chosen.
- **Review is last, after Identity.** Not a gate — every step already refuses
  to continue until it is answered — but a confirmation, and the one place
  that says what the BOOK left open rather than what the person skipped.
- **Languages & Tools arrives only when something is left to decide.** A
  Half-Elf Bard with a Criminal background answers three separate questions;
  a Dwarf Fighter with a Soldier background is handed everything and is never
  asked. "Choose 0 of nothing" is a dead end, not a question.

So the progress indicator is derived from *this* character's step list, and a
fixed run of dots is a lie the moment a wizard and a fighter are compared. A
step that becomes relevant **arrives** — it is appended and announced. Nothing
already answered may change underneath the person answering.

---

## Per screen — the layout, and what fills it

### Hub
A character **list**, not a character. `core/` holds a collection from slice 1;
"Recent Characters" reads it. Entry tiles gate the flows in §6.

### Ancestry
Six illustrated cards in the screens. The compendium carries **605 races**,
81% of them marked. So:

- Cards with art for the core set only. Everything else is a text row.
- The `N more…` affordance is required here, not optional — and the switch
  rules apply: already-chosen stays listed, unfiled falls to "elsewhere".
- **Label it "Ancestry", store it as `race`.** "Ancestry" is 2024 vocabulary;
  `books.ts` is 2014-only and files 149 races. A UI rename that reaches the
  data model detaches the whole compendium mapping. Display layer only.
- The traits preview card is right, and is law 7's "what am I" band — it sits
  under the choice, and it is the first thing evicted if the step busts budget.

### Class
Rows with a name, a one-line role, and three tag chips. Correct, and needs the
`extra` treatment: **67 classes** in the compendium, twelve familiar ones
first, the rest behind `N more…` — alphabetical otherwise buries Fighter under
a wall of `Auxiliary Level: …`.

### Ability scores
Four methods: Point Buy · Standard Array · Roll · Manual.

**Two of those four are the licensing boundary.** The point-buy costs and the
standard array live in the not-SRD module — the one file that makes the app
non-redistributable. Therefore:

- Point Buy and Standard Array are the *only* creation surface that may import
  it, and `check-imports` enforces that.
- **An SRD-only build shows Roll and Manual**, and the segmented control has
  two segments rather than four greyed ones. Absent is normal.

**The screen's own numbers are impossible** and must not be coded from: it
shows `27 / 27 Points Remaining` beside scores of 16/14/14/10/12/16. Point buy
starts every score at 8 and **caps at 15** before racial bonuses; that spread
is neither unspent nor purchasable. Also `Intelligence 10 → +0` here, while the
Skills screen derives `Arcana +5` from `+3 Intelligence`. Reference images get
read literally, so these are placeholder values to be replaced, not a spec.

*Recommended for Wizard* + *Apply Recommended* is good guidance and is new
against V1. It must state its reasoning — it is a suggestion the player can
disagree with, in the same spirit as the encounter builder showing its working.

### Background
The Sage card and its "You gain" list are law 7 done properly: the consequence
of the choice, on the choice. **Suggested Story Hooks** with *Create My Own* is
the right shape.

### Skills
A live count and the preview card breaking `Arcana +5` into `+3 Intelligence`
and `+2 Proficiency`. This is the single best screen in the set — it is exactly
"everything the app knows, it says in a sentence, at the moment it applies."

One correction: the gold underline under `+5` is a third gold on the screen.
See §5.

**Not "choose 2", and not all eighteen.** Both are the class's to say, and it
says both in its own `Starting <Class>` feature: a Rogue chooses four from
eleven, a Bard three from all of them, a Wizard two from six. Offering everyone
two of eighteen is the Fighter's answer given to eleven other classes.

**What the background already gave is shown, and shown as held** — ticked, and
not pressable. A Sage's Arcana and History appear in the list with *From Sage*
beside them. Hiding them leaves a person wondering where their background's
skills went; offering them spends a pick on something already owned. This is
also why Background comes *before* Skills in the order.

### Saying what an option MEANS

The builder listed names — "Darkvision, Fey Ancestry, Trance" — and there was
no way to find out what Trance is.

**The card is asked for, and only asked for: hold a row.** It was built with
two ways in — the card opened on selection as well, carrying a visible
`What does this give you?` — and on a real phone that was plainly wrong. It
took a third of the screen to explain the choice already made, which is the one
thing on the screen needing no explanation; it dropped the ancestry grid from
four visible rows to two and a half; and because a step always has something
selected once you have chosen, it never went away again.

So selection explains nothing, and holding a row explains it. Inside the card
the visible `What does this give you?` control remains — V1's wording and V1's
reasoning: a `<details>` gives keyboard and screen-reader behaviour for free,
and the summary is a real affordance.

Two consequences. The card **is always pinned** now rather than appended to a
short list: somebody holding a row has asked a question, and the answer must
arrive where they are looking. And it **carries a close control**, because a
card that is asked for needs a way out — without one it is the permanent card
again under a different trigger.

The cost is real and worth naming: a long press has no affordance and no
keyboard path, so on a desktop or with a screen reader there is now no way to
reach the prose during creation. That is a debt against the tablet/desktop
work, not a thing to leave silent.

The press needs four things, each a real defect if missed.

**Movement cancels it** — a finger that has started scrolling is not pressing.

**The callout menu is off** (`-webkit-touch-callout: none`), or iOS offers to
copy the text and save the portrait.

**The drag lift is off too**, and this is a different behaviour needing a
different answer. iOS also tears the image out of the card and floats it under
the finger, translucent, over the rest of the grid. `-webkit-user-drag: none`
is what stops it; the art also carries `draggable={false}`, which is what
desktop browsers read, and `pointer-events: none`, since it is decorative and
aria-hidden and the button underneath should be what the finger finds.

**The click that follows is swallowed — wherever it lands.** A press ends in a
pointerup, which the browser turns into a click, so holding a row to read about
it would also select it. The row's own handler is not enough: once iOS starts
that drag it stops delivering `pointermove`, so movement-cancel goes blind, the
finger reaches a *neighbour* unseen, and the click lands there. Holding Elf put
the tick on Gnome. A fired press therefore swallows the next click on the
document, once, expiring after 500ms so a press followed by no click cannot
leave a trap set for the next real tap. That listener goes on the pressed
element's **own** `ownerDocument`, not the ambient one — a component can be
rendered into another document, and a guard on the wrong document silently
does nothing.

Two layout rules came out of building it. The prose is **bounded with its own
scroll** — an ancestry's runs to paragraphs, and letting the card grow pushed
the list 3,800px off the screen against a budget of 1.25 screens. And the card is
**pinned** rather than last in the scroll: on sixty-eight ancestry cards, one
that lives at the bottom drags the whole view down to it.

### Fighting Style
One question, grouped by the book that printed each, exactly as Path is. A
Fighter's list is the six from the Player's Handbook, five from Tasha's, two
from Unearthed Arcana and thirty-odd homebrew — and the switch hides the last
two groups like everywhere else.

### Languages & Tools
Several small questions on one screen, each with its own pool and its own
count. **Merged into one count they would be wrong:** a Criminal's gaming set
and a Bard's three instruments are different pools, and "choose four tools"
lets a person spend the gaming set on a lute. Anything already held is struck
from the pool it would have been offered from, so a Half-Elf cannot spend their
background's language on Elvish.

### Equipment
**Read from the class, not from a table.** The compendium states each class's
starting equipment as lettered lines — *(a) chain mail or (b) leather armor,
longbow, and arrows (20)* — and each line is one question. A Fighter answers
four, a Cleric five. A line with no letters is carried rather than asked about.

The screen this replaced held three weapons for four classes and a longsword
for everyone else, which is why a Cleric was offered a longsword and a Bard a
shortbow. Lines are stored as **the book's own words**, not as item ids:
resolving "two martial weapons" into two item records is the player's decision
and not the app's.

**Armour is the exception, and it is resolved at the moment of choosing.** The
line is prose, so the suit has to be found *in* a sentence — longest name
first, because "studded leather armor" contains "leather armor" — and what it
resolves to is stored on the build. A sheet must not need the compendium open
to say what a character's armour class is, which is the same commitment
`bonuses` and the proficiency grants make.

Nine of the thirteen classes name armour in their starting equipment; a
Barbarian, Monk, Sorcerer and Wizard name none, and are unarmoured, which is
correct. The number is never shown without the sum that made it — `Chain Mail
16 (dex does not apply) + Shield +2` — because a capped or ignored Dexterity
bonus is the commonest reason a player's arithmetic disagrees with the sheet.
That sentence lives on Inventory rather than in a `title`, which explains
nothing on a phone.

### Spells
**A wizard's cantrips, not everybody's.** Every spell carries the list of
classes that get it, and nothing read it — so a wizard was offered all 198
cantrips in the compendium, Eldritch Blast and Druidcraft included.

Reading that list has three shapes and two of them are wrong. A bare match
alone hides Fireball from a Light cleric, who genuinely has it — V1 says so and
rejected it. `key()`, which strips parentheses, turns `"sorcerer (clockwork
soul)"` into `"sorcerer"` and put Aid, Bane and Bless on a plain sorcerer's
list. V1 took the middle road, accepting any unmarked qualifier, because its
call site did not know the character's subclass.

**V2 does know it**, so `castableBy` is exact in both directions: a Light
cleric gets Fireball and a Life cleric does not; a Clockwork Soul sorcerer gets
Aid and a plain one does not. One rule, used by the creation list and the
level-up list alike. A wizard sees 30 cantrips past the switch — the Player's
Handbook's sixteen plus Xanathar's and Tasha's.

**And the class's own count.** Three was the wizard's number given to six other
classes: a sorcerer knows four at first level, a bard, druid and warlock two.
The compendium does not carry this, so it is stated — like the ASI levels, and
for the same reason.


Two problems, both data rather than layout.

1. **The Cantrips tab is a wall of invocations without a filter.** Compendiums
   file invocations, maneuvers, metamagic, runes, infusions and elemental
   disciplines under spells: 1,539 of 3,443 entries, 1,409 claiming level 0.
   The class-feature filter is not optional on this screen. 65% of spells are
   marked, so the switch applies here too.
2. **`Damage / Utility / Control / Healing` is not a field the compendium
   carries.** There is nowhere to read it from. Either derive it at compile
   time with a stated accuracy and default to `All` — V1's precedent is reading
   damage out of spell prose, which recovered 84% — or drop the chips and keep
   school. Do not ship a filter that is silently wrong for a sixth of the list.

### Identity
Name, pronouns, age, height, appearance, personality, and **Inspire Me**.

**Inspire Me must be local.** A table opens this on a phone in a basement with
no signal; a button that needs a network is a button that fails in the room it
was built for. A local table of prompts, offered as options to choose from —
the shape the Background screen already uses for story hooks — rather than
prose written into the fields. Law 6: say only what can be stood behind.

---

## Three inconsistencies to settle

All three are layout, and all three are places the nine screens each answered
the same question differently.

1. **Where the counter lives.** Skills puts `Choose 2 Skills · 1 / 2` at the
   top of the list; Spells puts `Cantrips Selected · 2 / 3` in a bar at the
   bottom; Abilities puts `27 / 27` up beside the heading. Settled: **the
   counter is pinned directly above the action bar**, always, so a limit is
   never something you scroll to find — which is also what the 1.25-screen rule
   requires.

2. **Where the choice explains itself.** Ancestry uses a preview card below the
   grid, Skills a derivation card below the list, Background folds it into the
   card, Class carries it in inline chips and has no card at all. Settled:
   **one `DetailCard`, last in the scroll region**, on every step that has
   something to say. Class keeps its chips *and* gains the card.

3. **How many progress dots.** The drawings vary between five and six, and the
   real answer is neither — it is computed per character. The component takes
   `(index, steps)` and never a constant.

---

## §7 · Real-world compromises

Collected, because they are the substance the drawings deliberately left as
placeholder:

- **Ability values** come from the real point-buy table, and the `+` control
  stops at 15 before racial bonuses. The screen's 16/14/14/10/12/16 against
  `27 / 27 remaining` is illustrative.
- **Ability methods** are two or four depending on the build (licensing).
- **Spell categories** are whatever the data supports — school, or a derived
  taxonomy with a stated accuracy. The chip row is the layout either way.
- **The cantrip list** is filtered for class-features-as-spells or it is a wall
  of invocations.
- **Ancestry and class lists** run to 605 and 67; illustrated cards for the
  core set, text rows and `N more…` behind them.
- **Modifiers shown on one screen must agree with the next.** `INT 10 → +0`
  and `Arcana +5 from +3 Intelligence` cannot both be true of one character;
  the builder derives both from one place.

---

## Height budget, revised

The creation steps collide with the 1.0-screen budget: Ancestry, Abilities,
Background, Equipment, Spells and Identity all exceed it on the reference
phone. That budget was written for **play** screens, where the table is
waiting. Creation is not that — nobody is waiting, and the person is reading.

So, revised, and DESIGN.md carries it:

> **Creation step: 1.25 screens, with Back/Continue pinned.** The question
> being asked, and the first options, are above the fold. You may scroll to
> reach the sixth ancestry. You may never scroll to discover what is being
> asked, or that a Continue exists.

And: **the bottom tab bar is hidden inside a step.** It appears on the hub and
nowhere else. That buys ~50px on every screen, stops the tab bar competing with
Back/Continue for the same thumb, and prevents tabbing away mid-build.

---

## Gold, in the builder

DESIGN.md allows gold two jobs: the state that matters, and the one control
that carries the flow forward. In these screens it has four — selection check,
selected card border, the `+5` underline, and Continue.

Settled, **as drawn**: gold is the selection *and* the forward control, and
nothing else. The `+5` underline goes.

An earlier pass here made Continue ink-filled on the reasoning that one screen
should carry one gold. That was V1's rule, and V1 was on a near-black ground
where gold is loud. On paper it is not: a gold Continue reads as the way
forward and a gold-washed card reads as the answer you gave, and they do not
compete because they are never in the same band. The drawing had it right.

Ink-on-gold measures 5.56:1, so the label stays `--ink`. White would be 2.48:1.

---

## §6 · The four entry paths

Guided Creation and Import Character are slice 3. **Quick Build and Advanced
Creation are deferred**, and the tiles are not drawn until they exist:

- **Quick Build** needs curated pre-made builds. That content does not exist
  and cannot come from a compendium — it has to be authored, per class, and
  maintained against every content change.
- **Advanced Creation** is a second interface over the same model. Every rule
  in the guided flow has to hold in it, which is a doubling of tier-2 surface
  for a path the target player — someone who has played twice — will not take.

Both are additive later and neither blocks first ship.

**Import without export.** The hub offers *Import from file or other sources*,
and V1 parked export with the decision open: *no printable sheet, no file, no
link*. A builder that can read a character and not write one is a trap the
first time somebody's phone dies. Export lands **with** import in slice 3, and
the format is the same one import reads.

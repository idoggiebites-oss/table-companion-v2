# Phase 9: closing the port gap

*Plan and reasoning: `gap-plan.md`. Numbering continues from Phase 8's 45.*

---

## Phase 9a — The Book tab

## Task 46 · **Opus**: A statblock a DM can read

**Description:** V1's `StatblockView.tsx` (119). The sharpest defect in the app
today, and V1 measured it: staging a creature keeps its hit points, its armour
class and the actions that deal damage, and drops everything else at the
boundary — **17 of 57 entries across seven common monsters.** Gone: Nimble
Escape, Regeneration, Legendary Resistance, Petrifying Gaze, and Multiattack on
nearly every statblock in the game.

V1's two rules travel with it:
- *"`onAct` is what makes it a control rather than a page. An entry that names
  numbers becomes a button; the rest stay prose, because a trait is something
  that is true rather than something you do."*
- *"It never rolls. Tapping an action names the die and holds the modifier — the
  number still comes from a person throwing something."*

**Acceptance criteria:**
- [x] A staged creature's full statblock is readable from the fight
- [x] Traits render as prose; actions that name dice are lifted onto their own line — NOT a button: V1's tap routed into `savefrom` and the swing walkthrough, neither ported
- [x] Nothing here rolls

**Verification:** domain test on the parse; component test that a trait is not a
button; a journey that stages a monster and reads an ability the fight never
carried
**Dependencies:** none · **Scope:** M

---

## Task 47 · **Sonnet**: The bestiary, browsable

**Description:** V1's `Reference.tsx` (163). 6,633 statblocks, searchable, with
CR-ceiling and kind filters. V2 has the data (`creatures.ts`) and no screen.

**DM only, and not as an afterthought** — V1's reason: *"a player who can look
up the statblock knows the armour class and the hit points, which is exactly
what the disclosure ladder exists to withhold."*

**Acceptance criteria:**
- [x] Search and filter over the whole bestiary, rendered with Task 46's view
- [x] Behind the DM's seat, like every other disclosure decision
- [x] Loads on first open, not with the app — 141KB gzipped

**Verification:** component test with an injected fetcher (`bestiary` takes one);
a journey that a player has no route to it
**Dependencies:** 46 · **Scope:** M

---

## Task 48 · **Sonnet**: Spells the DM can look up

**Description:** V1's `SpellLookup.tsx` (160), and its whole reason in one
line: *"A player casts Hold Person and the table looks at the DM — who had the
whole bestiary and not one spell."*

**Acceptance criteria:**
- [x] Search all 3,443 spells and read one in full
- [x] Loads on first open, like the bestiary
- [x] Reachable by a player too — a caster looks their own spells up

**Verification:** component test with an injected fetcher
**Dependencies:** none · **Scope:** M

---

## Task 49 · **Opus**: Creature homebrew

**Description:** V1's `Homebrew.tsx` (287). Its header states why this is not a
nice-to-have: *"Everything outside SRD 5.1 — which is most published monsters —
can only reach this app by being typed, so this is not a bolted-on extra; it is
what makes the reference usable for a real campaign."*

The item half already exists (`features/sheet/homebrew.ts`, Task 21) and its
whole point applies here too: a made-up creature must be indistinguishable
downstream, so it stages, takes damage and rolls initiative through the same
paths as any other.

V1's XP rule is worth keeping: *"XP is suggested by looking at what SRD
creatures of the same challenge rating are worth — derived from data already in
hand rather than copied out of a CR-to-XP table, which is not SRD content."*

**Acceptance criteria:**
- [ ] A made-up creature stages and fights like any other
- [ ] The form asks what a fight needs and nothing else
- [ ] Experience is suggested from neighbouring SRD creatures, never a table

**Verification:** an indistinguishability test in the shape of
`homebrew.test.ts`; a journey that stages one
**Dependencies:** 46 · **Scope:** M-L

---

## Task 50 · **Opus**: Importing a compendium

**Description:** V1's `Sources.tsx` (218). V2 ported only the class-parsing
half of this, so a person with a compendium can currently get classes out of it
and nothing else.

V1's constraints, all of which still hold: *"This app cannot bundle one — those
files are the published books — so it reads a file you already have and keeps
it on this device… Nothing here crosses the room: content is not campaign
state."* And: *"A complete compendium is about 30MB parsed and the creatures are
half of it… Parsing happens one kind at a time with a yield between, so the
screen can say what it is doing instead of freezing for eight seconds."*

**Acceptance criteria:**
- [ ] A compendium file is read on-device and never enters the log
- [ ] The screen says what it is doing while parsing, rather than freezing
- [ ] You choose which kinds to take

**Verification:** domain tests on the parse; a component test that the progress
line advances
**Dependencies:** none · **Scope:** L

---

### Checkpoint E — the Book tab
- [ ] A DM can look up any monster or spell mid-session
- [ ] A staged creature shows everything it can do
- [ ] `npm run verify` clean, deployed

---

## Phase 9b — The sheet's missing half

## Task 51 · **Opus**: Class resources

**Description:** V1's `resources.ts` (328). `PORT.md` calls it **the largest
single gap**. V2 tracks hit dice and nothing else, so a warlock's pact slots, a
fighter's Second Wind and a bard's Inspiration are all invisible.

V1's own framing: *"The bet the whole rest system rests on: a rest is 'restore
everything tagged for this rest'."*

**Acceptance criteria:**
- [ ] What a class gives is spendable and shown on the sheet
- [ ] A rest restores exactly what is tagged for it
- [ ] `Vitals.spent` is the hook; nothing else changes shape

**Verification:** domain tests per recharge tag; a journey spending and resting
**Dependencies:** none · **Scope:** L

---

## Task 52 · **Sonnet**: Notes

**Description:** V1's `Notes.tsx` (93). Also the Notes tab the Prep mockup
draws, which `tabs.ts` refuses to show until something is behind it.

V1's rule on privacy is the interesting part and must survive: a note lives in
the log because *"a note that lives on one phone dies with it"*, so "private"
means *no screen but yours and the DM's prints it* — and the app says exactly
that where notes are written, because anything stronger is a promise the
architecture cannot keep.

**Acceptance criteria:**
- [ ] A note survives a reload and reaches a second device
- [ ] The screen says plainly who can read it
- [ ] The Notes tab appears now that it has something behind it

**Verification:** domain test on visibility; a room journey across two devices
**Dependencies:** none · **Scope:** S-M

---

## Task 53 · **Opus**: Loot, the purse, and the shop

**Description:** The stash (`lootGranted`, `stashAssigned`, `stashCoinsSplit`),
the purse half of `money.ts` that `PORT.md` lists as not ported, and V1's
`Shop.tsx` (82) which is blocked on it.

Two V1 rules to keep: *"Loot found together lands here, to be divided later —
which is what a table actually does"*, and on splitting coins, *"An even split
only; the remainder stays in the stash rather than being quietly given to
whoever happens to sort first."*

And the shop's reactive contract: *"Appears only while the DM has a trader open,
and vanishes when they close it… a player does not go looking for a shop, the
shop arrives because the party walked into one."*

**Acceptance criteria:**
- [ ] Loot lands in a shared stash and can be assigned to a character
- [ ] Coins split evenly, remainder staying put
- [ ] A shop is visible to players only while the DM has it open

**Verification:** domain tests on the split and the assignment; a room journey
where a shop opens and closes
**Dependencies:** none · **Scope:** L

---

### Checkpoint F — at least V1's equal
- [ ] Walk `PORT.md`'s *not ported* table and confirm every row is either done
      or a stated, deliberate drop
- [ ] **Then** Phase 8 resumes

---

**Still not ported after this, and deliberately:** `actions` (needs the turn
economy `stance.ts` names as missing), `checks` and `terrain.checkEffects`
(which arrive together), `roll` (V2 logs a total, not a die), `boons`,
`spellrole`, `savefrom`, `editask`. Each has a reason in `PORT.md`; each should
be re-argued rather than assumed when its turn comes.

# Phase 10: the feature skeleton

*Reasoning in `skeleton-plan.md`. Numbering continues from Phase 9's 53.
Phase 9's Tasks 48–50 come first — they are in flight.*

**The rule for every task here:** a skeleton task ships something a person can
DO. Not a screen that says it will be possible. `tabs.ts`'s law holds — what is
not built is not drawn.

---

## Phase 10a — the five foundations

## Task 54 · **Sonnet**: Creation, audited
**Description:** Arturo's word is *"CORRECTLY"*, capitalised. Creation is built
and multiclass works; nobody has checked it against the book end to end. This is
an audit that produces tests, not a rewrite.
**Accepts:** a table of every creation rule checked, each pass/fail cited; each
failure either fixed or filed with a reason. **Scope:** M · **Deps:** none

## Task 55 · **Opus**: Arriving mid-fight
**Description:** *Revised — this was going to invent an Encounter/Group split.
V1 already solved it: `joinCombat(combat, arrival)`.* V2 cannot add anything to
a running fight, because `openActs` always begins with `clear`. Port the
arrival, and the Group falls out of it: an Encounter **replaces** the table, a
Group **joins** it, and both are the same entries expanded the same way.
**Accepts:**
- [x] Creatures join a fight already running, in the right place in the order
- [x] A prepared encounter can either replace the table or join it
- [x] Existing encounters and fights fold forward untouched
- [x] *Found while building: an arrival was silently stealing the current turn*
**Verification:** fold tests for arrival mid-round; a journey that adds a group
to a running fight · **Scope:** M · **Deps:** none — **blocks 49, 53, 65**

## Task 55b · **Opus**: The encounter builder V1 had
**Description:** V2's builder is 151 lines to V1's 402 and **its own header
lists what it dropped.** Together the drops are why Arturo says V1's system was
more complete.
**Accepts:**
- [ ] Creature initiative is rolled by the app, once per group, and the party
      joins the order — *"a hidden DM roll, squarely in the app's half of the
      labour"*
- [ ] Average or rolled hit points, per group (`hpMode`)
- [ ] Kind and CR-band piles in the builder — *"something undead, and not too
      hard"*. **This overturns Task 47's drop of the bands.**
- [ ] The gauge is drawn, not printed as a sentence
**Verification:** domain tests on rolled HP and the initiative expansion; a
journey that builds by browsing rather than searching
**Scope:** L · **Deps:** 55

## Task 56 · **Opus**: V1's combat system
**Description:** *Revised — a port, not a design job.* V1's `combat.ts` is 579
lines to V2's 286, and the missing half is one coherent system: `Economy`
(action/bonus/reaction **per creature**), `movementLeft`, `hasReaction`,
`surprised`/`isSurprised`, `controls`, `mayEndTurn`, `turnsUntil`, and
`advance`'s resets. Plus `actions.ts` (166) on top.

Building these as five separate V2 inventions is five chances to get the seams
wrong. **Tasks 63 (legendary) and 64 (lair) fold in here** — V1 holds them in
the same `Combat` record, per round, with a DM-stated budget where the book is
silent. 702 shipped creatures have legendary actions.

The one real translation: V1 holds `Combat` as a struct it mutates; V2 folds it
from acts. Say so in a comment wherever that changes a shape.
**Accepts:**
- [ ] A creature's turn shows what it has spent and what remains
- [ ] Ending a turn restores it; a reaction survives into others' turns
- [ ] Nothing auto-spends — the DM says what happened
**Verification:** domain tests per economy rule; a journey through a full round
**Scope:** L · **Deps:** none — **the largest unblocker in this phase**

## Task 57 · **Opus**: A player's turn
**Description:** Task 56's model on the player's `Fight.tsx`, which is V1's
two-state screen and today can swing an attack and name nothing else.
**Accepts:** a player sees what their turn still holds, and what each option
costs · **Scope:** M · **Deps:** 56

## Task 58 · **Opus**: The claim seam, reversed
**Description:** V2's claim runs player → DM. Every roll-request feature wants
DM → player. Same seam, arrow turned round. V1's `checks` (51) is the model, and
`nudge.ts` has been waiting for it in writing.
**Accepts:**
- [ ] The DM asks one player, several, or the table for a roll
- [ ] Each answer arrives back attributed, and the DM sees who has not answered
- [ ] It nudges, because `nudge.ts` already says this is one of the three
**Verification:** domain test on the ask/answer fold; a room journey across two
devices · **Scope:** L · **Deps:** none

## Task 59 · **Sonnet**: The roll prompt
**Description:** The BG3-style arrival: the ask lands on the player's screen as
a thing to answer, not a line in a log.
**Accepts:** it interrupts, it says who asked and what for, it is dismissible,
and dismissing is itself an answer the DM can see · **Scope:** M · **Deps:** 58

## Task 60 · **Opus**: The purse, and moving a thing
**Description:** One mechanism serves three of Arturo's lines — player-to-player
sharing, the DM granting or taking, and buying. Phase 9's Task 53 is the same
work; **this replaces it.** V1's rule on splitting travels: *"an even split
only; the remainder stays in the stash."*
**Accepts:**
- [ ] A player gives another player some of a stack
- [ ] The DM adds or removes items and currency from anyone
- [ ] Coins are a purse, not words — `EncounterEditor`'s prose rewards can stay
**Verification:** domain tests on transfer and split; a two-device room journey
**Scope:** L · **Deps:** 55

## Task 61 · **Opus**: Spells on the sheet
**Description:** The largest hole in the player experience. Spells run all
through creation and stop there — a wizard is built with them and cannot
prepare, cast or spend a slot. A fourth sheet tab. `casting.ts` and
`creation/spells.ts` hold the rules already, so this is a reading, the way Task
46 was.
**Accepts:**
- [ ] Prepared versus known, per the class's own rule
- [ ] Casting spends the right slot, and a rest restores it
- [ ] A pact slot comes back on a short rest
**Verification:** domain tests per casting class; a journey that casts and rests
**Scope:** L · **Deps:** Phase 9's Task 51 (class resources) for the slot pool

## Task 62 · **Sonnet**: Experience, and who holds the key to a level
**Description:** `encounter.ts` computes what a fight is worth; nothing receives
it, and levelling is the player's own button. Arturo wants it at the DM's
discretion — *"exp or milestone"*, so both.
**Accepts:**
- [ ] The DM awards experience, or grants a level outright
- [ ] A player's level-up unlocks when the DM says, not before
- [ ] Milestone needs no numbers at all
**Verification:** domain test on the award fold; a journey where a level unlocks
**Scope:** M · **Deps:** none

### Checkpoint G — the foundations
- [ ] Each of the five unblocks its cluster; `npm run verify` clean; deployed
- [ ] **Play a session here.** Six of the tasks below are guesses until then.

---

## Phase 10b — the consequences

*(Task 63, legendary actions, shipped inside Task 56 — V1 keeps them in the
same record and so does this. **Task 64, lair actions, is still open:** the
count they fire on lives in the detail file, and the fight only carries the
index's boolean, so the number has to be plumbed before anything can watch
for it.)*

## Task 65 · **Sonnet**: A goblin with a name and a different axe
Deriving from an existing statblock, which is a different and easier thing than
Task 49's homebrew-from-blank — and probably the one a DM actually does.
**Accepts:** a derived creature stages and fights like any other, and says what
it came from · **Scope:** M · **Deps:** 55

## Task 66 · **Opus**: An NPC with a whole statblock
The other half of *"as simple as V1's NPC creator or a whole character-like
statblock"*. `npc.ts` does the simple half.
**Accepts:** an NPC can be staged into a fight · **Scope:** M · **Deps:** 65

## Task 67 · **Sonnet**: Buffs and debuffs the DM invents
V1's `boons` (103). `conditions.ts` is the SRD's fifteen and fixed.
**Accepts:** a made-up effect shows on the sheet and says what it does, like a
condition does · **Scope:** M · **Deps:** none

## Task 68 · **Sonnet**: Things that get used up
A rope is an item; a torch should be a torch you can burn. `qty` already exists.
**Accepts:** a consumable is spent from the sheet and the count follows
**Scope:** S-M · **Deps:** none

## Task 69 · **Sonnet**: Press and hold
Today's explanations are `title=` attributes — hover tooltips, inert on a touch
screen, which is the only screen a player uses.
**Accepts:** press-and-hold explains any number on the sheet, and says where it
came from · **Scope:** M · **Deps:** none

## Task 70 · **Sonnet**: A selector that suggests
*"Better creature selector."* Today it is name-and-type with a CR ceiling. The
party's real levels are already in the app and `encounter.ts` already bands a
fight.
**Accepts:** "something for four level-3s" is one control, not arithmetic
**Scope:** M · **Deps:** none

### Checkpoint H — the skeleton stands
- [ ] Every line of Arturo's list is either done, or a stated deliberate drop

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

## Task 55 · **Opus**: An Encounter and a Group are different things
**Description:** The one new modelling decision — see the plan. `Entry` is
shared; an Encounter is prepared and survives, a Group is made now and dies with
the fight. A Group can be thrown onto a running fight; an Encounter replaces one.
**Accepts:**
- [ ] A group of creatures can be made and staged without touching prep
- [ ] A group can be added to a fight already running
- [ ] Existing encounters fold forward untouched
**Verification:** fold tests both kinds; a journey that adds a group mid-fight
**Scope:** M · **Deps:** none — **and it blocks 49, 53 and 64**

## Task 56 · **Opus**: The turn economy
**Description:** V1's `actions.ts` (166). `PORT.md`: *"needs the turn economy,
which V2 has not built"*, and `stance.ts` names the same hole from the other
side. Action / bonus action / reaction / movement, and what is left of each.
The DM's fight first, because that screen already works.
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

## Task 63 · **Sonnet**: Legendary actions, in the fight
`content/legendary.ts` already resolves the options and holds `mayTakeOne` with
the right rule — never on its own turn. Nothing calls it.
**Accepts:** the DM is offered them between turns, never on the creature's own,
and the budget is spent down · **Scope:** S-M · **Deps:** 56

## Task 64 · **Sonnet**: Lair actions, on the count
Task 46 renders `{at: 20, text}`. Nothing watches initiative count 20.
**Accepts:** it arrives on its count and is dismissible — *"unless the DM
ignores it"* · **Scope:** S · **Deps:** 56

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

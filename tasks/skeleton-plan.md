# The feature skeleton

*Arturo's target feature set, mapped against what is actually in the code on
2026-09-04. Tasks in `skeleton-todo.md`. This does not replace `gap-plan.md` —
Phase 9's Tasks 48–53 are still open and six of them appear in this list too;
the merge is in "Order" below.*

## What this document is for

Arturo gave twenty-two lines of "what I want to see", noting *"some of them we
already have in some way."* The value here is not restating them. It is saying,
line by line, **what is actually behind each one today** — because three of
these are done, nine are half-done in a way that looks done from the outside,
and the rest collapse onto five foundations that do not exist.

The audit below is from reading the code, not from the roadmap. Where a claim
disagrees with `PORT.md`, the code won.

---

## Players

| Want | State | What is actually there |
|---|---|---|
| Guided creation at any level, multiclass | **Built** | `creation/` + `multiclassing.ts`. Journeys cover a level-7 fighter/wizard in one pass and a fighter joining at 8 with three improvements. "Correctly" is the open half — see Task 54. |
| Manage **inventory and equipment** | **Built** | `carried.ts`, `Inventory.tsx`, `Pack.tsx`, equip/unequip moves AC. |
| Manage **spells** | **Not built** | Spells exist all through *creation* (`creation/spells.ts`, `casting.ts`) and nowhere on the sheet. The sheet has three tabs — Overview, Inventory, Attacks. **A wizard can be built with spells and then cannot prepare, cast or track a slot.** |
| View own sheet | **Built** | `Sheet.tsx`. |
| Press and hold for explanations | **Not built** | There are `title=` attributes, which are hover tooltips and do nothing on a touch screen. Conditions explain themselves in a drawer; nothing else does. |
| Share items with party members | **Not built** | No transfer of any kind. `qty` exists on a carried stack, so the data can express "give 3 of 5"; nothing moves it between characters. |
| Level up at the DM's discretion (XP or milestone) | **Not built** | Level-up is **player-initiated** — a button on their own sheet. `Hero.tsx` says it plainly: *"no experience is tracked anywhere."* `encounter.ts` computes what a fight is worth and nothing receives it. |
| Notes | **Not built** | Phase 9 Task 52. |
| Log of actions by and against them | **Built** | `LogScreen.tsx`, and it already reads differently per person. |
| Guided combat, V1's action tracking and options | **Not built** | `PORT.md`: `actions` (166 lines) *"needs the turn economy, which V2 has not built."* The player's `Fight.tsx` is V1's two-state screen and can swing an attack; it cannot tell you what else a turn contains. |
| BG3-style popup when the DM asks for a roll | **Not built, and named** | `nudge.ts` lists three moments worth buzzing for and says of the third: *"the DM has asked YOU for a roll — needs the claim seam to run the other way and is not built."* |
| Pack contents as consumables on the inventory | **Half** | Packs unpack into real things with quantities (there is a journey: *"what a character chose in words becomes a thing they are holding"*). Nothing is *spendable* — a rope is an item, a torch is not a torch you can burn. |

## DM

| Want | State | What is actually there |
|---|---|---|
| Create encounters | **Built** | `encounter.ts`, `EncounterBuilder`, `EncounterEditor`, difficulty gauge, send-to-combat. |
| Better creature selector | **Half** | Search over 6,633 exists in two places now (staging, and Task 47's Book). It is a name-and-type search with a CR ceiling — no "show me something for four level-3s". |
| Add or hide creatures from an encounter | **Built** | The disclosure ladder, per creature: hidden → present → vague → exact. |
| **Separate Encounters from Creature Groups** | **Not built — new modelling** | Today `Encounter` is one thing. This asks for two. See "The one new distinction". |
| Custom creature from an existing statblock | **Not built** | Phase 9 Task 49 is homebrew *from blank*. "Give a goblin a name and a different weapon" is a **derive**, which is a different and easier thing — and probably the one a DM actually does. |
| Create NPCs, simple or full statblock | **Half** | `npc.ts` + `NpcDepth.tsx` (Task 41) do the simple half well. The "or a whole character-like statblock" half does not exist. |
| Homebrew items as real items | **Built** | Task 21. A made-up breastplate is carried, worn, and moves the AC — there is a journey for exactly that. |
| DM adds/removes items | **Not built** | Same missing seam as player-to-player sharing. |
| DM adds/removes currency | **Not built** | There is no purse. `money.ts` ported `formatPrice`/`parseCoins` and left the purse behind; `EncounterEditor` stores rewards as *words* ("25 gp, a potion") on purpose, because there is nothing to put coins into. |
| Custom buffs and debuffs | **Not built** | `conditions.ts` is the SRD's fifteen, fixed. V1's `boons` (103 lines) is the missing piece and `PORT.md` calls it purely additive. |
| Ask for rolls — one player, some, or all | **Not built** | The same reversed-claim seam as the BG3 popup. V1's `checks` (51 lines) is the model. |
| Run creatures the way players run characters | **Not built** | Blocked on the turn economy, like the player half. |
| Lair actions on a count | **Data only** | Task 46 parses and renders `{at: 20, text}`. Nothing in the fight watches initiative count 20. |
| Legendary actions during player turns | **Data only** | `content/legendary.ts` resolves the options *and* has `mayTakeOne` with the right rule (never on its own turn). Nothing in `fight.ts` calls it. |

---

## Arturo's correction: V1's encounter and combat systems were more complete

*Added after he said "Look at V1 encounters… that system was more complete" and
"same thing with the combat." He is right, and the numbers are not close.*

### Combat: 579 lines in V1, 286 in V2

V1's `domain/combat.ts` against V2's `features/dm/fight.ts`. V2 has the roster,
the disclosure ladder, initiative, damage and conditions. **Everything below is
in V1 and absent from V2:**

| V1 | What it is |
|---|---|
| `Economy` + `spent` | Action / bonus / reaction **per creature**, cleared when its turn opens. V1's note: before it, *"a DM running six goblins tracked 'has that one used its bonus action' in their head, six times, every round."* |
| `joinCombat(combat, arrival)` | **Arriving mid-fight.** This is exactly Arturo's "creature group added to an established encounter" — V1 already solved it and V2 cannot do it at all: `openActs` always begins with `clear`. |
| `legendarySpent`, `legendaryBudget`, `legendaryOptions` | Wired into the fight, per ROUND, with the DM able to state a budget the book omitted. V2 parses legendary options and calls `mayTakeOne` from nowhere. **702 shipped creatures have them.** |
| lair state + `lairAction` | Fires on its initiative count, tracked per round. V2 renders the text and watches no count. |
| `surprised` + `isSurprised` | Surprise rounds, called for one SIDE. V2 has no concept. |
| `movementLeft`, `moved`, `speed` | Feet per round. |
| `hasReaction`, `ReactionOffer` | Reactions offered on other people's turns. |
| `StanceTag` (`dodging`/`helped`/`hidden`) | What `rules/5e/stance.ts` already names as its own missing half. |
| `controls`, `mayEndTurn` | Who may act, by seat. |
| `turnsUntil` | "You are three turns away." |

### Encounters: V1's builder is 402 lines, V2's is 151

V2's `EncounterBuilder.tsx` **documents its own drops in its header** — they
were deliberate, and together they add up to the less complete system Arturo is
describing:

- **Initiative is not rolled for creatures.** V1's `dropIntoInitiative` rolls
  each group once and puts the party in the order too: *"monster initiative is a
  hidden DM roll, which the design notes put squarely in the app's half of the
  labour."* V2 stages everything at `initiative: null` and the DM types every
  number by hand.
- **No `hpMode`.** V1 offers average or rolled per group, because *"2d6 per
  goblin is a minute of nothing during a session and one tap beforehand, and it
  makes 'the one on the left is nearly down' a true statement."*
- **No visual gauge.** V1 draws budget ticks and a pin; V2 prints the working as
  a line of text.
- **No kind/CR-band piles in the builder.** V1's argument is specifically about
  building rather than looking up: *"building an encounter is usually the other
  way round — 'something undead, and not too hard'."* This is the same filter
  Task 47 dropped from the Book; **that drop is now overturned.**
- **No XP award.** V1 puts "Award N XP" in the builder, raw never adjusted, with
  the per-character split beside it.

### What this changes

**Task 55 was going to invent an Encounter/Group split. It should port
`joinCombat` instead** — V1 already models arrival mid-fight, and "a Group" is
then just entries staged without a `clear`.

**Task 56 stops being a design job and becomes a port.** V1's turn economy,
legendary, lair and surprise are one coherent system that already works
together; building them as five separate V2 inventions would be five chances to
get the seams wrong. Tasks 63 and 64 fold into it.

**The rule stands: read V1's file in full, and argue in a comment wherever V2's
event-sourced shape makes a V1 shape wrong.** V1 holds `Combat` as a mutable
struct; V2 folds it from acts. That is the one real translation.

## The five foundations

Fourteen of the twenty-two lines above are not independent features. They are
consequences of five things that do not exist. Building them in any other order
means building each consequence twice.

**1. The turn economy.** *(unblocks: guided combat, action options, running
creatures like characters, legendary actions, lair actions)*
V1's `actions.ts`, and `stance.ts` already names the same hole from the other
side. Everything about "what can I do right now" hangs off it.

**2. The claim seam, reversed.** *(unblocks: BG3 roll popups, ask-for-rolls,
`checks`, initiative requests)*
V2's claim runs player → DM: a player says "I hit AC 15" and the DM rules on it.
Every one of these wants DM → player: the DM asks, the player answers. It is the
same seam with the arrow turned round, and `nudge.ts` has been waiting for it.

**3. The purse and the transfer.** *(unblocks: sharing items, DM granting or
taking currency and items, the shop, loot)*
One mechanism — moving a thing from one holder to another — serves player-to-
player, DM-to-player, and buying. Phase 9's Task 53 is this.

**4. Spells on the sheet.** *(unblocks: the whole caster half of the app)*
The largest single hole in the player experience and the one nothing else
depends on, which is why it has survived this long. A fourth sheet tab.

**5. Experience, and who holds the key to a level.** *(unblocks: DM-granted
levelling, milestone levelling)*
`encounter.ts` already computes what a fight is worth. Nothing receives it, and
levelling is currently the player's own button.

---

## The one new distinction

**Encounter vs Creature Group.** Arturo:

> *An Encounter should be something the DM prepped for or a scenario. A Creature
> Group can be an on-the-fly cluster of creatures for an impromptu battle or
> addition to an established encounter.*

Today `Encounter` is a single record that is both. The distinction is real and
it is about **authorship and lifetime**, not contents:

- an **Encounter** is *prepared* — it is named, it belongs to a session, it has
  an environment, rewards and a read-aloud note, and it survives the night;
- a **Group** is *made now* — a handful of creatures with a label, staged
  immediately, and it is over when the fight is.

They share one thing (a list of creature entries with counts), which is
`encounter.ts`'s existing `Entry`. So the shape is: keep `Entry`, let an
Encounter hold entries **and** all the prepared furniture, and let a Group hold
entries and a name. A Group can be thrown onto a running fight; an Encounter
replaces one.

**This should be settled before Task 49 or 53**, because both write records that
would have to be reshaped afterwards.

---

## Order, and why

Breadth-first, because Arturo asked for a **skeleton**: every line above
reachable and honestly real, rather than four of them finished and eighteen
absent. That is a deliberate departure from the vertical slicing the earlier
phases used, and it has one rule attached so it does not become scaffolding:

> **A skeleton task ships something a person can do, not a screen that says it
> will be possible.** `tabs.ts`'s rule holds throughout — *what is not built is
> not drawn.*

1. **Finish the Book tab** (Phase 9's 48–50) — already in flight, and Task 49
   needs the Encounter/Group decision anyway.
2. **The five foundations**, in the order listed. Each is a task or two, and
   each unblocks a cluster.
3. **The consequences**, which get cheap once their foundation exists.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| The turn economy is the biggest single thing here and touches every combat screen | High | Ship the *model* with the DM's fight first, where there is already a working screen, before the player's. |
| Breadth-first invites shells that do nothing | High | The rule above. Every task's acceptance criteria name a thing a person does. |
| Encounter/Group reshapes records that already exist in logs | Medium | Events are append-only and fold forward; the new kind is additive, and the old `Encounter` keeps its shape. |
| Spells on the sheet is a whole subsystem, not a tab | Medium | `casting.ts` and `creation/spells.ts` already hold the rules — this is a reading, like Task 46 was. |

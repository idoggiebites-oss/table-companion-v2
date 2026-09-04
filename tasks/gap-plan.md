# Phase 9: what V1 has and V2 does not

*Tasks in `gap-todo.md`. Phase 8 (the DM prep workspace, `prep-plan.md`) is
parked at Arturo's call until V2 is at least V1's equal.*

## Why this exists

Arturo, testing the live app: *"why do I keep feeling that our V1 was way more
complete than V2… I thought the whole merger would bring V1 systems and
features with V2 visual coatings."*

He was right, and the numbers are not close. **Seven of V1's screens have no V2
counterpart at all** — 1,122 lines of UI — and `PORT.md`'s own *not ported*
table lists another 906 lines of domain.

## How it happened, so it does not happen again

The merger's 27 tasks were **a plan, not an inventory**. They were written from
`todo.md`'s phases rather than from a list of what V1 actually had, so anything
nobody thought to name was never scoped and therefore never missed.

`PORT.md` — the first document that enumerated the gap — was written at **R4**,
as a retirement checklist. That is backwards: it should have been the input to
the merger plan rather than its exit receipt.

And **R1, "measure what V1 is still used for", is still unchecked.** It is the
one task whose entire purpose was catching this, and the cutover went past it.

**So this phase is scoped from `PORT.md` and from a screen-by-screen diff, and
nothing goes in it because it seemed like a good idea.**

## What is missing

### Screens (1,122 lines in V1)

| V1 | lines | what it does |
|---|---:|---|
| `Homebrew.tsx` | 287 | Creature homebrew — *"the legal escape hatch… what makes the reference usable for a real campaign"* |
| `Sources.tsx` | 218 | Importing a compendium. V2 ported only the class-parsing half |
| `Reference.tsx` | 163 | Browsing 6,633 statblocks by CR and kind. V2 has the data and no way to look at it |
| `SpellLookup.tsx` | 160 | *"A player casts Hold Person and the table looks at the DM — who had the whole bestiary and not one spell"* |
| `StatblockView.tsx` | 119 | The renderer. V1 measured staging a creature keeping **17 of 57** entries across seven monsters |
| `Notes.tsx` | 93 | A player's own notes |
| `Shop.tsx` | 82 | The player side of a trader NPC |

### Domain (906 lines in V1)

`resources` (328) — *PORT.md: "the largest single gap"* · `actions` (166) ·
`boons` (103) · `spellrole` (96) · `savefrom` (95) · `roll` (67) · `checks` (51)
· the purse half of `money`, which is what blocks buying and selling · the
stash (`lootGranted`, `stashAssigned`, `stashCoinsSplit`).

## Order, and why

**The Book tab first** — Arturo's call, and the right one. It is a whole tab V1
had and V2 has none of, and it is what a DM reaches for mid-session when a
player casts something nobody remembers. It also unblocks the statblock
question, which is the sharpest single defect in the app today: a staged
creature loses roughly two thirds of its abilities, **including Multiattack on
nearly every monster in the game.**

Then `resources`, then the stash and shop.

## The rule for every task here

**V1's file is the specification.** Read it in full before writing anything —
its comments carry the reasoning, and the reasoning is what the merger was for.
Where V2's architecture makes a V1 shape wrong, say so in a comment rather than
silently porting the shape or silently dropping it.

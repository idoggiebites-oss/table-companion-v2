# What became of V1

Every module in `~/table-companion/src/domain` is accounted for here: **ported**
(the reasoning lives in V2, usually under a different name), **absorbed** (V2's
architecture makes it unnecessary), or **not ported** (with the reason, and what
it would take).

Written for R4's third criterion, and early on purpose: R1 asks which V1
features are still used at a real table, and that question cannot be answered
against a list nobody has written down.

Nothing here is deleted. V1 stays the reference for anything the port left thin.

---

## Ported — the same reasoning, in V2

| V1 module | Lines | Where it lives now |
|---|---:|---|
| `scenes` | 61 | `features/dm/scene.ts` — a place, and the one press that opens it |
| `terrain` | — | `rules/5e/terrain.ts` — minus `checkEffects` and `movementCost`, see below |
| `homebrew-item` | 198 | `features/sheet/homebrew.ts`, with a tier-4 check holding its whole point |
| `guidance` | 192 | `rules/5e/classes.ts` (sentence, complexity) and `abilities.ts` (`ABILITY_DOES`) |
| `npc` | — | `features/dm/npc.ts` |
| `recap` | 257 | `features/room/recap.ts` + `LastTime.tsx` |
| `prompts` | — | `features/room/prompts.ts` + `WhatNow.tsx` |
| `encounter` | — | `features/dm/encounter.ts` |
| `equipment` | 230 | `rules/5e/armour.ts` — `wornFrom` and `armourClass` |
| `stage` | 118 | `staging()` in `features/dm/encounter.ts` |
| `statblock`, `creature` | 210 | `features/dm/creatures.ts` |
| `attackflow` | 112 | `features/dm/claim.ts` + `features/sheet/Swing.tsx` — the claim/verdict seam |
| `stance` | — | `rules/5e/stance.ts`, and the room's effects joined it in Task 19 |
| `spellcast` | 231 | `rules/5e/casting.ts` |
| `multiclass`, `multiclassing` | 200 | `rules/5e/multiclassing.ts` |
| `subclass` | 231 | `content/subclasses.ts` |
| `starting-gear` | 170 | `content/starting.ts` + `features/sheet/carried.ts` |
| `classes-from-compendium` | 135 | `features/creation/compendium.ts` |
| `featvariants`, `feats` | 139 | `rules/5e/feats.ts` |
| `concentration` | 24 | `concentrating` on `Vitals`, and `waiting.ts` says when a save is owed |
| `rest` | 104 | the `rest` act on `Vitals`. **Thinner:** V1's preview/commit/receipt is not here |
| `money` | 84 | `rules/5e/money.ts` — `formatPrice` and `parseCoins` only; the purse half stayed |
| `marks`, `books`, `races`, `background`, `senses`, `innate`, `legendary`, `slots`, `spells`, `proficiencies`, `progression`, `abilities`, `items`, `attack`, `classes`, `non-srd`, `visibility`, `nudge`, `permissions` | — | same names, `src/rules/5e/`, `src/content/`, `src/features/room/` |

## Absorbed — V2's shape made them unnecessary

| V1 module | Lines | Why there is no counterpart |
|---|---:|---|
| `project` | 1,147 | One reducer over every event became `core/fold.ts` plus a `…From(events)` per feature. The 1,147-line switch was the thing V2 exists to avoid. |
| `events` | 584 | A single closed union of every event type became `core/types.ts` plus one act union per feature, so adding a feature does not edit a shared file. |
| `combat` | 579 | Split by concern: `fight.ts` (state), `claim.ts` (the seam), `disclosure.ts` (what a seat may be told). |
| `build` | 438 | `features/creation/model.ts` |
| `creation` | 322 | `features/creation/*` — a step list, offers, and a reducer |
| `edition` | 116 | V2 ships one edition's rules and reads provenance off the compendium (`content/source.ts`). The 2014/2024 switch is not modelled. |

## Not ported — and what each would cost

Each is absent because the thing it reads does not exist in V2, or because V2
draws a line V1 did not. None is an oversight.

| V1 module | Lines | Why not, and what it needs |
|---|---:|---|
| `resources` | 328 | V2 tracks hit dice and nothing else. Class resources need a recharge model and a place on the sheet; `Vitals.spent` is the hook. **The largest single gap.** |
| `actions` | 166 | "What you can do on your turn." Needs the turn economy, which V2 has not built — `stance.ts` names the same gap for helped/dodging/hidden. |
| `boons` | 103 | Blessings and buffs the app holds and shows. Nothing depends on it; it is additive. |
| `checks` | 51 | "Everyone roll Perception." V2 has no screen where a check is asked for, which is also why `terrain.ts` left `checkEffects` behind. The two arrive together. |
| `roll` | 67 | Resolving a d20 the player rolled. V2's claim carries a TOTAL, not the die — which is why the recap cannot report a natural twenty. |
| `spellrole` | 96 | One word for what a spell is FOR. Authored judgement over the spell list, like `guidance`. Additive. |
| `savefrom` | 95 | Reading a saving throw off a monster's action. Needs the DM-side attack flow. |
| `editask` | 77 | "Can I re-roll?" — V2 answers this with undo, which is the whole log's shape. Arguably absorbed. |
| `terrain.checkEffects` | — | No check screen to feed. |
| `terrain.movementCost` | — | A V2 combatant has no speed to halve. |
| `money.formatCoins` / `canAfford` / `splitCoins` | — | No party purse. Blocks V1's `Shop.tsx` buying and selling. |

---

## What this says for R1

The question R1 asks the DM is not "is V2 finished" — it is **"is anything in
the *Not ported* table something you actually used?"** If the answer is no, the
cutover is a switch. If it is `resources` or `actions`, those are real work and
should land before V1 is frozen rather than after.

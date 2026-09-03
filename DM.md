# The DM side

Everything so far has been one person looking at one character. The DM is a
different problem: **six statblocks, the fiction, the plan for tonight, and
five people waiting.** A surface that serves the player well can serve the DM
badly, and the difference is not decoration — it is what the screen is *for*.

A player's screen exists to help one person understand one thing.
A DM's screen exists to stop five people waiting.

These extend the eight laws in **VISION.md**; they do not replace any of them.
Where a law already settles something, it is cited rather than restated.

---

## What the laws already settle

- **Law 2** already makes combat two-sided: *a player claims; the DM confirms.*
  That is not politeness. A player who could apply their own damage would learn
  a creature's armour class by trial.
- **Law 3** already says the log reads differently per person.
- **Law 4** already refuses the map: no tokens, no reach, no cover, no line of
  sight. Positions live on the table.
- **Law 6** already refuses to state what cannot be stood behind.

So the DM side inherits a claim seam, a per-reader log, no map, and a
disposition against invented precision. What follows is what those imply once
somebody is running the other half of the table.

---

## 1. Control and disclosure are orthogonal

Two separate questions, and conflating them is the bug: **who may act for this
thing**, and **what may be seen of it**.

One rule covers every case — *whoever controls the active combatant may end its
turn, and the DM may always advance*. That handles a player character, a
monster, and a druid's summoned wolf without a special case, because ownership
is a **field on the combatant** rather than something implied by what kind of
thing it is.

The DM may run a creature the players can see everything about, or one they
cannot see at all. Neither follows from the other.

## 2. Disclosure is per creature, and set before it matters

Four levels: **hidden, present, vague, exact.** Chosen when the fight is
staged, changeable at any time, and never a global setting — the ogre in the
open and the thing in the dark are in the same fight.

**Vague is a word, not a meter.** The game supplies the vocabulary — *bloodied*,
*hurt*, *unhurt* — and a bar would imitate a precision the player is not meant
to have. A half-full bar is a number; "bloodied" is what the table would say.

## 3. The log has an audience, not just events

Every device replays the same events — that is what makes undo work across a
table — but *"everyone replays the same events"* was quietly taken to mean
*"everyone reads the same events"*, and a player's screen printed the DM's
prep: the villain just written down, the creature waiting next door, every
point of damage a monster had taken.

**That undoes the ladder from behind.** The initiative track can hide a
creature's hit points as carefully as it likes while the log two tabs away
announces them.

The rule is about the **audience, not the actor**: a thing the table would see
happen is public, and a thing the DM did alone is not. Damage a player dealt is
public because they rolled it out loud. A creature quietly losing hit points is
not.

## 4. Permissions prevent accidents, not attacks

This is **not a security boundary.** Everyone holding a room token is a person
at the table, and the log is trusted among them — a member who wanted to forge
an event could. What permissions prevent is the wrong sheet edited, two people
applying the same hit, a player quietly topping up their own hit points without
anyone seeing.

So the default is deliberate and generous: **the DM applies damage and healing
to anyone**, because waiting for a player to find the right field mid-combat is
slower than the DM typing it while narrating, and speed is the point. That is
only acceptable because every change is **attributed and reversible**.

If attribution or undo is ever not true of a DM action, the permission has to
narrow instead.

## 5. Speed behind the screen, understanding in front of it

The player's screen may spend a tap on teaching — *"Advantage: the goblin is
prone"* — because that player is doing one thing and has a moment.

The DM is doing six. Their screen is measured in **taps per minute**, and every
control is one press from the initiative track. Not a menu, not a drawer inside
a drawer. Where the two goals conflict on the DM's side, **speed wins**, and
the teaching moves to the recap afterwards.

## 6. Hold what the DM cannot

The app earns its place by remembering what a human running a dragon drops.

**Legendary actions are the most-forgotten thing on a statblock** — three a
round, spent after somebody *else's* turn, back at the start of the creature's
own. The usual outcome is that the dragon never uses them at all. 702 of the
shipped creatures have them.

**A lair action is the same shape one layer out**: it belongs to the *place*,
it fires on initiative count 20, and it is nobody's turn — which is why it
lives on the fight rather than on a combatant.

Concentration, ongoing saves, and whose reaction is spent are the same class of
thing. This is the DM side's whole argument for existing.

## 7. Never be the DM's boss

**No session pacing. No difficulty warnings beyond the arithmetic asked for.**
The encounter builder shows its working and lets the DM decide.

Difficulty is **optional**: pass a party and you get a band, pass nothing and
you get totals. The arithmetic worth automating is summing experience across
instances — what nobody enjoys and nobody gets wrong twice. The thresholds and
the multiplier are Dungeon Master's Guide content and live in the one
non-SRD file, so the app still runs without them.

## 8. Interruptions are earned

A companion that needs watching gets put face-down. **Three moments buzz**, and
all three are somebody being waited for:

- your turn has come round
- initiative is being rolled and yours is not in
- the DM has asked *you* for a roll

Nothing else. Not damage, not a fight ending, not somebody else's turn.

## 9. The active row is luminance, never a hue

Red already means damage here. A coloured "current turn" marker is one glance
away from a creature that is nearly dead two rows down. The row that is up sits
on a raised ground with a bright edge; everything else dims. (Law 8, applied to
the one screen where a mistake costs the most.)

---

## What the DM side is not

- **Not a battle map.** Law 4 stands: no tokens, no grid, no reach, no line of
  sight. If a rule needs a position to resolve, the table resolves it.
- **Not a rules engine.** The app suggests a verdict and the DM overrules with
  one tap. A shield spell, a cover rule, a ruling made at 11pm — the app has
  never heard of them and must not fight them.
- **Not a monster editor first.** Homebrew statblocks are slice 9. A fight
  needs to *run* before it needs to be authored.
- **Not a second app.** Same log, same undo, same room. The DM's screen is a
  different reading of the same events — not a different store.

---

## The shape, from the concept

Settled by the DM screen concept, in both themes.

**Tablet and desktop first, responsive down to mobile.** This inverts what the
app has been: every screen so far is phone-first, `Shell` is five declared
rows at `100dvh`, and there is not one media query in the codebase. The DM's
surface is the opposite problem — three columns of things that must all be
visible at once, collapsing to a stack only when there is no room.

**Five tabs**, distinct from the player's bottom bar: Combat, Party, Prep,
Notes, Log.

**Three columns in Combat.** Left, the party and the initiative order, each row
carrying portrait, level and class, hit points, armour class, and the effects
on them. Middle, the fight: the round and whose turn, the active combatant in
full, their quick actions, the current target, and the room. Right, what the
DM prepared — monsters with their page references, encounter notes,
objectives, treasure, and the battle log.

**The room is a first-class thing**, and it is law 4 exactly: "Open Ground",
described in a sentence, with what is true for *everyone at once* as chips —
dim light, difficult terrain, no cover, windy. Not a map. Not per-token cover.

**Transport controls on the round** — back, pause, forward — and `END ROUND`.

**Mobile keeps the fight and loses the columns**: round bar, now/then, the
active combatant, quick actions, the target, the turn order, and a bottom bar
of the three things a DM presses most.

---

## Where the concept and these principles disagreed

Three were settled; the rest stand.

**A claim comes from the player's device.** Merlin's player rolls, types 17,
and it crosses the room; the DM's screen shows it with a suggested verdict and
`APPLY DAMAGE` confirms. Laws 1 and 2 are load-bearing, not ornamental — the
DM typing what they were told would retire the seam that stops a player
learning armour class by trial.

**`CLEAR` marks as read.** It collapses what has been seen so the DM's view
stays short. The events stay in the log, still undoable, still replayable
everywhere. The control gets the name of what it does.

**The DM drives a character when they need to, and nothing checks.** This was
settled the other way first — only when nobody holds the character — and then
reversed, because the check needs to know who is present and *knowing that is
not worth what it costs*. V1 reached the same place and said so plainly:

> This is not a permission: the DM can still seat anyone, and nothing stops a
> determined person clearing storage. It stops the accident, which is the
> thing that actually happens at a table.

Law 4 already says permissions here prevent accidents, not attacks. A device
is offered only the characters it claimed, which stops a player opening
somebody else's sheet by mistake; the DM is offered everyone, because a DM
picking up an absent player's character is the case that actually costs a
table time. Two people reaching for the same character is a thing a table
settles by speaking.

## Legendary and lair actions are in

The concept has no surface for either, and that is the one gap that would
undercut principle 6. **702 shipped creatures have legendary actions** — three
a round, spent after somebody *else's* turn, refreshed at the start of the
creature's own. It is the most-forgotten thing on a statblock, and the usual
outcome at a table is that the dragon never uses them at all. Holding what the
DM cannot hold is the reason this side of the app exists; a fight screen that
drops them is a prettier version of the paper it replaced.

V1's `domain/legendary.ts` is a complete and careful port target:

- **The budget is read, not assumed.** Books print it three ways — a heading
  `Legendary Actions (3/Turn)`, or the whole sentence *"can take 3 legendary
  actions"*. Some creatures get two.
- **The header is not a thing to do.** Nor is `Lair`, `Regional Effects`, or
  `Black Dragon Treasures` — the compendium files those beside the real
  options, and a DM tapping one expecting a tail attack is the app wasting
  their turn. Most of the module is telling them apart.
- **Cost is parsed.** `(Costs 2 Actions)` and `(3 Actions)` both appear; a
  missed one is a dragon getting three tail attacks for the price of one.
- **Never on their own turn.** `mayTakeLegendary` refuses it — the mistake in
  the other direction gives a dragon four actions instead of one.
- **Spent counts per round, not per turn**, because that is how the rule
  reads: they return at the start of the creature's turn, and between those
  two moments the count only goes down.

A lair action is the same shape one layer out: **it belongs to the place, not
to a creature**, so it lives on the fight rather than on a combatant, and it
fires on initiative count 20 — read from the text rather than hardcoded,
because a handful of creatures use a different count.

That last point decides a piece of the screen: **initiative count 20 is a row
in the order that is nobody's turn.** The lair gets a place in the list, which
is the only way a DM reliably remembers it exists.

Both are interruptions the DM did not ask for, so principle 8 applies — they
are two of the earned moments, offered where the turn already is rather than
as a modal.

## How V1 did it, and why it could not do it well

V1 lets the DM jump into any seat at any moment, with no ceremony at all. The
seat is a dropdown in the status bar, and its options are:

```ts
const seatable = dmView
  ? builds                                    // the DM: the whole party
  : builds.filter((b) => myCharacters.includes(b.id) || sittingIn(b));
```

One line. A player's dropdown offers only what their device claimed; the DM's
offers everyone. Switching is instant and silent — nobody else's screen
changes, because `useSeat` writes to device storage and never to the log.

Two details worth keeping:

- **Taking a character is not claiming it.** A DM who sits in Merlin still has
  to keep Merlin in their own list or the dropdown loses the value it is
  currently displaying and strands them.
- **The DM does not act *as* the DM.** `controls(seat, controller)` says a DM
  seat controls only DM-controlled combatants, so driving a player's character
  is done by *becoming* that player, not by widening what a DM may do. Only
  `mayEndTurn` is special-cased: the DM may always advance the turn.

And V1's own file says why it stops there:

> This is not a permission: the DM can still seat anyone, and nothing stops a
> determined person clearing storage. It stops the accident, which is the
> thing that actually happens at a table.

That is an honest shrug, and it is forced. V1 keeps claims in device storage,
so **no device can know whether anybody is sitting in Merlin right now** — the
"only when nobody holds it" rule was not rejected there, it was unavailable.
Presence is what makes it implementable, which is the argument for adding it.

Keep the ergonomics: one control, instant, no confirmation, no announcement.
Change only what presence now makes knowable — a held character is not offered.

## Presence is a third kind of state

The decision above needs the DM's device to know whether Merlin is claimed —
and that is precisely the fact the architecture keeps private: *"device-local
state never enters the log. Seat, claimed characters, theme, preferences."*

It does not go in the log. A claim is not history: it is true while a phone is
awake and false when that phone is in a pocket at the bar, and an append-only
log has no way to say that. Writing claims as events would also make the
transcript of a session depend on who happened to be holding what.

So there are **three kinds of state**, not two:

| | lives in | survives |
|---|---|---|
| **History** | the append-only log | forever, on every device |
| **Device** | this device only | this device, until cleared |
| **Presence** | the room's live connection | while the connection is open |

Presence is who is connected and what they hold. It is never replayed, never
undone, and never in the transcript. When a phone dies mid-fight the claim
lapses on its own, which is the behaviour a table actually wants — the DM
picks the character up rather than being locked out by a stale event.

## Where the concept and these principles still disagree

Recorded rather than resolved, because each is a decision.

1. **Nothing on screen sets disclosure.** Principle 2 wants it per creature and
   chosen at staging; the concept shows exact hit points for everything with no
   affordance to make one hidden or vague. It may belong on the row's overflow,
   but it has to be somewhere.
2. **No advantage.** V1 computes it from conditions on both sides and shows it
   as a sentence naming every source. The concept never says it.
3. ~~**The quick actions need a second state.**~~ **Dropped with presence.**
   It only existed because the screen was going to change shape with who was
   in the room. The concept's single state is the one to build.

---

## Open, and needing a decision

1. **The two above.**
2. **One device or two?** A DM with a laptop and a phone is a real setup, and
   `seat` is already device-local — but nothing yet says what happens when the
   same person is seated twice.
3. **The name.** The concept is branded *Adventurer's Forge*; the app is
   *Table Companion*.

# What this is for

A companion for a table that is already in the room together.

Not a virtual tabletop, not a character sheet with a rules engine bolted on,
and not an attempt to run the game. Five people are sitting at a table with
dice in front of them. The app carries the bookkeeping that the table is bad
at and none of the things the table is good at.

What the table is bad at: remembering that the floor is rubble on everyone's
turn but the first, working out whether a paralysed target and a poisoned
attacker cancel out, tracking six goblins' hit points, knowing what a level-6
Blood Hunter can do, and remembering last week.

What the table is good at: everything else. Especially the parts that are the
reason anyone came.

---

# Who it serves

**The player**, often one who has played twice, holding a sheet they do not
fully understand. Everything the app knows, it says in a sentence, at the
moment it applies. "Advantage: the goblin is prone" teaches the rule while it
is being used. "Advantage" alone teaches nothing.

**The DM**, holding the fiction, six statblocks, the plan for tonight, and the
attention of everyone at the table. What they need is fewer things to hold and
no surprises.

Not two apps: one act with two faces. The seam between them is disclosure.

---

# The laws

Carried from V1 unchanged. Each has cost something to hold, and each settles a
real argument about what to build next.

**1. The app never rolls.** It names the die, holds the modifier, does the
arithmetic. The number comes from a person throwing something. Every "the app
could just…" that ends in a random number ends at this line. The recap can say
"one natural twenty, thrown by Bel" precisely *because* the app never rolled it.

**2. Nothing is applied by one person to another.** A player claims; the DM
confirms. This is not politeness — it is what keeps the disclosure ladder
standing. A player who could apply their own damage would learn a creature's
armour class by trial.

**3. What the log says depends on who is reading it.** Every device replays the
same events; that is what makes undo work across a table. Opening a place is
public. Preparing it is not.

**4. Positions live on the table.** No map, no tokens, no reach, no cover, no
line of sight. What the app says about a roll is partial by design and never
contradicts the DM. It models only what is true for everyone at once: it is
dark, the floor is rubble, there is a gale.

**5. Everything is undoable, and undo is not deletion.** State is the replay of
an append-only log. Taking something back appends a marker naming the event to
skip, because other people have acted since.

**6. Say only what can be stood behind.** An unknown statblock lands as 1 hit
point, which is visibly wrong rather than plausibly wrong.

**7. A screen is ordered by the questions it raises**, not by the order its
features were built — that second order is invisible to whoever wrote it and
obvious to everyone else. Top to bottom: what is waiting on me, what can I do
about it, what is true right now, what am I. A card that is none of those four
does not belong on a play screen.

*And the order is also the eviction policy.* When a screen exceeds its height
budget, what leaves is the lowest of the four — reference goes into a drawer,
then live values, and so on upward. Nothing is ever bought by shrinking a tap
target or a padding. See DESIGN.md.

**8. Colour and motion are information, not decoration.** *New in V2, and the
extension of the rule V1 applied to colour alone.* Motion that delays a number
at a table is a cost. Anything that moves must be telling someone something
changed; the rest is polish, and polish is the first thing cut.

---

# What it refuses

**A battle map.** See law 4. The moment the app knows where people are
standing, the table becomes five people watching a screen.

**Rolling, automating, resolving.** See laws 1 and 2. Each saves ten seconds
and takes something the table came for.

**Being the DM's boss.** No session pacing, no difficulty warnings beyond the
arithmetic asked for. The encounter builder shows its working and lets the DM
disagree with the answer.

**Being public.** This runs for one table. That is what makes it legitimate to
ship a complete compendium with it.

---

# The seams

**Core / rules.** *Settled for V2.* There is no pluggable rules engine. 5e
lives concretely in `src/rules/5e/`, and everything above it — the log, undo,
disclosure, sync, the sheet and turn chrome — depends only on a small set of
core types. The spine is reusable; the rules are replaceable by rewriting, not
by configuration. A generic engine cannot say "the goblin is prone", and that
sentence is the whole of what the app is for.

**Prep / the table.** Everything the DM writes down is inert until they open
it. A place carries its room, whatever waits in it, and the line to read —
opening it does all three at once.

**The session / between sessions.** Inside a session: "what can I do right
now". Between them: "what happened last time". Both from the same log, read in
opposite directions.

**Shipped / imported / device-local.** Content ships with the app, a table can
bring more, and a device's own state — seat, claimed characters, preferences —
never enters the log at all.

---

# What changed from V1, and why

**The order of construction.** V1 built the spine first and the character last,
which is why its character surface became a 2,739-line component bolted onto a
mature log. V2 builds the character first. The requirement that makes this safe
is absolute: **the event log exists from the first commit**, with no server and
no room. The store is a local reducer over an append-only log on day one, and
sync arrives later as a transport, not a redesign.

**The design language.** V1 was a dark room, deliberately: near-black greens,
flat panels separated by hairlines, and *elevation is luminance, never a hue*.
V2 leads with a light theme, and that rule cannot survive on white — nothing is
brighter than `#FFFFFF`, so on light, elevation is shadow. Both themes are
real and neither is a filter over the other. See DESIGN.md.

**Nothing else.** The laws are the part that does not change, and eight of them
survived a rebuild that changed the ground colour, the build order, and the
test strategy. That is the evidence they were laws.

---

# How it would be judged

By a table that has used it for a session and forgotten it was there. Not by
feature count: by how much of the evening the app took off the table's hands
without taking any of the evening itself.

V1 was never used at a table. V2 inherits that, and inherits the choice: this
is built on prediction and one DM's feedback, which is a working method and a
deliberate one. It is named here once, as an input, and does not appear in the
plan as a blocker.

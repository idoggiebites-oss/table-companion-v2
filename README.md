# Table Companion V2

A rebuild, not a rewrite. V1 is at `../table-companion`: 41,559 lines, 218
files, twelve modules, nine of them solid. Little about the product was wrong.
What was wrong was how it got built:

- **No order.** The build plan ran to Phase 5, then "whatever surfaced".
- **No trustworthy signal.** 75 hand-rolled browser scripts, a dev server that
  died under load, and a filter that read `0 pass, 0 fail` as clean.

Everything here exists to fix those two. Neither may be re-introduced by a
decision made for any other reason.

| File | What it settles |
|---|---|
| [VISION.md](VISION.md) | The laws. What it refuses. What changed from V1 and why. |
| [DESIGN.md](DESIGN.md) | The light/dark design language, with measured contrast. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Where the seams go and the budgets that hold them. |
| [TESTING.md](TESTING.md) | Four tiers, and why silence can never read as success. |
| [PLAN.md](PLAN.md) | Eleven slices, each with a definition of done. One page. |
| [CREATION.md](CREATION.md) | Slice 3's nine screens, and where the concepts collide with the above. |
| [PORT.md](PORT.md) | What comes from V1 intact, what is rewritten, what dies. |

`PLAN.md` is one page and stays one page. V1's roadmap reached 47KB, at which
point you had to read the changelog to find the plan. The changelog is `git log`.

## Settled

- **First ship is a character, end to end** — creation, sheet, level up, one
  device, no room. Slices 0–5.
- **No rules engine; a hard seam instead.** 5e stays concrete in `src/rules/5e/`.
  Everything above it knows only core types. A generic engine cannot say
  "Advantage: the goblin is prone", and that sentence is the product.
- **Both themes, light default.** Dual tokens cost nothing at slice 0 and are
  expensive forever after.
- **The log exists from the first commit**, with no server and no room.

**DM.md** — the DM side: control against disclosure, what a player's log may say.

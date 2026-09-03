# The creation flow, extracted

A deep read of the nine supplied mockups, done as a specification rather than
an impression. Where the built screens disagree with this, the mockup wins —
that is what this file is for.

Image generation was not available in the session that wrote this, so the
user's own mockups are the source of truth. They are better than a generated
reference anyway: they are what was actually wanted.

---

## 1. The frame every step shares

| band | detail |
|---|---|
| status bar | device |
| header | back chevron left · ALL-CAPS letterspaced title centred · `?` help right |
| progress | 5–7 **dots joined by a hairline**; done and current filled gold, pending pale |
| question | **serif display**, ~28–32px, near-black, one line |
| subtitle | grey sans ~15px, one line, always present |
| content | the choice |
| detail | a white card explaining the current choice |
| actions | **Back (outline) and Continue (gold) side by side** |
| tab bar | Home · Characters · Companion · Library · More — icon over label, active gold |

**Two things the build gets wrong at frame level:**

1. **Back is a button beside Continue**, not only a chevron in the header. The
   mockup has both — the chevron for the header, a labelled Back in the action
   bar. The build has only the chevron.
2. **There is a bottom tab bar.** The build has none anywhere.

---

## 2. Per screen

### Hub — "Character Creation"
Crest at top, serif title, grey subtitle. **Four tiles in a 2×2 grid**, each
with an icon above a bold name above a two-line grey description. Then
`RECENT CHARACTERS` label with `View all` in gold, and rows of avatar · name ·
`Lv 5 • Half-Elf Rogue` · chevron.

### Ancestry
2-col grid. **Art fills the card**; the name sits *on* the image, bottom-left,
over a dark scrim. Selected: gold border + **filled gold circle check, top
right**. Below the grid, an `Elf Traits Preview` card: bold title left,
`View Details` gold right, four bulleted traits.

### Class
Vertical rows. Icon in a **rounded square well**, name bold ~17px, role grey
~14px, then **three chips** in a row. Selected: gold border, gold check right,
faint gold wash.

### Ability Scores
Segmented control of **four**: Point Buy · Standard Array · Roll · Manual —
selected is a white pill on a grey track. Then `POINT BUY` label left,
**`27 / 27` in gold** right with `Points Remaining` beneath it. Six rows:
name left, **bold value**, grey modifier, then `−` and `+` as circular
buttons. Below: `Recommended for Wizard` card — three ability circles
(INT/DEX/CON) and a **gold outline** `Apply Recommended` button.

### Background
One large white card: `Sage`, body paragraph, `You gain:` with three bullets.
Then `Suggested Story Hooks` — four tappable rows, each a bold title over a
grey line, last one `Create My Own`.

### Skills
`Choose 2 Skills` left, `1 / 2` right. Rows: **circle checkbox** left, name
with ability in parens, modifier right. Selected: gold check, and the modifier
goes **gold and underlined**. Below, a preview card: an icon, `Arcana +5`, then
`+3 Intelligence` and `+2 Proficiency` as separate grey lines.

### Equipment
Segmented: `Starting Gear` / `Gold`. `Choose a Weapon` label, then **three
cards side by side** — weapon art, bold name, dice line, properties line.
Selected: gold border. Then `Other Equipment`: bulleted names on the left,
small item images on the right.

### Spells
**Level tabs** as pills: `Cantrips` `1st Level` `2nd Level`. Below, a
**filter chip row**: `All` `Damage` `Utility` `Control` `Healing` — `All`
selected in gold. Spell rows: **coloured icon** in a well, bold name, grey
school + type, damage line. Selected: gold border + check. Footer bar:
`Cantrips Selected` left, `2 / 3` right.

### Identity
Labelled fields: Name, Pronouns (Optional), then **Age and Height side by
side**, then Appearance and Personality as taller boxes. A full-width **gold
`Inspire Me`** button with a leading icon.

---

## 3. What the build currently drifts on

Ordered by how much it changes the feel.

1. **No art anywhere.** Ancestry cards are letter placeholders; equipment and
   spells have no imagery. The mockup is image-led — `IMAGE_USAGE_PRIORITY` is
   the single biggest gap.
2. **No bottom tab bar**, on any screen.
3. **No Back button** in the action bar.
4. **No help affordance** in the header.
5. **Ancestry names sit under the card**, not on the image.
6. **No detail cards** on Ancestry (traits), Skills (breakdown) or Abilities
   (recommended) in the shape drawn — the build has a generic DetailCard.
7. **Spells have no level tabs and no filter chips.**
8. **Equipment is a list, not three cards**, and has no Other Equipment block.
9. **Background is a plain row list**, not one card plus story hooks.
10. **Counters read `2 / 2`**, not `Choose 2 Skills` + `1 / 2` split left/right.

---

## 4. What the build already has right

Carried, and not to be lost in a rebuild: the token palette and its measured
contrast; the band order; the computed step list; gold on selection and on
Continue; the 44px floor; the height budgets; typed ability entry (a
deliberate departure — the mockup's `−`/`+` was rejected by the user in
favour of typing).

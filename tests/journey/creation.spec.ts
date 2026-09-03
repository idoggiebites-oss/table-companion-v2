import { test, expect, type Page } from "@playwright/test";
import { cont, answerFirst, finish, walkTo } from "./build";

/* A character, built end to end, in the built bundle.
 *
 * These drive by STRUCTURE, not by content. The compiled compendium is the
 * published books and is never committed, so this suite must pass both with it
 * (77 ancestries) and without it (the SRD-shaped fallback, six). Only names
 * present in both — Elf, Wizard, Fighter — are ever asked for by name. */


const question = (page: Page) => page.locator("h2");
/* The sheet is reached by the one navigation now, not by a tile that repeated
   what the character's own card already did. */
const openSheet = (page: Page) => page.getByTestId("tabbar").getByRole("button", { name: "Sheet" }).click();
const steps = (page: Page) => page.getByTestId("progress").locator("> *").count();

const start = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByRole("button", { name: /Guided creation/ }).click();
  await expect(question(page)).toHaveText("Choose your ancestry");
};

test("an elf gains a lineage step that was not there before", async ({ page }) => {
  await start(page);
  const before = await steps(page);

  await page.getByRole("radio", { name: "Elf", exact: true }).click();
  await cont(page);

  await expect(question(page)).toHaveText("Which kind?");
  await expect(page.getByTestId("arrived")).toBeVisible();
  expect(await steps(page)).toBe(before + 1);
});

test("a human is just a human", async ({ page }) => {
  // With the compendium, Human groups twelve records: a base, a Variant and
  // ten Eberron dragonmarks. None of those is a way of being a human, so the
  // lineage step must not appear. An elf's seven subraces still do.
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);

  await expect(question(page)).toHaveText("Choose your class");
  /*
   * The step COUNT is no longer a proxy for this. A Human is granted an extra
   * language, so choosing one legitimately adds a Languages & Tools step later
   * in the list — a step arriving as a consequence is the design, not a bug.
   * What this test means is that Class comes straight after Ancestry, so that
   * is what it now asks.
   */
  await page.getByRole("button", { name: "Back", exact: true }).last().click();
  await expect(question(page)).toHaveText("Choose your ancestry");
});

test("builds a wizard end to end, and every choice survives a reload", async ({ page }) => {
  await start(page);
  await answerFirst(page); // ancestry
  if ((await question(page).textContent()) === "Which kind?") await answerFirst(page);

  await expect(question(page)).toHaveText("Choose your class");
  await page.getByRole("radio", { name: /Wizard/ }).first().click();
  await cont(page);

  // Level one is the common answer and costs one tap.
  await expect(question(page)).toHaveText("What level are you starting at?");
  await cont(page);

  await expect(question(page)).toHaveText("Assign ability scores");
  // Scores are typed now, not stepped.
  await page.getByRole("textbox", { name: "Intelligence" }).fill("15");
  await page.getByRole("textbox", { name: "Intelligence" }).blur();
  await cont(page);

  // Whatever remains, answered in order, until Identity.
  for (let i = 0; i < 6 && (await question(page).textContent()) !== "Who is your character?"; i++) {
    if ((await question(page).textContent()) === "Choose your spells") {
      /* Three cantrips AND six into the spellbook: a wizard chooses nine at
     first level, and creation used to ask for the three and stop. */
  await expect(page.getByTestId("counter")).toContainText("/ 9");
    }
    await answerFirst(page);
  }

  await expect(question(page)).toHaveText("Who is your character?");
  await finish(page, "Aelar Voss");

  // Back on the hub, as a character that survives a reload.
  await expect(page.getByTestId("character")).toHaveCount(1);
  await expect(page.getByTestId("hero")).toContainText("Aelar Voss");
  await page.reload();
  await expect(page.getByTestId("hero")).toContainText("Aelar Voss");
});

test("a fighter is never asked about spells", async ({ page }) => {
  await start(page);
  await answerFirst(page);
  if ((await question(page).textContent()) === "Which kind?") await answerFirst(page);

  await page.getByRole("radio", { name: /Fighter/ }).first().click();
  await cont(page);

  const seen: string[] = [];
  for (let i = 0; i < 20 && (await question(page).textContent()) !== "Who is your character?"; i++) {
    seen.push((await question(page).textContent()) ?? "");
    await answerFirst(page);
  }
  expect(seen).not.toContain("Choose your spells");
  await expect(question(page)).toHaveText("Who is your character?");
});

test("the twelve core classes survive the compendium switch", async ({ page }) => {
  // Classes carry no source line at all, so they resolve as `unknown`.
  // Filtering on "official" alone removed every one of them from the list.
  await start(page);
  await answerFirst(page);
  if ((await question(page).textContent()) === "Which kind?") await answerFirst(page);

  await expect(question(page)).toHaveText("Choose your class");
  for (const klass of ["Fighter", "Wizard", "Cleric", "Rogue"]) {
    await expect(page.getByRole("radio", { name: new RegExp(klass) }).first()).toBeVisible();
  }
});

test("a wizard is asked for its Arcane Tradition, by name", async ({ page }) => {
  // Subclasses exist only inside the class detail, as features named
  // "<Grant>: <Subclass>". They arrive as their own 20KB chunk rather than
  // the 1.5MB the class detail would cost.
  await start(page);
  await answerFirst(page);
  if ((await question(page).textContent()) === "Which kind?") await answerFirst(page);
  await page.getByRole("radio", { name: /Wizard/ }).first().click();
  await cont(page);

  // A wizard chooses at second level, so the step arrives only above level one.
  await expect(question(page)).toHaveText("What level are you starting at?");
  await page.getByRole("button", { name: "Raise Character level" }).click();
  await cont(page);
  await answerFirst(page); // where the levels went

  await expect(question(page)).toHaveText("Choose your path");
  await expect(page.locator("h2 + p")).toHaveText("This class calls it an Arcane Tradition.");
  await expect(page.getByRole("radio", { name: /School of Evocation/ })).toBeVisible();
});

test("a level-seven fighter/wizard, in one pass", async ({ page }) => {
  await start(page);
  await answerFirst(page); // ancestry
  if ((await question(page).textContent()) === "Which kind?") await answerFirst(page);

  await page.getByRole("radio", { name: /Fighter/ }).first().click();
  await cont(page);

  // Seven levels to place, so a step arrives that a level-one character never sees.
  await expect(question(page)).toHaveText("What level are you starting at?");
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Raise Character level" }).click();
  await cont(page);

  await expect(question(page)).toHaveText("Where did those levels go?");
  await expect(page.getByTestId("counter")).toHaveText("7 / 7");
  await page.getByRole("button", { name: "Add a class" }).click();
  await page.getByRole("radio", { name: /Wizard/ }).first().click();
  // A level for the new class comes out of the first, so the total never drifts.
  await expect(page.getByTestId("counter")).toHaveText("7 / 7");
  await cont(page);

  // Whatever the content can actually offer, answered in order. A Path step
  // appears only where there are paths to offer; it is never a dead end.
  /* Not a fixed count: the list grew when the builder learned about fighting
     styles, proficiencies and the improvements a level-7 character has passed. */
  await walkTo(page, "Who is your character?");
  await finish(page, "Bel Harrow");

  // On the hub, as a level-7 character with two classes.
  await expect(page.getByTestId("hero")).toContainText("Bel Harrow");
  await expect(page.getByTestId("character")).toContainText("LEVEL");
  await expect(page.getByTestId("character")).toContainText("7");
  await expect(page.getByTestId("character")).toContainText("Fighter");
});

test("a fighter is asked how they fight, and a wizard never is", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Fighter/ }).click();
  await cont(page);

  const titles = await page.getByTestId("progress").locator("> *").evaluateAll(
    (els) => els.map((e) => (e.textContent ?? "").trim()),
  );
  void titles;

  // Walk to it rather than asserting a fixed index: the step list is computed.
  await walkTo(page, "How do you fight?");
  await expect(question(page)).toHaveText("How do you fight?");
  // Grouped by the book that printed each, the way paths are.
  await expect(page.getByTestId("choices").first()).toBeVisible();
});

test("a fighter's equipment is the four lines the book gives them", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Fighter/ }).click();
  await cont(page);

  await walkTo(page, "starting equipment");
  await expect(question(page)).toContainText("starting equipment");

  /* The table this replaced held three weapons for four classes and a
     longsword for everyone else. A count is the assertion that could not have
     passed against it. */
  const lines = page.getByTestId("quota");
  expect(await lines.count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await answerFirst(page);
  await expect(question(page)).not.toContainText("starting equipment");
});

test("what a character chose in words becomes a thing they are holding", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Fighter/ }).click();
  await cont(page);

  let carried: string[] = [];
  for (let i = 0; i < 12; i++) {
    const q = (await question(page).textContent()) ?? "";
    if (q.includes("Who is your character")) break;
    if (q.includes("starting equipment")) {
      // The row's text carries its unticked bullet; the name is what follows.
      carried = await page.getByTestId("quota").first().getByRole("checkbox")
        .evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/^[·\s]+/, "").trim()));
    }
    await answerFirst(page);
  }
  await finish(page, "Bel");

  await openSheet(page);
  await page.getByText("Inventory", { exact: true }).click();
  const list = page.getByTestId("inventory");
  await expect(list).toBeVisible();

  /*
   * Creation records the book's own words — "Chain mail" — because resolving
   * "two martial weapons" into item records is the player's decision. The
   * sheet resolves them against the catalogue, so what was a phrase is now a
   * thing with a weight and a place on the body.
   */
  expect(carried.length).toBeGreaterThan(0);
  await expect(page.getByTestId("slots")).toContainText("Main hand");
  await expect(list).toContainText("Carry weight");
  // The first line's option, as the catalogue names it rather than the book.
  const first = carried[0]!.replace(/^\W+/, "").split(",")[0]!.trim();
  const word = first.split(/\s+/).at(-1) ?? first;
  await expect(list).toContainText(new RegExp(word, "i"));
});

test("a fighter who takes chain mail is worth eighteen, not twelve", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Fighter/ }).click();
  await cont(page);

  for (let i = 0; i < 12; i++) {
    const q = (await question(page).textContent()) ?? "";
    if (q.includes("Who is your character")) break;
    if (q.includes("starting equipment")) {
      /* Answer the armour line by NAME rather than by position, then let the
         helper fill the rest — the point of the test is the armour. */
      const lines = page.getByTestId("quota");
      for (let g = 0; g < await lines.count(); g++) {
        const pool = lines.nth(g);
        const mail = pool.getByRole("checkbox", { name: /chain mail/i });
        const shield = pool.getByRole("checkbox", { name: /shield/i });
        if (await mail.count()) await mail.first().click();
        else if (await shield.count()) await shield.first().click();
        else {
          const first = pool.getByRole("checkbox").first();
          if (!(await first.isDisabled())) await first.click();
        }
      }
      await cont(page);
      continue;
    }
    await answerFirst(page);
  }
  await finish(page, "Bel");
  await openSheet(page);

  /* Chain mail is 16 and ignores Dexterity; a shield adds 2. The sheet
     derived 10 + Dex for everyone before this, so a knight showed 12. */
  await expect(page.getByTestId("vitals")).toContainText("18");

  await page.getByText("Inventory", { exact: true }).click();
  const armour = page.getByTestId("inventory");
  await expect(armour).toContainText("Chain Mail 16");
  await expect(armour).toContainText("Shield +2");
  await expect(armour).toContainText("Disadvantage on Stealth");
});

test("a half-elf is asked to place the points the book left them", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Half-Elf", exact: true }).click();
  await cont(page);
  // Half-Elf groups several ancestries of its own, so Lineage arrives first.
  await expect(question(page)).toHaveText("Which kind?");
  await page.getByRole("radio").first().click();
  await cont(page);
  await page.getByRole("radio", { name: /^Fighter/ }).click();
  await cont(page);

  await walkTo(page, "ancestry leave to you");
  await expect(question(page)).toContainText("ancestry leave to you");

  /* Two points and two skills. V2 applied the fixed +2 Charisma and dropped
     the rest, so a half-elf arrived two points short of the book. */
  const pools = page.getByTestId("quota");
  expect(await pools.count()).toBe(2);
  await expect(page.getByTestId("counter")).toContainText("4");

  /*
   * And the answers have to LAND. Asserting the question is asked proved
   * nothing: `heritage.skills` was written by this step and read by nobody,
   * so the two skill picks were collected and silently dropped, and the
   * character rolled them untrained. The abilities always worked, which is
   * what kept it hidden.
   */
  for (const n of [/Dexterity/, /Constitution/, /Insight/, /Stealth/]) {
    await page.getByRole("checkbox", { name: n }).first().click();
  }
  await cont(page);

  await walkTo(page, "skills");
  for (const n of ["Stealth", "Insight"]) {
    const row = page.getByRole("checkbox", { name: new RegExp(n) }).first();
    await expect(row).toBeDisabled();
    await expect(row).toContainText("From Half-Elf");
  }
});

test("a fighter joining at eight has three improvements to spend", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Fighter/ }).click();
  await cont(page);

  // Level is a stepper, not a field.
  const up = page.getByRole("button", { name: /Raise|\+|more/i }).first();
  for (let i = 0; i < 7; i++) await up.click();
  await cont(page);

  await walkTo(page, "What have you improved");
  await expect(question(page)).toContainText("What have you improved");
  // A fighter's ASI levels are 4, 6, 8 — three of them by level eight.
  await expect(page.getByTestId("improvement")).toHaveCount(3);

  /* Both points on one ability is legal and common, and the level-up screen
     will not allow it. Tapping the same chip twice must. */
  const first = page.getByTestId("improvement").first();
  const str = first.locator("button[aria-pressed]").first();
  await str.click();
  await str.click();
  await expect(str).toContainText("+2");
});

test("a character is reviewed before they are finished", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Fighter/ }).click();
  await cont(page);

  for (let i = 0; i < 14; i++) {
    const q = (await question(page).textContent()) ?? "";
    if (q.includes("Who is your character")) break;
    await answerFirst(page);
  }
  await page.getByRole("textbox").first().fill("Bel");
  await cont(page);

  const review = page.getByTestId("review");
  await expect(review).toBeVisible();
  /* The sum, not just the number — and the name the person saw, not the id. */
  await expect(review).toContainText("Armour class");
  await expect(review).toContainText("Bel");
  await expect(review).not.toContainText("undefined");
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByTestId("hero")).toBeVisible();
});

test("a wizard is offered a wizard's cantrips, and told what it can cast", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Wizard/ }).click();
  await cont(page);

  await walkTo(page, "Choose your spells");
  await expect(question(page)).toHaveText("Choose your spells");

  /* Unfiltered, a wizard was offered all 198 cantrips in the compendium.
     These two are a warlock's and a druid's. */
  /* Two pools now — cantrips and the spellbook — so the assertion names one. */
  const cantrips = page.getByTestId("quota").first();
  await expect(cantrips).not.toContainText("Eldritch Blast");
  await expect(cantrips).not.toContainText("Druidcraft");

  await walkTo(page, "Who is your character");
  await finish(page, "Nyx");

  await openSheet(page);
  /* The compendium has carried a twenty-row slot table all along and nothing
     read it, so a wizard's sheet said nothing about what it could cast. */
  await expect(page.getByTestId("slots")).toContainText("2 × level 1");
});

test("a sorcerer is asked about Metamagic, which the class table has always carried", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Sorcerer/ }).click();
  await cont(page);

  // Metamagic opens at 3, so the character has to be there.
  await expect(question(page)).toHaveText("What level are you starting at?");
  const up = page.getByRole("button", { name: /Raise/i }).first();
  for (let i = 0; i < 2; i++) await up.click();
  await cont(page);

  await walkTo(page, "What does your class ask");
  /*
   * One rule finds every question a class asks — a subclass, a fighting
   * style, Metamagic, a Pact Boon. V2 knew about two of them, so a sorcerer
   * was never asked about Metamagic at all.
   */
  await expect(question(page)).toHaveText("What does your class ask?");
  const pool = page.getByTestId("quota").first();
  await expect(pool).toContainText("Metamagic");
  await expect(pool).toContainText("Careful Spell");
  await expect(pool).toContainText("Twinned Spell");
});

test("a drow keeps gaining spells as they climb", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Elf", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /Drow|Dark/ }).first().click();
  await cont(page);
  await page.getByRole("radio", { name: /^Wizard/ }).click();
  await cont(page);

  await walkTo(page, "Who is your character");
  await finish(page, "Sera");
  await openSheet(page);

  /* The trait was shown as prose and the spell never reached the sheet. At
     level one they have Dancing Lights; Faerie Fire waits for 3rd. */
  const innate = page.getByTestId("innate");
  await expect(innate).toContainText("dancing lights");
  await expect(innate).not.toContainText("faerie fire");
});

test("a bard chooses cantrips AND spells, which is what the class table says", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Bard/ }).click();
  await cont(page);
  await walkTo(page, "Choose your spells");

  /*
   * Two pools. Creation asked only for cantrips, so a bard finished knowing
   * no spells while a bard GROWN to the same level knew one — the two doors
   * disagreeing, which the progression seam exists to prevent.
   */
  const pools = page.getByTestId("quota");
  expect(await pools.count()).toBe(2);
  await expect(pools.nth(0)).toContainText("Cantrips");
  await expect(pools.nth(1)).toContainText("Spells known");
  // A level-one bard: two cantrips and four spells.
  await expect(page.getByTestId("counter")).toContainText("6");
});

test("a class that says 'any simple weapon' is asked which one", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Human", exact: true }).click();
  await cont(page);
  await page.getByRole("radio", { name: /^Bard/ }).click();
  await cont(page);
  await walkTo(page, "starting equipment");

  /* Take the option that names a category rather than a thing. 18 of the 89
     options across the thirteen classes do, and a character used to walk away
     carrying the words. */
  const lines = page.getByTestId("quota");
  for (let i = 0; i < await lines.count(); i++) {
    const pool = lines.nth(i);
    if (Number(await pool.getAttribute("data-limit")) === 0) continue;
    const rows = pool.getByRole("checkbox");
    const texts = await rows.allInnerTexts();
    const any = texts.findIndex((t) => /any simple/i.test(t));
    await rows.nth(any >= 0 ? any : 0).click();
  }
  await cont(page);

  await expect(question(page)).toHaveText("Which weapons?");
  const pool = page.getByTestId("quota").first();
  /* The compendium's own order, not alphabetical: weapons carry no source
     line, but the file lists the game's own first. Sorted by name, the first
     simple weapon offered was "Acid Bomb". */
  await expect(pool).toContainText("Club");
  await expect(pool.getByRole("checkbox").first()).toContainText("Club");
});

/** Hold a row long enough to ask about it, then let go. */
const hold = async (page: Page, name: string) => {
  const row = page.getByRole("radio", { name, exact: true }).first();
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
};

test("choosing an option does not spend the screen explaining it", async ({ page }) => {
  await start(page);
  const before = await page.getByRole("radio").count();
  await page.getByRole("radio", { name: "Elf", exact: true }).click();

  /*
   * The card used to open on selection and never close: it ate a third of the
   * ancestry grid to explain the one thing on screen that needs no explaining,
   * and there is no way to un-choose, so it stayed for the rest of the step.
   */
  await expect(page.getByTestId("detail")).toHaveCount(0);
  expect(await page.getByRole("radio").count()).toBe(before);
});

test("an option says what it means, behind a control", async ({ page }) => {
  await start(page);
  await hold(page, "Elf");

  /*
   * The card listed trait NAMES — "Darkvision, Fey Ancestry, Trance" — with
   * no way to find out what Trance is. The prose is one file per record,
   * fetched when somebody asks and not before.
   */
  const card = page.getByTestId("detail").first();
  await expect(card).toContainText("Fey Ancestry");
  const prose = page.getByTestId("prose").first();
  await expect(prose).toContainText("What does this give you?");

  const scroll = () => page.evaluate(() => {
    const el = document.querySelector("[class*=scroll]");
    return el === null ? 0 : Math.round(el.scrollTop);
  });
  const before = await scroll();
  await prose.locator("summary").click();
  await expect(prose).toContainText("Elves are a magical people");

  /* Opening it must not move the list. It did: the card is last in the
     scroll, so revealing it dragged the view four thousand pixels down
     past sixty-eight ancestry cards. */
  expect(await scroll()).toBe(before);

  /* And it closes. A card that is asked for needs a way out, or it is the
     permanent card again under a different trigger. */
  await card.getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("detail")).toHaveCount(0);
});

test("a held option explains itself without being chosen", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Elf", exact: true }).click();
  await hold(page, "Dwarf");

  /* The card follows what you are looking at, and the press does not choose
     it — holding a row asks a question, it does not answer one. */
  await expect(page.getByTestId("detail").first()).toContainText("Dwarf");
  const dwarf = page.getByRole("radio", { name: "Dwarf", exact: true }).first();
  await expect(dwarf).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("radio", { name: "Elf", exact: true }))
    .toHaveAttribute("aria-checked", "true");
});

/* Leaving the flow without finishing is a cancel, and a cancel leaves nothing. */
const backOut = async (page: Page) => {
  for (let i = 0; i < 25; i++) {
    if ((await page.locator("h2").count()) === 0) return;
    await page.locator("header button").first().click();
    await page.waitForTimeout(120);
  }
};

test("a creation walked out of leaves no half-character behind", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Elf", exact: true }).click();
  await cont(page);

  /*
   * Every answer is an event, and any event tagged with a character IS a
   * character — so backing out after one question left "Unnamed · Elf ·
   * HP 0/0" on the hub, offering a sheet for someone with no class.
   */
  await backOut(page);
  await expect(page.getByTestId("character")).toHaveCount(0);

  /* And it is really gone, not merely unrendered: undo is a skip-marker in
     the log, so a reload is the honest check. */
  await page.reload();
  await expect(page.getByRole("button", { name: /Guided creation/ })).toBeVisible();
  await expect(page.getByTestId("character")).toHaveCount(0);
});

test("a finished character survives being opened and stepped back out of", async ({ page }) => {
  await start(page);
  await walkTo(page, "Who is your character", 30);
  await finish(page);
  await expect(page.getByTestId("character")).toHaveCount(1);
  const who = await page.getByTestId("character").innerText();

  /* The undo is scoped to what THIS visit appended. Scoping it to the
     character instead would make stepping back out of a finished one delete
     it — which is why no completion marker is needed to tell them apart. */
  await page.getByRole("button", { name: /Continue creation/ }).click();
  await backOut(page);
  await expect(page.getByTestId("character")).toHaveCount(1);
  expect(await page.getByTestId("character").innerText()).toBe(who);
});


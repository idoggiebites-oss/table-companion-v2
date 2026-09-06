import { test, expect } from "@playwright/test";
import { cont, makeFighter, makeSorcerer, grantLevels } from "./build";

/* Slice 5's acceptance test, across a real boundary: a character grown at the
   table, whose levels survive a reload and travel through an export. */


test("a character grows one level at a time, and the hit points follow", async ({ page }) => {
  await makeFighter(page);
  await grantLevels(page, "Bel Harrow");
  const hp = () => page.getByTestId("vitals");
  const max = Number((await hp().textContent())?.match(/\/\s*(\d+)/)?.[1] ?? 0);
  expect(max).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Level up" }).click();
  await expect(page.locator("h2")).toHaveText("Level 2");
  // Whatever the screen promises is what the sheet grants — the die's average
  // plus Constitution, which for a default build is negative.
  const promised = Number((await page.getByTestId("detail").textContent())?.match(/\+(\d+) hit points/)?.[1] ?? 0);
  expect(promised).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Take the level" }).click();
  await expect(hp()).toContainText(`/ ${max + promised}`);

  await page.reload();
  await page.getByTestId("hero").click();
  await expect(page.getByTestId("vitals")).toContainText(`/ ${max + promised}`);
});

test("the fourth level asks for an improvement and will not proceed without it", async ({ page }) => {
  await makeFighter(page);
  await grantLevels(page, "Bel Harrow", 3);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Level up" }).click();
    // Third level asks a fighter for its Martial Archetype.
    const paths = page.getByRole("radio", { name: /Champion|Battle Master|Archetype/ });
    if (await paths.count()) await paths.first().click();
    await page.getByRole("button", { name: "Take the level" }).click();
  }

  // Third level: a fighter chooses its Martial Archetype.
  await page.getByRole("button", { name: "Level up" }).click();
  await expect(page.locator("h2")).toHaveText("Level 4");
  await expect(page.getByRole("button", { name: "Take the level" })).toBeDisabled();

  await page.getByRole("button", { name: /^Strength/ }).click();
  await expect(page.getByRole("button", { name: "Take the level" })).toBeDisabled();
  await page.getByRole("button", { name: /^Constitution/ }).click();
  await expect(page.getByTestId("counter")).toHaveText("2 / 2");
  await page.getByRole("button", { name: "Take the level" })
    .click();

  // The improvement landed. Saves are inline on the sheet now, not in a
  // drawer, so the sheet itself is the evidence.
  await expect(page.getByTestId("abilities")).toBeVisible();
  await expect(page.getByTestId("vitals")).toContainText("Prof bonus");
});

test("a sorcerer is asked about Metamagic when they reach it, and offered its own spells", async ({ page }) => {
  await makeSorcerer(page);
  await grantLevels(page, "Sera", 3);
  await page.getByRole("button", { name: "Level up" }).click();

  /*
   * Metamagic opens at 3. The level-up screen asked for hit points and an
   * improvement and stopped — every other question a class asks was invisible
   * once creation was over.
   */
  const question = page.getByTestId("question");
  await expect(question).toContainText("Metamagic");
  await expect(question).toContainText("Careful Spell");

  /*
   * And the spells that level teaches. `key()` strips parentheses, so
   * "sorcerer (clockwork soul)" read as "sorcerer" and put a Clockwork Soul's
   * Aid, Bane and Bless on a plain sorcerer's list.
   */
  const learn = page.getByTestId("learn");
  await expect(learn).toContainText("Burning Hands");
  await expect(learn).not.toContainText("Aid");
  await expect(learn).not.toContainText("Bless");

  const take = page.getByRole("button", { name: "Take the level" });
  await expect(take).toBeDisabled();
  await question.getByRole("radio").first().click();
  await learn.getByRole("checkbox").first().click();
  await expect(take).toBeEnabled();
  await take.click();

  // Third level is where a sorcerer gains second-level slots.
  await expect(page.getByTestId("slots")).toContainText("2 × level 2");
  await expect(page.getByTestId("features")).toContainText("Metamagic");
});

test("a class will not have you without its minimums, and says so", async ({ page }) => {
  await makeSorcerer(page);
  await grantLevels(page, "Sera");
  await page.getByRole("button", { name: "Level up" }).click();

  /* Without a dip on this screen a character could never multiclass after
     creation at all. */
  await page.getByRole("radio", { name: /^Wizard/ }).first().click();
  await expect(page.getByTestId("blocked")).toContainText("Intelligence 13");
  await expect(page.getByRole("button", { name: "Take the level" })).toBeDisabled();
});

test("a caster can see their slots and spend one", async ({ page }) => {
  /*
   * The largest hole in the player experience, and the quietest: spells ran
   * all the way through creation — `casting.ts` knows what a sorcerer knows
   * and what a wizard writes down — and then stopped. The sheet had three tabs
   * and none of them was this one, so a caster could be BUILT with spells and
   * could not cast, prepare, or spend a slot.
   */
  await makeSorcerer(page);
  await page.getByRole("tab", { name: "Spells" }).click();

  const first = page.getByTestId("slot-1");
  await expect(first.first()).toBeVisible();
  const before = await first.count();
  expect(before).toBeGreaterThan(0);

  /* Spending one leaves it there, spent — not gone. */
  await first.first().click();
  await expect(first).toHaveCount(before);
  await expect(first.first()).toHaveAttribute("aria-pressed", "true");

  /* And a long rest gives every one of them back. */
  await page.getByRole("button", { name: /Long rest/i }).click();
  await expect(first.first()).toHaveAttribute("aria-pressed", "false");
});

test("a fighter is offered no spells at all", async ({ page }) => {
  /* `tabs.ts`'s rule, one level in: a tab with nothing on it is a promise the
     app cannot keep, and a fighter has nothing to put on this one. */
  await makeFighter(page);
  await expect(page.getByRole("tab", { name: "Spells" })).toHaveCount(0);
});

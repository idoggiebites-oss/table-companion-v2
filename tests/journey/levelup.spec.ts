import { test, expect } from "@playwright/test";
import { cont, makeFighter, makeSorcerer } from "./build";

/* Slice 5's acceptance test, across a real boundary: a character grown at the
   table, whose levels survive a reload and travel through an export. */


test("a character grows one level at a time, and the hit points follow", async ({ page }) => {
  await makeFighter(page);
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
  await page.getByRole("button", { name: "Level up" }).click();

  /* Without a dip on this screen a character could never multiclass after
     creation at all. */
  await page.getByRole("radio", { name: /^Wizard/ }).first().click();
  await expect(page.getByTestId("blocked")).toContainText("Intelligence 13");
  await expect(page.getByRole("button", { name: "Take the level" })).toBeDisabled();
});

import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { walkTo, finish } from "./build";

/* Export and import cross a boundary nothing below tier 3 can see: a real file
   leaving the browser and coming back into it. */

const hub = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
};

const makeOne = async (page: Page) => {
  await page.getByRole("button", { name: /Guided creation/ }).click();
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  if ((await page.locator("h2").textContent()) === "Which kind?") {
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("radio", { name: /Wizard/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  /*
   * Finished, not backed out of. This used to walk back to the hub and expect
   * the half-built character to be sitting there — which is exactly the thing
   * that was wrong with it: leaving without finishing is a cancel now, and
   * undoes what the visit wrote. What this test is really about is a real
   * character crossing a file boundary, so it needs a real character.
   */
  await walkTo(page, "Who is your character", 30);
  await finish(page, "Wisp Aldermere");
  await expect(page.getByTestId("roster-row")).toHaveCount(1);
};

test("a character can get back out, and back in", async ({ page }) => {
  await hub(page);
  await makeOne(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Export/ }).click(),
  ]);
  const path = await download.path();
  const sheet = JSON.parse(readFileSync(path, "utf8")) as { format: string; events: unknown[] };
  expect(sheet.format).toBe("table-companion/character");
  expect(sheet.events.length).toBeGreaterThanOrEqual(2);

  // Back in. Importing the same file twice makes two characters, not one.
  await page.getByLabel("Character file").setInputFiles(path);
  await expect(page.getByTestId("roster-row")).toHaveCount(2);
  await page.getByLabel("Character file").setInputFiles(path);
  await expect(page.getByTestId("roster-row")).toHaveCount(3);

  await page.reload();
  await expect(page.getByTestId("roster-row")).toHaveCount(3);
});

test("a compendium offered as a character is refused, and told where to go", async ({ page }) => {
  await hub(page);
  await page.getByLabel("Character file").setInputFiles({
    name: "compendium.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ compendium: [{ name: "Fireball" }] })),
  });
  await expect(page.getByRole("alert")).toContainText("not a character file");
  await expect(page.getByTestId("roster-row")).toHaveCount(0);
});

import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { walkTo, finish } from "./build";

/*
 * The sheet is reached from the one navigation, not from the roster row — the
 * hub tile that used to open it was deleted as a third door into one room.
 *
 * The seat is set explicitly first. Finishing creation claims the character,
 * but the SEAT is device-local and this file clears the log between tests, so
 * a seat left pointing at a character that no longer exists falls back to the
 * DM — and a DM has no Sheet tab at all, by design. Saying which seat we are
 * in is the difference between a test that knows what it is testing and one
 * that depends on what a previous test left behind.
 */
const openSheet = async (page: Page, who: string) => {
  await page.getByTestId("seat").selectOption({ label: who });
  await page.getByTestId("tabbar").getByRole("button", { name: "Sheet" }).click();
};

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

test("an attack is added from what is equipped, and its bonus follows the character", async ({ page }) => {
  await hub(page);
  await makeOne(page);
  await openSheet(page, "Wisp Aldermere");
  await page.getByRole("tab", { name: "Combat", exact: true }).click();

  /* The column stayed absent until something real backed it — so before an
     attack exists there is nothing to show, and it says so. */
  await expect(page.getByTestId("no-attacks")).toBeVisible();

  await page.getByRole("button", { name: "Add an attack" }).click();
  const offer = page.getByRole("group", { name: "Add an attack" }).getByRole("button").first();
  const weapon = ((await offer.textContent()) ?? "").trim();
  await offer.click();

  const row = page.getByTestId("attack").first();
  await expect(row).toContainText(weapon);
  /* A derived number, signed, never a bare integer. */
  await expect(row.getByTestId("to-hit")).toHaveText(/^[+-]\d+$/);

  const withProf = (await row.getByTestId("to-hit").textContent()) ?? "";

  /* Proficiency is the character's fact, not the app's guess — and dropping it
     must move the number, because the number is derived from it. */
  await row.getByRole("button", { name: /^Proficient with/ }).click();
  await expect(row.getByTestId("to-hit")).not.toHaveText(withProf);

  await page.screenshot({ path: "shots/sheet-attacks.png", fullPage: true });

  /* In the log like everything else. */
  await page.reload();
  await openSheet(page, "Wisp Aldermere");
  await page.getByRole("tab", { name: "Combat", exact: true }).click();
  await expect(page.getByTestId("attack").first()).toContainText(weapon);
});

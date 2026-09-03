import { test, expect } from "@playwright/test";

/* Tier 3 exists for what is only true across a real boundary. At slice 0 that
   is: the built bundle boots, the tokens survive the build, and the theme
   attribute reaches the document. */

test("the server under test is this app", async ({ page }) => {
  // A precondition, asserted rather than assumed: a fixed port is how you end
  // up testing a different application that happens to be listening.
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app", "table-companion-v2");
});

test("the built app boots and paints its ground", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(250, 247, 242)");
});

test("the theme flips to a real dark ground", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(19, 20, 22)");
});

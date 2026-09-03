import { test, expect } from "@playwright/test";

/* The log crosses a real boundary here that tier 2 cannot see: IndexedDB in
   WebKit, in the built bundle, across an actual page load. */

test("the log survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();

  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Append" }).click();
  await expect(page.getByTestId("event")).toHaveCount(3);

  await page.reload();
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await expect(page.getByTestId("event")).toHaveCount(3);
  await expect(page.getByText("3 live")).toBeVisible();
});

test("undo survives a reload, and the event does too", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();

  await page.getByRole("button", { name: "Append" }).click();
  await page.getByRole("button", { name: "Append" }).click();
  await page.getByRole("button", { name: "Undo event 1" }).click();

  await page.reload();
  await page.getByRole("button", { name: "Log", exact: true }).click();
  // Three rows: two appends and the marker. One of them reads as taken back.
  await expect(page.getByTestId("event")).toHaveCount(3);
  await expect(page.locator('[data-undone="yes"]')).toHaveCount(1);
  await expect(page.getByText("1 live")).toBeVisible();
});

import { test, expect } from "@playwright/test";

/* The log crosses a real boundary here that tier 2 cannot see: IndexedDB in
   WebKit, in the built bundle, across an actual page load. */

test("the log survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();

  /* Real events from a real action: the "Append" button that wrote a
     meaningless tick was Slice 1's debug rig and is gone. */
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("tabbar").getByRole("button", { name: "Combat" }).click();
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().waitFor({ timeout: 30_000 });
  for (let i = 0; i < 3; i++) await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("tabbar").getByRole("button", { name: "Log" }).click();
  await expect(page.getByTestId("event")).toHaveCount(3);

  await page.reload();
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await expect(page.getByTestId("event")).toHaveCount(3);
});

test("undo survives a reload, and the event does too", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();

  /* Real events from a real action: the "Append" button that wrote a
     meaningless tick was Slice 1's debug rig and is gone. */
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("tabbar").getByRole("button", { name: "Combat" }).click();
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().waitFor({ timeout: 30_000 });
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("tabbar").getByRole("button", { name: "Log" }).click();
  await page.getByTestId("event").first().getByRole("button", { name: /^Undo/ }).click();

  await page.reload();
  await page.getByRole("button", { name: "Log", exact: true }).click();
  /* Two rows: both appends, one struck through. The undo marker is no longer a
     row of its own — it shows ON what it undid, which is V1's rule and the
     reason a log does not read as its own bookkeeping. */
  await expect(page.getByTestId("event")).toHaveCount(2);
  await expect(page.locator('[data-undone="yes"]')).toHaveCount(1);

});

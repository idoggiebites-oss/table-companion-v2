import { test, expect } from "@playwright/test";
import { cont, makeFighter } from "./build";

/* The sheet, across a real boundary: every change is an event, and the whole
   thing is still there after the page reloads. */


test("damage, healing and a long rest are all events that survive a reload", async ({ page }) => {
  await makeFighter(page);
  const hp = page.getByTestId("vitals");
  const full = Number((await hp.textContent())?.match(/(\d+)\s*\//)?.[1] ?? 0);
  expect(full).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Damage" }).click();
  await page.getByTestId("pad").getByRole("button", { name: "6", exact: true }).click();
  await expect(hp).toContainText(String(full - 6));

  await page.reload();
  await page.getByTestId("hero").click();
  await expect(page.getByTestId("vitals")).toContainText(String(full - 6));

  await page.getByRole("button", { name: "Long rest" }).click();
  await expect(page.getByTestId("vitals")).toContainText(String(full));
});

test("nothing is waiting until something is", async ({ page }) => {
  await makeFighter(page);
  await expect(page.getByTestId("waiting")).toHaveCount(0);

  // Enough to go down, not enough to die.
  const full = Number((await page.getByTestId("vitals").textContent())?.match(/(\d+)\s*\//)?.[1] ?? 0);
  await page.getByRole("button", { name: "Damage" }).click();
  await page.getByTestId("pad").getByRole("button", { name: String(full), exact: true }).click();

  await expect(page.getByTestId("waiting")).toBeVisible();
  await expect(page.getByTestId("waiting")).toContainText("Death saves");
  await page.getByRole("button", { name: "Save failed" }).click();
  await expect(page.getByTestId("waiting")).toContainText("1 of 3 failed");

  /*
   * And the bar says so. V1's rule: the cost of tabs is that things go out of
   * sight, and one of the things that can go out of sight is a save owed right
   * now — so the tab that leads here carries a dot. The sheet and the dot read
   * the same `waitingOn`, or they would drift.
   */
  await expect(page.getByTestId("tab-dot")).toBeVisible();
  await page.getByRole("button", { name: "Long rest" }).click();
  await expect(page.getByTestId("waiting")).toHaveCount(0);
  await expect(page.getByTestId("tab-dot")).toHaveCount(0);
});

test("a condition explains itself rather than being named", async ({ page }) => {
  await makeFighter(page);
  await page.getByRole("button", { name: "Conditions…" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Disadvantage on attacks and ability checks");
  await drawer.getByRole("button", { name: /^Poisoned/ }).click();
  // `name` is a substring match: "Close" also matches Frightened's
  // "you cannot move closer".
  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  // A condition sits with the controls that clear it, not in the stat strip.
  await expect(page.getByTestId("actions")).toContainText("Poisoned");
});

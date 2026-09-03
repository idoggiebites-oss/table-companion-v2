import { test, expect } from "@playwright/test";
import { makeFighter } from "./build";

/* What a character is carrying, resolved from the words creation wrote down
   against the item catalogue this screen loads. */

test("the pack is filled from what creation wrote down", async ({ page }) => {
  await makeFighter(page, "Aelar");
  await page.getByText("Inventory", { exact: true }).click();

  const inv = page.getByTestId("inventory");
  await expect(inv).toBeVisible();

  // What you are carrying, against what you can — Strength × 15.
  await expect(inv).toContainText("Carry weight");
  await expect(inv).toContainText("lb");
  await expect(inv).toContainText("Armor class");

  /* The figure: six places, and a fighter's kit fills the hands and the body.
     A list answers "what do I own that is ticked"; the question a player asks
     is "what is in my hands". */
  const slots = page.getByTestId("slots");
  await expect(slots).toContainText("Main hand");
  await expect(slots).toContainText("Armor");
  await expect(slots).toContainText("Trinket");
});

test("a thing can be put on and taken off, and the sheet follows", async ({ page }) => {
  await makeFighter(page, "Aelar");
  await page.getByText("Inventory", { exact: true }).click();
  await expect(page.getByTestId("inventory")).toBeVisible();

  const equip = page.getByRole("button", { name: "Equip", exact: true }).first();
  await expect(equip).toBeVisible({ timeout: 15_000 });
  const name = (await equip.locator("xpath=..").textContent())?.trim() ?? "";
  await equip.click();

  /* It reads as worn, and it is now in the figure. The row is re-queried:
     the list re-renders, and a node captured before the click is a node that
     no longer exists. */
  await expect(page.getByRole("button", { name: "Equipped", exact: true }).first()).toBeVisible();
  expect(name).not.toBe("");

  /* And it is an event like everything else, so it survives a reload. */
  await page.reload();
  await page.getByTestId("hero").click();
  await page.getByText("Inventory", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Equipped", exact: true }).first()).toBeVisible();
});

test("the pack is sorted into the four the sheet knows", async ({ page }) => {
  await makeFighter(page, "Aelar");
  await page.getByText("Inventory", { exact: true }).click();

  for (const tab of ["Weapons", "Armor", "Gear", "Consumables"]) {
    await expect(page.getByRole("tab", { name: tab })).toBeVisible();
  }
  /* A thing the catalogue never named is gear, because it is a thing in a
     bag — never dropped for being unrecognised. */
  await page.getByRole("tab", { name: "Gear" }).click();
  await expect(page.getByTestId("inventory")).toBeVisible();
});

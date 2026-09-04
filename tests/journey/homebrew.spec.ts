import { test, expect } from "@playwright/test";
import { makeFighter } from "./build";

/*
 * A thing the books do not have, carried and worn like anything else.
 *
 * This is Task 21's acceptance criterion driven end to end: the item is
 * written down on one screen and the armour class moves on another, and
 * nothing between the two was told it was homebrew. `check-homebrew` holds the
 * static half of the same rule.
 */

const OUT = process.env["LOOK"];

test("a made-up breastplate is carried, worn, and moves the armour class", async ({ page }) => {
  await makeFighter(page, "Aelar");
  await page.getByText("Inventory", { exact: true }).click();
  const inv = page.getByTestId("inventory");
  await expect(inv).toBeVisible();

  const before = Number((await inv.getByText(/^\d+$/).first().textContent()) ?? "0");

  await page.getByRole("button", { name: /Make something/ }).click();
  const drawer = page.getByRole("dialog", { name: "Make something" });
  await expect(drawer).toBeVisible();

  await drawer.getByRole("button", { name: "Armour" }).click();
  await drawer.getByPlaceholder("Sunderer").fill("Dwarven Breastplate");
  await drawer.getByRole("button", { name: "Medium" }).click();
  await drawer.getByPlaceholder("11").fill("14");

  /* The preview is the real record, so it is worth asserting: what it says
     here is what the rules will read. */
  await expect(drawer.getByTestId("preview")).toContainText("Dwarven Breastplate (HB)");
  await expect(drawer.getByTestId("preview")).toContainText("armour class 14");
  if (OUT !== undefined) await page.screenshot({ path: `${OUT}/make-item.png`, fullPage: true });

  await drawer.getByRole("button", { name: "Write it down" }).click();
  await expect(drawer).toBeHidden();

  /* It is in the pack, under Armor, because `bucketOf` sorted it — and
     `bucketOf` has never heard of this feature. */
  await page.getByRole("tab", { name: "Armor" }).click();
  const row = page.getByText("Dwarven Breastplate (HB)");
  await expect(row).toBeVisible();

  await page.getByRole("button", { name: "Equip", exact: true }).last().click();

  /* Medium armour: 14 + dexterity, capped at 2. The number moved, and it moved
     through `wornFrom` and `armourClass` — the same two functions a compendium
     breastplate goes through. */
  await expect(inv).toContainText("Dwarven Breastplate (HB) 14");
  const after = Number((await inv.getByText(/^\d+$/).first().textContent()) ?? "0");
  expect(after).not.toBe(before);
  if (OUT !== undefined) await page.screenshot({ path: `${OUT}/worn.png`, fullPage: true });
});

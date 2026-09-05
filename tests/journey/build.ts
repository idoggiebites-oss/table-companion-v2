import { expect, type Page } from "@playwright/test";

/**
 * Building a character, for the specs that need one before they can start.
 *
 * Shared because three specs had a copy each, and each copy answered "pick N
 * checkboxes off the top of the page" — which stopped working the moment a
 * step became several pools with a count each. A helper that silently answers
 * the first pool three times and leaves the other two empty does not fail
 * loudly; it hangs on a disabled Continue.
 *
 * Drives by STRUCTURE, not by content: the compiled compendium is the
 * published books and is never committed, so this must pass with it and
 * without it.
 */
export const cont = (p: Page) => p.getByRole("button", { name: "Continue" }).click();

/** Answer whatever is on screen with its first available options. */
export async function answerFirst(page: Page): Promise<void> {
  const radios = page.getByRole("radio");
  const quotas = page.getByTestId("quota");
  const improvements = page.getByTestId("improvement");

  if (await improvements.count()) {
    // Chips, not options: each improvement is two points, and both may land
    // on the same ability. Tapping one chip twice is the whole answer.
    for (let i = 0; i < await improvements.count(); i++) {
      const chip = improvements.nth(i).locator("button[aria-pressed]").first();
      await chip.click();
      await chip.click();
    }
  } else if (await radios.count()) {
    await radios.first().click();
  } else if (await quotas.count()) {
    // Several pools on one screen, each with its own count. Spending every
    // pick on the first leaves the rest unanswered and Continue disabled.
    for (let q = 0; q < await quotas.count(); q++) {
      const pool = quotas.nth(q);
      const need = Number(await pool.getAttribute("data-limit") ?? 0);
      const rows = pool.getByRole("checkbox");
      let took = 0;
      for (let i = 0; i < await rows.count() && took < need; i++) {
        if (await rows.nth(i).isDisabled()) continue;
        await rows.nth(i).click();
        took += 1;
      }
    }
  } else {
    const checks = page.getByRole("checkbox");
    if (await checks.count()) {
      const need = Number((await page.getByTestId("counter").textContent())?.split("/")[1]?.trim() ?? 1);
      let took = 0;
      for (let i = 0; i < await checks.count() && took < need; i++) {
        // A granted row is shown ticked and not pressable. It is not a pick.
        if (await checks.nth(i).isDisabled()) continue;
        await checks.nth(i).click();
        took += 1;
      }
    }
  }
  await cont(page);
}

/**
 * Answer steps until the question contains `want`.
 *
 * Every spec that walked a fixed number of times broke the moment the builder
 * learned something new — and broke SILENTLY, by sailing past the step it
 * meant to stop at. The bound is a safety net, not the plan.
 */
export async function walkTo(page: Page, want: string, max = 20): Promise<void> {
  for (let i = 0; i < max; i++) {
    const q = (await page.locator("h2").textContent()) ?? "";
    if (q.includes(want)) return;
    await answerFirst(page);
  }
  throw new Error(`never reached a question containing "${want}"`);
}

/**
 * A sorcerer at level two, with the sheet open.
 *
 * Two, because Metamagic opens at three: the point is to walk into it at
 * level-up rather than at creation. Assigns scores so the multiclass
 * prerequisites are interesting — Charisma high, Intelligence low.
 */
export async function makeSorcerer(page: Page, name = "Sera"): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByRole("button", { name: /Guided creation/ }).click();

  await page.getByRole("radio", { name: "Human", exact: true }).click(); await cont(page);
  await page.getByRole("radio", { name: /^Sorcerer/ }).first().click(); await cont(page);
  await expect(page.locator("h2")).toHaveText("What level are you starting at?");
  await page.getByRole("button", { name: /Raise/i }).first().click();
  await cont(page);

  for (let i = 0; i < 20; i++) {
    const q = (await page.locator("h2").textContent()) ?? "";
    if (q.includes("Assign ability scores")) {
      const fields = page.locator("input");
      const n = await fields.count();
      // Charisma high, Intelligence low: a wizard will not have them.
      for (const [k, v] of ["8", "14", "13", "10", "12", "15"].entries()) {
        if (k < n) await fields.nth(k).fill(v);
      }
      await cont(page);
      continue;
    }
    if (q.includes("Who is your character")) break;
    await answerFirst(page);
  }
  await finish(page, name);
  await page.getByTestId("hero").click();
}

/** A first-level fighter, named, with the sheet open. */
export async function makeFighter(page: Page, name = "Bel Harrow"): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByRole("button", { name: /Guided creation/ }).click();

  await page.getByRole("radio").first().click(); await cont(page);
  if ((await page.locator("h2").textContent()) === "Which kind?") {
    await page.getByRole("radio").first().click(); await cont(page);
  }
  await page.getByRole("radio", { name: /Fighter/ }).first().click(); await cont(page);
  await cont(page); // level 1
  await cont(page); // abilities

  /* Not a fixed number of steps. A fighter's list grew by two when the builder
     learned about fighting styles and languages, and a loop bounded at six
     stopped one short of the end without saying so. */
  for (let i = 0; i < 12; i++) {
    if ((await page.locator("h2").textContent()) === "Who is your character?") break;
    await answerFirst(page);
  }
  await expect(page.locator("h2")).toHaveText("Who is your character?");
  await finish(page, name);
  await page.getByTestId("hero").click();
}

/**
 * Name the character and leave the flow.
 *
 * Identity is no longer the last step — Review is, and it is the one screen
 * that says the whole character back before anybody commits to it. Four specs
 * assumed Identity finished the flow and stopped one screen short.
 */
export async function finish(page: Page, name = "Bel Harrow"): Promise<void> {
  await page.getByRole("textbox").first().fill(name);
  await cont(page);
  await expect(page.getByTestId("review")).toBeVisible();
  await page.getByRole("button", { name: "Finish" }).click();
}

/**
 * Levels handed over by the DM, then back into the character.
 *
 * Task 62 moved the key: "Level up" appears only when one is owed, because a
 * player holding it meant the DM had no say in when the table levelled. These
 * journeys are about the level-up FLOW, so they take the shortest honest route
 * to being owed one — a milestone, which is what a DM does when they are not
 * counting experience.
 */
export async function grantLevels(page: Page, name: string, n = 1): Promise<void> {
  const bar = page.getByTestId("tabbar");
  await bar.getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar.getByRole("button", { name: "Party" }).click();
  for (let i = 0; i < n; i++) await page.getByTestId("award-milestone").click();
  await bar.getByRole("button", { name: "Log" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ label: name });
  await bar.getByRole("button", { name: "Sheet" }).click();
}

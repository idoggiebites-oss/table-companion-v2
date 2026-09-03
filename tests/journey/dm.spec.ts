import { test, expect, type Page } from "@playwright/test";
import { walkTo, finish } from "./build";

const hub = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
};

const make = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Guided creation" }).click();
  await walkTo(page, "Who is your character", 30);
  await finish(page, name);
};

const bar = (page: Page) => page.getByTestId("tabbar");

test("the seat decides the bar, and it stays one bar", async ({ page }) => {
  await hub(page);

  /* A fresh device is the DM — right when it is the only one in the house. */
  await expect(bar(page).getByRole("button", { name: "Party" })).toBeVisible();
  await expect(bar(page).getByRole("button", { name: "Sheet" })).toHaveCount(0);

  /* Making a character CLAIMS it, and sits in it — V1's rule, and the reason
     the DM default is safe. So finishing one swaps the bar rather than adding
     to it: a player has no Party because looking after the table is not their
     job. */
  await make(page, "Wren Aldermere");
  await expect(bar(page).getByRole("button", { name: "Sheet" })).toBeVisible();
  await expect(bar(page).getByRole("button", { name: "Party" })).toHaveCount(0);

  await page.getByTestId("seat").selectOption({ value: "dm" });
  await expect(bar(page).getByRole("button", { name: "Party" })).toBeVisible();
  await expect(bar(page).getByRole("button", { name: "Sheet" })).toHaveCount(0);
});

test("the party is the DM's reading of the same log", async ({ page }) => {
  await hub(page);
  await make(page, "Wren Aldermere");
  await make(page, "Brom Stonebeard");

  /* Building the table's characters leaves this device sitting in the last
     one. Back behind the screen to look at them all. */
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Party" }).click();
  await expect(page.getByTestId("party-row")).toHaveCount(2);
  await expect(page.getByTestId("party")).toContainText("Wren Aldermere");
  await expect(page.getByTestId("party")).toContainText("Brom Stonebeard");

  /* Nothing here is stored: damage recorded on a sheet is the same event the
     party row reads, or the DM's screen would be a second source of truth for
     the one number that must never have two. */
  await page.getByTestId("party-row").first().click();
  const full = Number((await page.getByTestId("vitals").textContent())?.match(/(\d+)\s*\//)?.[1] ?? 0);
  await page.getByRole("button", { name: "Damage" }).click();
  await page.getByTestId("pad").getByRole("button", { name: "3", exact: true }).click();

  /* Back to the DM's chair. The seat control lives on Characters — one place,
     not a control repeated on every screen. */
  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Party" }).click();
  await expect(page.getByTestId("party")).toContainText(`${String(full - 3)} / ${String(full)}`);
});

test("the party says what to do when there is nobody in it", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Party" }).click();
  /* Not "no characters" — say what happens next. */
  await expect(page.getByTestId("party-empty")).toContainText("will appear here");
});

test("a fight is assembled before anybody sees it", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Fight" }).click();

  /* Not "no creatures": say what to do, and say what staging means. */
  await expect(page.getByTestId("table-empty")).toContainText("hidden");

  await page.getByTestId("bestiary-search").fill("adult black dragon");
  const hit = page.getByTestId("bestiary-row").first();

  /* The two facts that change how a DM runs a creature, said BEFORE it is
     staged rather than discovered mid-fight. */
  await expect(hit).toContainText("CR 14");
  await expect(hit).toContainText("legendary");
  await expect(hit).toContainText("lair");
  await hit.click();

  /* Three goblins are three rows with their own hit points, not one row with
     a count: a count cannot say that one of them is nearly down. */
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("bestiary-row").first().click();
  await expect(page.getByTestId("staged-row")).toHaveCount(3);
  await expect(page.getByTestId("staged")).toContainText("Goblin 2");

  /* Staged is hidden. Putting a creature on the table is preparation, not
     narration — it has not been shown to anybody yet. */
  const dragon = page.getByTestId("staged-row").first();
  await expect(dragon.getByTestId("step-hidden")).toHaveAttribute("aria-checked", "true");

  /* And the ladder moves per creature, so the dragon can stay a rumour while
     the goblins are an open book. */
  await dragon.getByTestId("step-vague").click();
  await expect(dragon.getByTestId("step-vague")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("staged-row").nth(1).getByTestId("step-hidden"))
    .toHaveAttribute("aria-checked", "true");

  /* It is in the log, so it survives the DM's phone locking. */
  await page.reload();
  await bar(page).getByRole("button", { name: "Fight" }).click();
  await expect(page.getByTestId("staged-row")).toHaveCount(3);
  await expect(page.getByTestId("staged-row").first().getByTestId("step-vague"))
    .toHaveAttribute("aria-checked", "true");
});

test("a player is not offered the fight, because it is not their job", async ({ page }) => {
  await hub(page);
  await make(page, "Wren Aldermere");
  /* Making a character sits this device in it. The bar turns with the seat. */
  await expect(bar(page).getByRole("button", { name: "Fight" })).toHaveCount(0);
});

test("the order settles, then the fight walks down it", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Fight" }).click();

  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("bestiary-row").first().click();
  await expect(page.getByTestId("staged-row")).toHaveCount(2);

  /* Assert on the numbers in row order, not on names: searching "goblin"
     turns up "Chaos-spawn Goblin" first, and the subject here is the sort. */
  const rolls = () => page.getByTestId("initiative").evaluateAll(
    (els) => els.map((e) => (e as HTMLInputElement).value));

  /* Nobody has rolled: blank boxes, not zeroes, and Begin is not offered. */
  await expect(page.getByTestId("initiative").first()).toHaveValue("");
  await expect(page.getByRole("button", { name: /^Begin/ })).toBeDisabled();

  /* One roll: the rolled one rises, the unrolled one sorts LAST, not as a 0. */
  await page.getByTestId("initiative").nth(1).fill("19");
  await expect.poll(rolls).toEqual(["19", ""]);
  await expect(page.getByTestId("waiting")).toBeVisible();
  await expect(page.getByRole("button", { name: /Begin without 1/ })).toBeEnabled();

  /* A low roll still beats not having rolled. */
  await page.getByTestId("initiative").nth(0).fill("4");
  await expect.poll(rolls).toEqual(["4", ""]);

  /* Everyone in: the waiting line goes and the order is by the numbers. */
  await page.getByTestId("initiative").nth(1).fill("11");
  await expect.poll(rolls).toEqual(["11", "4"]);
  await expect(page.getByTestId("waiting")).toHaveCount(0);

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Round 1/ })).toBeVisible();
  await expect(page.getByTestId("staged-row").first()).toHaveAttribute("aria-current", "true");

  await page.screenshot({ path: "shots/fight-round-1.png", fullPage: true });

  /* Down the order, then over the top into round two. */
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByTestId("staged-row").nth(1)).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByRole("heading", { name: /Round 2/ })).toBeVisible();
  await expect(page.getByTestId("staged-row").first()).toHaveAttribute("aria-current", "true");

  /* And it survives a reload, because the turn is in the log like everything else. */
  await page.reload();
  await bar(page).getByRole("button", { name: "Fight" }).click();
  await expect(page.getByRole("heading", { name: /Round 2/ })).toBeVisible();
});

test("a creature takes damage, and mends, and remembers both", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Fight" }).click();
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();

  const row = page.getByTestId("staged-row").first();
  const hp = row.locator('[class*="rowNote"]');
  const before = (await hp.textContent()) ?? "";
  const max = Number(/(\d+)\s*hp/.exec(before)?.[1] ?? "0");
  expect(max).toBeGreaterThan(0);

  const hit = async (n: string) => {
    /* Two number inputs in a row now — initiative and damage — so name it. */
    await row.getByRole("spinbutton", { name: /^Damage/ }).fill(n);
    await row.getByRole("button", { name: /^Apply to/ }).click();
  };

  await hit("4");
  await expect(hp).toContainText(`${String(max - 4)}/${String(max)}`);

  /* A minus is healing — one gesture with the sign flipped. */
  await hit("-2");
  await expect(hp).toContainText(`${String(max - 2)}/${String(max)}`);

  /* Neither end runs away: not past dead, not past whole. */
  await hit("999");
  await expect(hp).toContainText(`0/${String(max)}`);
  await hit("-999");
  await expect(hp).toContainText(`${String(max)}/${String(max)}`);

  await hit("5");
  await page.screenshot({ path: "shots/fight-damage.png", fullPage: true });

  /* It is in the log like everything else, so it survives the app closing. */
  await page.reload();
  await bar(page).getByRole("button", { name: "Fight" }).click();
  await expect(page.getByTestId("staged-row").first().locator('[class*="rowNote"]'))
    .toContainText(`${String(max - 5)}/${String(max)}`);
});

test("a condition goes on a creature, says what it does, and comes off", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Fight" }).click();
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();

  const row = page.getByTestId("staged-row").first();
  await row.getByRole("button", { name: /^Add a condition/ }).click();
  await row.getByRole("button", { name: "Poisoned", exact: true }).click();

  /* The effect is carried with it: "poisoned" teaches nothing on its own. */
  const chip = row.getByRole("button", { name: /^Clear Poisoned/ });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute("title", /[Dd]isadvantage/);

  await page.screenshot({ path: "shots/fight-conditions.png", fullPage: true });

  /* It is in the log, so it survives the app closing. */
  await page.reload();
  await bar(page).getByRole("button", { name: "Fight" }).click();
  await expect(page.getByTestId("staged-row").first()
    .getByRole("button", { name: /^Clear Poisoned/ })).toBeVisible();

  await page.getByTestId("staged-row").first()
    .getByRole("button", { name: /^Clear Poisoned/ }).click();
  await expect(page.getByTestId("staged-row").first()
    .getByRole("button", { name: /^Clear Poisoned/ })).toHaveCount(0);
});

test("a player claims a hit, and nothing lands until the DM says so", async ({ page }) => {
  await hub(page);
  await make(page, "Bree Thorn");

  /* Stage something to swing at, and start the fight — a swing needs a fight.
     The seat control is on the hub's crest row, so seats change from there. */
  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Fight" }).click();
  /* 6,633 creatures arrive as a 142KB fetch when this screen opens; the search
     is live before they land and says so. Wait for it rather than for a row. */
  await expect(page.getByTestId("bestiary-search"))
    .toHaveAttribute("placeholder", /Search/, { timeout: 30_000 });
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();
  const row = page.getByTestId("staged-row").first();
  const before = (await row.locator('[class*="rowNote"]').textContent()) ?? "";
  const max = Number(/(\d+)\s*hp/.exec(before)?.[1] ?? "0");
  await row.getByRole("spinbutton", { name: /^Initiative/ }).fill("10");
  /* Visible, or a player cannot swing at what they are not allowed to know. */
  await row.getByTestId("step-present").click();
  await page.getByRole("button", { name: "Begin", exact: true }).click();

  /* Now as the player, with something to swing. */
  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Sheet" }).click();
  await page.getByRole("tab", { name: "Combat", exact: true }).click();
  await page.getByRole("button", { name: "Add an attack" }).click();
  await page.getByRole("group", { name: "Add an attack" }).getByRole("button").first().click();

  const attack = page.getByTestId("attack").first();
  await attack.getByRole("button", { name: /^Swing/ }).click();
  await page.getByRole("spinbutton", { name: /rolled to hit/ }).fill("18");
  await page.getByRole("spinbutton", { name: /damage you rolled/ }).fill("4");
  await page.getByRole("button", { name: "Tell the DM" }).click();

  /* Sent, and nothing has happened to the goblin yet. */
  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Fight" }).click();
  await expect(page.getByTestId("claim")).toHaveCount(1);
  await expect(page.getByTestId("staged-row").first().locator('[class*="rowNote"]'))
    .toContainText(`${String(max)}/${String(max)}`);

  /* The line suggests; it does not decide. */
  await expect(page.getByTestId("verdict")).toContainText("18 against");
  await page.screenshot({ path: "shots/fight-claim.png", fullPage: true });

  await page.getByRole("button", { name: /lands$/ }).click();
  await expect(page.getByTestId("claim")).toHaveCount(0);
  await expect(page.getByTestId("staged-row").first().locator('[class*="rowNote"]'))
    .toContainText(`${String(max - 4)}/${String(max)}`);
});

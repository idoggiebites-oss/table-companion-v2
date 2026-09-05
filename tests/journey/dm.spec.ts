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

/**
 * Back to the hub as the DM, from a screen whose bar no longer has a way
 * there. Task 26 dropped Characters from the DM's bar — the door on Party's
 * own rows is the better one for reaching a SHEET — but the seat control
 * still lives on the hub alone, and the log screen is the only DM screen that
 * still carries a route to it (its own action row, outside the tab bar; see
 * `hub()`). A player's bar keeps Characters, so this is only needed while
 * seated as the DM.
 */
const toHub = async (page: Page) => {
  await bar(page).getByRole("button", { name: "Log" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
};

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
  await bar(page).getByRole("button", { name: "Combat" }).click();

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
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("staged-row")).toHaveCount(3);
  await expect(page.getByTestId("staged-row").first().getByTestId("step-vague"))
    .toHaveAttribute("aria-checked", "true");
});

test("a player is not offered the fight until there is one", async ({ page }) => {
  await hub(page);
  await make(page, "Wren Aldermere");
  /* Making a character sits this device in it. The bar turns with the seat.
     Staging a fight is not a player's job — but a running fight IS their
     business, and V1's playerTabs carry Combat. The has-content rule decides
     which: no fight, no tab, because a tab reading "no fight yet" is the dead
     screen V1 refuses to draw. */
  await expect(bar(page).getByRole("button", { name: "Combat" })).toHaveCount(0);
});

test("the order settles, then the fight walks down it", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Combat" }).click();

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
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByRole("heading", { name: /Round 2/ })).toBeVisible();
});

test("a creature takes damage, and mends, and remembers both", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Combat" }).click();
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
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("staged-row").first().locator('[class*="rowNote"]'))
    .toContainText(`${String(max - 5)}/${String(max)}`);
});

test("a condition goes on a creature, says what it does, and comes off", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Combat" }).click();
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
  await bar(page).getByRole("button", { name: "Combat" }).click();
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
  await bar(page).getByRole("button", { name: "Combat" }).click();
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

  /* The party goes in the order too, or a fight is monsters taking turns at
     each other. Bree rolls higher, so the first turn is hers. */
  await page.getByRole("button", { name: /^Put Bree Thorn in the fight/ }).click();
  const bree = page.getByTestId("staged-row").filter({ hasText: "Bree Thorn" });
  await bree.getByRole("spinbutton", { name: /^Initiative/ }).fill("20");
  await page.getByRole("button", { name: "Begin", exact: true }).click();

  /* Now as the player. The sheet is where you keep what you swing; the fight
     is where you swing it — two doors into one room would be one too many. */
  await toHub(page);
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Sheet" }).click();
  await page.getByRole("tab", { name: "Combat", exact: true }).click();
  await page.getByRole("button", { name: "Add an attack" }).click();
  await page.getByRole("group", { name: "Add an attack" }).getByRole("button").first().click();

  await bar(page).getByRole("button", { name: "Combat" }).click();
  const attack = page.getByTestId("my-attacks").locator("li").first();
  await attack.getByRole("button", { name: /^Swing/ }).click();

  /* How to roll, and WHY — said at the moment the dice are picked up.
     "Advantage" alone teaches nothing; naming the reason teaches the rule
     while it is being used. Nothing is on either side here, so it is straight. */
  await expect(page.getByTestId("stance")).toHaveAttribute("data-stance", "straight");

  await page.getByRole("spinbutton", { name: /rolled to hit/ }).fill("18");
  await page.getByRole("spinbutton", { name: /damage you rolled/ }).fill("4");
  await page.getByRole("button", { name: "Tell the DM" }).click();

  /* Sent, and nothing has happened to the goblin yet. */
  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("claim")).toHaveCount(1);
  /* Bree is first in the order now, so name the goblin rather than take the
     first row — the order is the thing under test elsewhere. */
  const goblin = page.getByTestId("staged-row").filter({ hasNotText: "Bree Thorn" }).first();
  await expect(goblin.locator('[class*="rowNote"]'))
    .toContainText(`${String(max)}/${String(max)}`);

  /* The line suggests; it does not decide. */
  await expect(page.getByTestId("verdict")).toContainText("18 against");
  await page.screenshot({ path: "shots/fight-claim.png", fullPage: true });

  await page.getByRole("button", { name: /lands$/ }).click();
  await expect(page.getByTestId("claim")).toHaveCount(0);
  await expect(goblin.locator('[class*="rowNote"]'))
    .toContainText(`${String(max - 4)}/${String(max)}`);
});

test("a player's fight is two screens, and shows only what the ladder allows", async ({ page }) => {
  await hub(page);
  await make(page, "Bree Thorn");

  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });

  /* No fight yet, so a player is offered none — a tab reading "no fight yet"
     is the dead screen V1 refuses to draw. Already on the hub screen from the
     seat switch above, so there is nothing to tap to get back to it — the DM
     bar dropped Characters (Task 26) and this is where that would have gone. */
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await expect(bar(page).getByRole("button", { name: "Combat" })).toHaveCount(0);

  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("bestiary-search"))
    .toHaveAttribute("placeholder", /Search/, { timeout: 30_000 });
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("bestiary-row").nth(1).click();

  const rows = page.getByTestId("staged-row");
  await rows.nth(0).getByRole("spinbutton", { name: /^Initiative/ }).fill("5");
  await rows.nth(1).getByRole("spinbutton", { name: /^Initiative/ }).fill("4");
  /* One stays hidden; the other is shown as a word, never a number. */
  await rows.nth(1).getByTestId("step-vague").click();

  await page.getByRole("button", { name: /^Put Bree Thorn in the fight/ }).click();
  await page.getByTestId("staged-row").filter({ hasText: "Bree Thorn" })
    .getByRole("spinbutton", { name: /^Initiative/ }).fill("1");
  await page.getByRole("button", { name: "Begin", exact: true }).click();

  await toHub(page);
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Combat" }).click();

  /* Waiting: whose go it is, and nothing to press. Bree rolled lowest.
     The active one is HIDDEN, so it is not named — announcing it in the
     biggest text on the screen would undo the ladder from the one place
     nobody thought to check. */
  await expect(page.getByTestId("whose-turn")).toHaveText("Someone else");
  await expect(page.getByTestId("my-attacks")).toHaveCount(0);

  /* The hidden one is not on the list at all — knowing it is there is the
     thing the ladder protects. The vague one is a WORD, never a number. */
  const order = page.getByTestId("order-row");
  await expect(order).toHaveCount(2);
  await expect(page.getByTestId("order")).not.toContainText("/");

  await page.screenshot({ path: "shots/player-fight.png", fullPage: true });
});

test("the log reads differently per person", async ({ page }) => {
  await hub(page);
  await make(page, "Bree Thorn");

  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("bestiary-search"))
    .toHaveAttribute("placeholder", /Search/, { timeout: 30_000 });
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();

  /* Hurt it and slide the ladder — all of it behind the screen. */
  const row = page.getByTestId("staged-row").first();
  await row.getByRole("spinbutton", { name: /^Damage/ }).fill("3");
  await row.getByRole("button", { name: /^Apply to/ }).click();
  await row.getByTestId("step-vague").click();

  /* The DM sees the lot. */
  await bar(page).getByRole("button", { name: "Log" }).click();
  const dmRows = await page.getByTestId("event").count();
  expect(dmRows).toBeGreaterThan(0);
  /* Asserted on the SENTENCES now, not on the raw event kind. The old version
     looked for "fight.act", which was the debug view the log used to be — and
     a test that reads a kind string cannot tell whether a person could read
     the row. */
  const dmText = await page.getByTestId("rows").innerText();
  expect(dmText).toContain("is on the table");
  expect(dmText).toContain("took 3");

  /* The player does not. Staging, damage and the ladder are all prep — and
     the fight screen hiding a creature is worth nothing if this names it. */
  /* The Log screen's own nav is not inside the tab bar — see hub(). */
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Log" }).click();
  const playerText = await page.getByTestId("rows").innerText().catch(() => "");
  expect(playerText).not.toContain("is on the table");
  expect(playerText).not.toContain("took 3");
  expect(await page.getByTestId("event").count()).toBeLessThan(dmRows);

  await page.screenshot({ path: "shots/log-player.png", fullPage: true });
});

test("the DM applies a hit without leaving the party", async ({ page }) => {
  await hub(page);
  await make(page, "Bree Thorn");

  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Party" }).click();

  const row = page.getByTestId("party-row").first();
  const before = (await row.innerText()) ?? "";
  const max = Number(/(\d+)\s*\/\s*(\d+)/.exec(before)?.[2] ?? "0");
  expect(max).toBeGreaterThan(0);

  /* V1's default: the DM types it while narrating rather than waiting for the
     player to find the field. Attributed and reversible, which is the price. */
  await page.getByRole("spinbutton", { name: /^Damage Bree Thorn/ }).fill("2");
  await page.getByRole("button", { name: /^Apply to Bree Thorn/ }).click();
  await expect(page.getByTestId("party-row").first())
    .toContainText(`${String(max - 2)} / ${String(max)}`);

  /* A minus heals, same control. */
  await page.getByRole("spinbutton", { name: /^Damage Bree Thorn/ }).fill("-2");
  await page.getByRole("button", { name: /^Apply to Bree Thorn/ }).click();
  await expect(page.getByTestId("party-row").first())
    .toContainText(`${String(max)} / ${String(max)}`);

  await page.screenshot({ path: "shots/party-hit.png", fullPage: true });

  /* And it lands on the character's own sheet, because there is one number. */
  await toHub(page);
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Sheet" }).click();
  await expect(page.getByTestId("vitals")).toContainText(`${String(max)}`);
});

test("an encounter is kept, and put back on the table next week", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("bestiary-search"))
    .toHaveAttribute("placeholder", /Search/, { timeout: 30_000 });
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("bestiary-row").first().click();
  await expect(page.getByTestId("staged-row")).toHaveCount(2);

  /* Keep what is already staged. Asking the DM to rebuild it in a second form
     would be asking twice for the same thing. */
  await bar(page).getByRole("button", { name: "Prep" }).click();
  /* Prep opens on Overview, as the mockup does — the rail navigates and the
     middle column shows one section. */
  await page.getByRole("navigation", { name: "Session outline" })
    .getByRole("button", { name: "Encounters" }).click();
  await expect(page.getByTestId("prep-empty")).toBeVisible();
  await page.getByRole("button", { name: "Keep what is staged" }).click();
  await expect(page.getByTestId("encounter-card")).toHaveCount(1);
  await expect(page.getByTestId("encounters")).toContainText("2 creatures");

  /* Clear the table entirely, the way a week passing would. */
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await page.getByRole("button", { name: "Clear the table" }).click();
  await expect(page.getByTestId("staged-row")).toHaveCount(0);

  /* And put it back. Fresh: nothing carries over from the last run. */
  await bar(page).getByRole("button", { name: "Prep" }).click();
  await page.getByRole("navigation", { name: "Session outline" })
    .getByRole("button", { name: "Encounters" }).click();
  await page.getByRole("button", { name: /^Put .* on the table/ }).click();
  await expect(page.getByTestId("staged-row")).toHaveCount(2);

  await bar(page).getByRole("button", { name: "Prep" }).click();
  await page.screenshot({ path: "shots/prep.png", fullPage: true });

  /* It is in the log like everything else. */
  await page.reload();
  await bar(page).getByRole("button", { name: "Prep" }).click();
  await page.getByRole("navigation", { name: "Session outline" })
    .getByRole("button", { name: "Encounters" }).click();
  await expect(page.getByTestId("encounter-card")).toHaveCount(1);
});

test("an encounter is built from nothing, without staging first", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Prep" }).click();
  /* Prep opens on Overview, as the mockup does — the rail navigates and the
     middle column shows one section. */
  await page.getByRole("navigation", { name: "Session outline" })
    .getByRole("button", { name: "Encounters" }).click();
  await expect(page.getByTestId("prep-empty")).toBeVisible();

  /* No fight in progress, nothing staged — the editor is its own way in.
     "Keep what is staged" is left untouched beside it. */
  await page.getByRole("button", { name: "Build one" }).click();
  await expect(page.getByTestId("encounter-editor")).toBeVisible();

  await page.getByPlaceholder("Goblin ambush").fill("Roadside ambush");

  await page.getByRole("tab", { name: "Creatures" }).click();
  await expect(page.getByTestId("builder-search")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("builder-search").fill("goblin");
  await page.getByTestId("builder-hit").first().click();
  await expect(page.getByTestId("builder-entry")).toHaveCount(1);

  /* The stepper sums instances rather than adding a second row. */
  await page.getByRole("button", { name: /^One more/ }).click();
  await expect(page.getByTestId("builder-entry")).toContainText("2");

  /* Per-group disclosure, the thing the port dropped and T32 brought back —
     defaults hidden, one tap slides it up. */
  await expect(page.getByRole("button", { name: /disclosure/ })).toContainText("hidden");
  await page.getByRole("button", { name: /disclosure/ }).click();
  await expect(page.getByRole("button", { name: /disclosure/ })).toContainText("present");

  /* The working, not only a verdict — raw × multiplier = adjusted. */
  await expect(page.getByTestId("editor-working")).toContainText("×");

  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByTestId("encounter-card")).toHaveCount(1);
  await expect(page.getByTestId("encounters")).toContainText("Roadside ambush");
  await expect(page.getByTestId("encounters")).toContainText("2 creatures");

  /* It is in the log like everything else. */
  await page.reload();
  await bar(page).getByRole("button", { name: "Prep" }).click();
  await page.getByRole("navigation", { name: "Session outline" })
    .getByRole("button", { name: "Encounters" }).click();
  await expect(page.getByTestId("encounters")).toContainText("Roadside ambush");
});

/*
 * The point of the whole phase: what is prepared reaches the table intact.
 *
 * The creatures, the ROOM and the notes travel together — `openActs` has done
 * that since Task 19, and this is the first time a DM can assemble all three
 * in one place and press one button.
 */
test("an encounter built with an environment arrives on the table with it", async ({ page }) => {
  await hub(page);
  await bar(page).getByRole("button", { name: "Prep" }).click();
  await page.getByRole("navigation", { name: "Session outline" })
    .getByRole("button", { name: "Encounters" }).click();
  await page.getByRole("button", { name: "Build one" }).click();

  await page.getByPlaceholder("Goblin ambush").fill("The dark cellar");

  await page.getByRole("tab", { name: "Creatures" }).click();
  await expect(page.getByTestId("builder-search")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("builder-search").fill("goblin");
  await page.getByTestId("builder-hit").first().click();
  await expect(page.getByTestId("builder-entry")).toHaveCount(1);

  /* The environment is on the encounter, and `RoomPicker` is the same control
     the fight screen uses to change it mid-session. */
  await page.getByRole("tab", { name: "Environment" }).click();
  await page.getByRole("button", { name: "Prepare light dark" }).click();
  await page.getByRole("button", { name: "Prepare difficult ground" }).click();

  await page.getByRole("button", { name: "Send to combat" }).click();

  /* On the fight, with the room set — not merely staged into daylight. */
  await expect(page.getByRole("button", { name: "The room" })).toContainText("dark");
  await expect(page.getByRole("button", { name: "The room" })).toContainText("difficult ground");
  await expect(page.getByTestId("staged")).toContainText("Goblin");

  /* And it was written down on the way past, not only staged. */
  await bar(page).getByRole("button", { name: "Prep" }).click();
  await page.getByRole("navigation", { name: "Session outline" })
    .getByRole("button", { name: "Encounters" }).click();
  await expect(page.getByTestId("encounters")).toContainText("The dark cellar");
});

test("spells are reachable by both seats; the bestiary only by the DM's", async ({ page }) => {
  /*
   * Task 47's reason still holds for HALF of this screen: a player who can
   * look up the statblock knows the armour class and the hit points, which is
   * exactly what the disclosure ladder exists to withhold. What Task 48
   * changes is that a spell's text is not that kind of secret — V1's whole
   * argument for building this screen at all was a player already reading
   * their own spell while the DM had none. So the Book TAB is no longer
   * seat-gated; the bestiary SECTION inside `BookScreen.tsx` still is.
   */
  await hub(page);
  await make(page, "Bree Thorn");

  await bar(page).getByRole("button", { name: "Book" }).click();
  /* The spell index is 1.2MB and pulled on first open, so the rows arriving
     IS the loaded signal. */
  await expect(page.getByTestId("spell-row").first()).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("spell-search").fill("hold person");
  const spell = page.getByTestId("spell-row").first();
  await expect(spell).toContainText("Hold Person");
  await spell.getByRole("button").click();
  await expect(spell.getByTestId("spell-detail")).toContainText("paralyzed");

  /* No bestiary here at all — not merely unreachable once inside. */
  await expect(page.getByTestId("book-search")).toHaveCount(0);
  await expect(page.getByTestId("book-row")).toHaveCount(0);

  /* Back to the DM's chair: both sections are on the one screen. Via `toHub`,
     because the DM's bar has no Characters: Task 26 dropped it, and reaching
     the seat control from a DM screen goes through the log. */
  await toHub(page);
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Book" }).click();
  await expect(page.getByTestId("book-row").first()).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("book-search").fill("adult black dragon");
  const dragon = page.getByTestId("book-row").first();
  await expect(dragon).toContainText("CR 14");
  await dragon.getByRole("button").click();
  await expect(dragon.getByTestId("statblock")).toContainText("Multiattack");
});

test("a staged creature shows everything it can do", async ({ page }) => {
  /*
   * The gap this closes. `creatures.ts` has had a `statblock()` loader since
   * the content layer was written and **nothing ever called it**, so a staged
   * creature was a name, an armour class and a hit point total. Every trait,
   * every reaction and every legendary action was on disk and on no screen.
   *
   * V1 measured its own, smaller version of this: 17 of 57 entries surviving
   * staging across seven common monsters. The line it was quietest about is
   * Multiattack, which is dropped from nearly every statblock in the game and
   * is the one that says how many times to swing.
   */
  await hub(page);
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await page.getByTestId("bestiary-search").fill("adult red dragon");
  await page.getByTestId("bestiary-row").first().click();

  const row = page.getByTestId("staged-row").first();

  /* Closed until asked: one statblock is 1KB, all 6,633 are 2.3MB gzipped. */
  await expect(row.getByTestId("statblock")).toHaveCount(0);
  await row.getByTestId("statblock-toggle").click();

  const block = row.getByTestId("statblock");
  await expect(block).toContainText("Multiattack");
  await expect(block).toContainText("Legendary Resistance");
  await expect(block).toContainText("Frightful Presence");

  /* An action's numbers on a line of their own, which is the whole point: a
     DM reads them at arm's length instead of leaving the fight to look up the
     bite they have made forty times tonight. */
  await expect(block).toContainText("+14 to hit");

  /* And nothing here throws anything. The number still comes from a person. */
  await expect(block.locator("button")).toHaveCount(0);
});

test("reinforcements join a fight without wiping it", async ({ page }) => {
  /*
   * Arturo's distinction, end to end: "an Encounter should be something the DM
   * prepped for. A Creature Group can be an on-the-fly cluster for an
   * impromptu battle or addition to an established encounter."
   *
   * They are not two records. They are the same entries with a different verb —
   * "To the table" clears and sets the room, "Reinforce" does neither — and
   * before this the second was impossible: `openActs` always began with
   * `clear`, so anything sent to a running fight wiped it first.
   */
  await hub(page);
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await page.getByTestId("bestiary-search").fill("adult red dragon");
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("initiative").first().fill("18");
  await page.getByRole("button", { name: /^Begin/ }).click();
  await expect(page.getByTestId("staged-row")).toHaveCount(1);

  /* Keep what is out there as an encounter, so there is something to send. */
  await bar(page).getByRole("button", { name: "Prep" }).click();
  await page.getByRole("button", { name: "Encounters", exact: false }).first().click();
  await page.getByRole("button", { name: "Keep what is staged" }).click();
  await expect(page.getByTestId("encounter-card")).toHaveCount(1);

  const reinforce = page.getByTestId("reinforce").first();
  await expect(reinforce).toBeVisible();
  await reinforce.click();

  /* The dragon is still there, and still the one whose go it is. */
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("staged")).toContainText("Adult Red Dragon");
  await expect(page.getByTestId("staged-row")).not.toHaveCount(1);
});

test("a creature's turn is spent, and a dragon acts on somebody else's", async ({ page }) => {
  /*
   * V1's combat.ts, the half V2 never had. Its own note on why the economy
   * exists: before it, "a DM running six goblins tracked 'has that one used
   * its bonus action' in their head, six times, every round."
   *
   * And the legendary rule that makes a dragon a dragon — taken on somebody
   * ELSE's turn, never its own, from a budget that only returns when its turn
   * opens. `content/legendary.ts` has held `mayTake` with that rule since the
   * content layer was written and nothing ever called it.
   */
  await hub(page);
  await bar(page).getByRole("button", { name: "Combat" }).click();

  await page.getByTestId("bestiary-search").fill("adult red dragon");
  await page.getByTestId("bestiary-row").first().click();
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();

  const dragon = page.getByTestId("staged-row").first();
  const goblin = page.getByTestId("staged-row").nth(1);
  await dragon.getByTestId("initiative").fill("20");
  await goblin.getByTestId("initiative").fill("5");

  /* Nothing to spend before there are turns to spend it in. */
  await expect(page.getByTestId("econ-action")).toHaveCount(0);
  await page.getByRole("button", { name: /^Begin/ }).click();
  await expect(dragon.getByTestId("econ-action")).toBeVisible();

  /* The dragon is up, so it may NOT take a legendary action: "a dragon that
     legendary-acts on its own turn is taking four actions instead of one." */
  await expect(dragon.getByTestId("legendary-left")).toContainText("3 legendary left");
  await dragon.getByTestId("statblock-toggle").click();
  await expect(dragon.getByTestId("legendary-option")).toHaveCount(0);

  /* Spend its action; the goblin's is untouched — the whole point of one
     economy per creature rather than one for the table. */
  await dragon.getByTestId("econ-action").click();
  await expect(dragon.getByTestId("econ-action")).toHaveAttribute("aria-pressed", "true");
  await expect(goblin.getByTestId("econ-action")).toHaveAttribute("aria-pressed", "false");

  /* Now the goblin's turn — and the dragon's options become things to take. */
  await page.getByRole("button", { name: /^Next:/ }).click();
  await expect(dragon.getByTestId("legendary-option").first()).toBeVisible();
  await dragon.getByTestId("legendary-option").first().click();
  await expect(dragon.getByTestId("legendary-left")).toContainText("2 legendary left");

  /* Round the table: the dragon's own turn opens and everything comes back. */
  await page.getByRole("button", { name: /^Next:/ }).click();
  await expect(dragon.getByTestId("legendary-left")).toContainText("3 legendary left");
  await expect(dragon.getByTestId("econ-action")).toHaveAttribute("aria-pressed", "false");
});

test("a player is taught what a turn holds, not just what they can swing", async ({ page }) => {
  /*
   * V1's `actions.ts`, and its whole argument: "a new player's turn is not
   * limited by the rules, it is limited by not knowing what is on the menu.
   * Nobody discovers Dodge by reading a character sheet."
   *
   * This screen could swing an attack and name nothing else.
   */
  await hub(page);
  await make(page, "Bree Thorn");

  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().click();

  const goblin = page.getByTestId("staged-row").first();
  await goblin.getByRole("spinbutton", { name: /^Initiative/ }).fill("2");
  await page.getByRole("button", { name: /^Put Bree Thorn in the fight/ }).click();
  await page.getByTestId("staged-row").filter({ hasText: "Bree Thorn" })
    .getByRole("spinbutton", { name: /^Initiative/ }).fill("20");
  await page.getByRole("button", { name: "Begin", exact: true }).click();

  await toHub(page);
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Combat" }).click();

  /* Bree rolled highest, so it is her go and the menu is there. */
  await expect(page.getByTestId("whose-turn")).toHaveText("Your turn");
  await expect(page.getByTestId("turn")).toBeVisible();
  for (const taught of ["Dodge", "Disengage", "Dash", "Hide", "Ready"]) {
    await expect(page.getByTestId("turn")).toContainText(taught);
  }

  /* Everything in hand, then Dodge spends the action. */
  await expect(page.getByTestId("pip-action")).not.toContainText("spent");
  await page.getByRole("button", { name: /^Dodge:/ }).click();
  await expect(page.getByTestId("pip-action")).toContainText("spent");
  await expect(page.getByTestId("pip-bonus")).not.toContainText("spent");

  /* The off-hand swing is still blocked — but for being unarmed, not for the
     action being gone. Bree has nothing on her sheet to swing, and the reason
     given is the one that would actually fix it. A bonus action is not an
     action, and `blockedBecause` asks in that order. */
  await expect(page.getByRole("button", { name: /^Off-hand attack:.*equip a weapon/ }))
    .toBeVisible();

  /* And it stays spent across the goblin's turn, coming back only when hers
     opens again — which is the rule, and the reason a reaction is worth having. */
  await toHub(page);
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await page.getByRole("button", { name: /^Next:/ }).click();
  await page.getByRole("button", { name: /^Next:/ }).click();

  await toHub(page);
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Combat" }).click();
  await expect(page.getByTestId("whose-turn")).toHaveText("Your turn");
  await expect(page.getByTestId("pip-action")).not.toContainText("spent");
});

test("the DM asks for a roll and it arrives over whatever the player is doing", async ({ page }) => {
  /*
   * The claim seam, turned round. V2's claim ran player → DM only, and
   * `nudge.ts` recorded the consequence in writing: "the DM has asked YOU for
   * a roll — needs the claim seam to run the other way and is not built."
   */
  await hub(page);
  await make(page, "Bree Thorn");
  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });

  await bar(page).getByRole("button", { name: "Party" }).click();
  await page.getByTestId("ask-open").click();
  await page.getByTestId("ask-dc").fill("14");
  await page.getByTestId("ask-flavour").fill("You scan the ruins for hidden details.");
  /* Nobody ticked means the whole table — what a DM says most of the time. */
  await expect(page.getByTestId("ask-for")).toContainText("the whole table rolls");
  await page.getByTestId("ask-send").click();

  /* The DM is never asked: they are the one asking. */
  await expect(page.getByTestId("roll-request")).toHaveCount(0);
  await expect(page.getByTestId("ask-answers")).toContainText("Bree Thorn …");

  /* Sitting in Bree, it is already waiting — no tab to visit, no badge to
     notice. And it takes the screen: the scrim swallows the tab bar, which is
     what "interrupts" has to mean or it is just another thing to miss. */
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  const modal = page.getByTestId("roll-request");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Perception Check");
  await expect(modal).toContainText("rolled with Wisdom");
  await expect(modal).toContainText("You scan the ruins for hidden details.");
  await expect(modal.getByTestId("dc")).toHaveText("14");

  /* It rolls nothing. The total comes off a die on the table. */
  await expect(modal).toContainText("Roll a physical die");
  await expect(page.getByTestId("roll-submit")).toBeDisabled();
  await page.getByTestId("roll-total").fill("17");
  await page.getByTestId("roll-submit").click();

  /* Answered, so it is gone — and the DM has the number. */
  await expect(page.getByTestId("roll-request")).toHaveCount(0);
  await toHub(page);
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Party" }).click();
  await expect(page.getByTestId("ask-answers")).toContainText("Bree Thorn 17");

  /* And a save is a different roll, not a check with another word on it. */
  await page.getByTestId("ask-open").click();
  await page.getByTestId("ask-kind-save").click();
  await page.getByTestId("ask-save").selectOption("dex");
  await page.getByTestId("ask-send").click();
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await expect(page.getByTestId("roll-request")).toContainText("Dexterity Saving Throw");
  await expect(page.getByTestId("roll-request")).not.toContainText("Check");
});

test("a level is the DM's to hand over and the player's to take", async ({ page }) => {
  /*
   * Levelling was the player's own button, pressable whenever — and
   * `Hero.tsx` said the other half out loud: "no experience is tracked
   * anywhere", while `encounter.ts` has computed what a fight is worth since
   * Task 31 with nobody to give it to.
   */
  await hub(page);
  await make(page, "Bree Thorn");

  /* Nothing owed, so there is nothing to press. */
  await bar(page).getByRole("button", { name: "Sheet" }).click();
  await expect(page.getByRole("button", { name: /^Level up/ })).toHaveCount(0);

  await bar(page).getByRole("button", { name: "Characters" }).click();
  await page.getByTestId("seat").selectOption({ value: "dm" });
  await bar(page).getByRole("button", { name: "Party" }).click();

  /* Not enough for a level yet: 300 is the second. */
  await page.getByTestId("award-xp").fill("200");
  await page.getByTestId("award-send").click();
  await expect(page.getByTestId("party")).toContainText("200 XP");
  await expect(page.getByTestId("party")).not.toContainText("level waiting");

  await page.getByTestId("award-xp").fill("150");
  await page.getByTestId("award-send").click();
  await expect(page.getByTestId("party")).toContainText("level waiting");

  /* The DM never takes it — which subclass is Bree's to choose. */
  await toHub(page);
  await page.getByTestId("seat").selectOption({ label: "Bree Thorn" });
  await bar(page).getByRole("button", { name: "Sheet" }).click();
  await expect(page.getByRole("button", { name: /^Level up/ })).toBeVisible();
});

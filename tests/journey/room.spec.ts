import { test, expect, type Page, type Browser } from "@playwright/test";

/* Two devices, one room.
 *
 * This is the only tier that can see any of it: a Durable Object, a real
 * WebSocket, two isolated browser contexts, and a log that has to agree. It
 * runs against the worker rather than the preview, because the worker IS the
 * room. */

const WORKER = "/";

/* Two and three browser contexts each, against a local Durable Object. This
   is the heaviest thing in the suite and the only tier that can see any of it;
   30 seconds is a budget written for single-page tests. */
test.describe.configure({ timeout: 90_000 });

const device = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(WORKER);
  await expect(page.locator("html")).toHaveAttribute("data-app", "table-companion-v2");
  return page;
};

const join = async (page: Page, code: string) => {
  await page.getByLabel("Room code").fill(code);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByTestId("link")).toHaveText("Everyone sees this");
};

/*
 * Real events, from a real action.
 *
 * This pressed an "Append" button that wrote a meaningless `tick`. It was
 * Slice 1's debug rig on a screen a player opens and it is gone, so these
 * tests stage creatures instead — one tap, one event, and a thing a DM
 * actually does.
 */
const appendOn = async (page: Page, n: number) => {
  await page.getByTestId("tabbar").getByRole("button", { name: "Combat" }).click();
  await page.getByTestId("bestiary-search").fill("goblin");
  await page.getByTestId("bestiary-row").first().waitFor({ timeout: 30_000 });
  /* Staging is PRIVATE — `visibility.ts` keeps it behind the screen — so it
     buys one row on this device and none on anyone else's. */
  await page.getByTestId("bestiary-row").first().click();
  /* Rolling initiative is public: "roll for initiative" is said out loud. n of
     them is n rows everywhere. */
  const init = page.getByTestId("staged-row").first().getByTestId("initiative");
  for (let i = 0; i < n; i++) await init.fill(String(10 + i));
  await page.getByTestId("tabbar").getByRole("button", { name: "Log" }).click();
};

const CODE = () => {
  const alphabet = "BCDFGHJKLMNPQRSTVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

test("a room is six characters a person can read out loud", async ({ browser }) => {
  const page = await device(browser);
  await page.getByRole("button", { name: "Start one" }).click();
  const code = await page.getByTestId("room-code").textContent();
  expect(code).toMatch(/^[BCDFGHJKLMNPQRSTVWXYZ23456789]{6}$/);
  expect(code).not.toMatch(/[AEIOU01]/);
});

test("what one device writes, the other sees", async ({ browser }) => {
  const code = CODE();
  const dm = await device(browser);
  const player = await device(browser);
  await join(dm, code);
  await join(player, code);

  await appendOn(dm, 3);
  /* Four here: the staging the DM alone may see, and the three rolls. */
  await expect(dm.getByTestId("event")).toHaveCount(4);

  // The other device did not write these and has never met the first one.
  await player.getByRole("button", { name: "Log", exact: true }).click();
  /* Three there: everything public crossed, and the staging did not — which is
     the disclosure ladder holding across devices rather than only on a screen. */
  await expect(player.getByTestId("event")).toHaveCount(3);
});

test("a device that arrives late catches up on everything", async ({ browser }) => {
  const code = CODE();
  const first = await device(browser);
  await join(first, code);
  await appendOn(first, 4);

  const late = await device(browser);
  await join(late, code);
  await late.getByRole("button", { name: "Log", exact: true }).click();
  await expect(late.getByTestId("event")).toHaveCount(4);  // the four public rolls
});

test("undo crosses the table", async ({ browser }) => {
  const code = CODE();
  const a = await device(browser);
  const b = await device(browser);
  await join(a, code);
  await join(b, code);

  await appendOn(a, 2);
  await b.getByRole("button", { name: "Log", exact: true }).click();
  await expect(b.getByTestId("event")).toHaveCount(2);  // the two public rolls

  // Taking something back is an append, so it travels like anything else —
  // and the event it hides is still there on both devices.
  /* The LAST row, which is a roll — the first is the staging, and undoing
     something the far device never saw proves nothing about travelling. */
  await a.getByTestId("event").last().getByRole("button", { name: /^Undo/ }).click();
  /* Still two rows on the far device, one struck through: the marker travels
     and is applied, but is not drawn as a row of its own. */
  await expect(b.getByTestId("event")).toHaveCount(2);
  await expect(b.locator('[data-undone="yes"]')).toHaveCount(1);

});

test("a character built on one device appears on the other", async ({ browser }) => {
  const code = CODE();
  const a = await device(browser);
  const b = await device(browser);
  await join(a, code);
  await join(b, code);

  await a.getByRole("button", { name: /Guided creation/ }).click();
  await a.getByRole("radio").first().click();
  await a.getByRole("button", { name: "Continue" }).click();

  // One choice is enough: the character exists the moment the event does.
  await expect(b.getByTestId("character")).toHaveCount(1);
});

/*
 * The DM's seat, and the key that guards it.
 *
 * Every disclosure rule in this app is enforced by seat — `visibility.ts`
 * filters the log by it, the fight hides creatures by it, `PREP_KINDS` hides
 * prep by it. Until Task 43 all of that was honour-system: "The DM" sat in a
 * dropdown for anyone who joined.
 */
test("a second device cannot take the DM's seat without the key", async ({ browser }) => {
  const dm = await device(browser);
  await dm.getByRole("button", { name: "Start one" }).click();
  const code = (await dm.getByTestId("room-code").textContent())!.trim();

  /* The device that OPENED the room is its DM, and is told the key. */
  await expect(dm.getByTestId("seat")).toBeVisible();

  const player = await device(browser);
  await join(player, code);

  /* No key, no seat. It is absent rather than disabled: a greyed-out "The DM"
     invites somebody to wonder what they are missing. */
  await expect(player.getByTestId("claim-dm")).toBeVisible();
  const options = await player.locator('[data-testid="seat"] option').allTextContents();
  expect(options).not.toContain("The DM");

  await player.close();
  await dm.close();
});

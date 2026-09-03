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

const appendOn = async (page: Page, n: number) => {
  await page.getByRole("button", { name: "Log", exact: true }).click();
  for (let i = 0; i < n; i++) await page.getByRole("button", { name: "Append" }).click();
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
  await expect(dm.getByText("3 live")).toBeVisible();

  // The other device did not write these and has never met the first one.
  await player.getByRole("button", { name: "Log", exact: true }).click();
  await expect(player.getByTestId("event")).toHaveCount(3);
  await expect(player.getByText("3 live")).toBeVisible();
});

test("a device that arrives late catches up on everything", async ({ browser }) => {
  const code = CODE();
  const first = await device(browser);
  await join(first, code);
  await appendOn(first, 4);

  const late = await device(browser);
  await join(late, code);
  await late.getByRole("button", { name: "Log", exact: true }).click();
  await expect(late.getByTestId("event")).toHaveCount(4);
});

test("undo crosses the table", async ({ browser }) => {
  const code = CODE();
  const a = await device(browser);
  const b = await device(browser);
  await join(a, code);
  await join(b, code);

  await appendOn(a, 2);
  await b.getByRole("button", { name: "Log", exact: true }).click();
  await expect(b.getByTestId("event")).toHaveCount(2);

  // Taking something back is an append, so it travels like anything else —
  // and the event it hides is still there on both devices.
  await a.getByRole("button", { name: "Undo event 1" }).click();
  await expect(b.getByTestId("event")).toHaveCount(3);
  await expect(b.locator('[data-undone="yes"]')).toHaveCount(1);
  await expect(b.getByText("1 live")).toBeVisible();
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

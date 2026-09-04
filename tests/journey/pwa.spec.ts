import { test, expect } from "@playwright/test";

/* Installable, and useful without a network.
 *
 * A table opens this on a phone in a basement. Tier 3 is the only place that
 * can see a manifest, a service worker, or what happens when the network goes. */

test("declares itself installable", async ({ page }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const manifest = await page.request.get(new URL(href!, page.url()).href);
  expect(manifest.ok()).toBe(true);
  const m = (await manifest.json()) as {
    name: string; display: string; start_url: string;
    icons: { sizes: string; purpose?: string }[];
  };
  expect(m.name).toBe("Adventurer's Forge");
  expect(m.display).toBe("standalone");
  // A maskable icon, or Android crops the crest into a circle badly.
  expect(m.icons.some((i) => i.purpose === "maskable")).toBe(true);
  expect(m.icons.some((i) => i.sizes === "512x512")).toBe(true);
});

import { defineConfig, devices } from "@playwright/test";

/**
 * The room, against the real runtime.
 *
 * A separate config because this is the only suite that needs a Durable Object
 * and a WebSocket, and `wrangler dev` costs half a minute to boot. Putting
 * every journey behind it took the tier from seconds to six minutes.
 */
export default defineConfig({
  testDir: "tests/journey",
  testMatch: "**/room.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:8791",
    trace: "on-first-retry",
    ...devices["iPhone 14"],
  },
  /*
   * Two servers now: the app, and the compendium beside it.
   *
   * The compendium is no longer shipped with the app — 13,683 files in
   * `dist/` is what makes the worker unable to start — so every tier that
   * renders a character has to be able to reach it. Same shape as production,
   * where it is a published site rather than this little static server.
   */
  webServer: [
    {
      command: "node scripts/serve-content.mjs",
      url: "http://localhost:4272/version.json",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
    command: "VITE_CONTENT_BASE=http://localhost:4272 npm run build && npx wrangler dev --port 8791 --local",
    url: "http://localhost:8791",
    reuseExistingServer: !!process.env["PW_REUSE"],
    timeout: 180_000,
    },
  ],
});

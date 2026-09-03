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
  webServer: {
    command: "npm run build && npx wrangler dev --port 8791 --local",
    url: "http://localhost:8791",
    reuseExistingServer: !!process.env["PW_REUSE"],
    timeout: 180_000,
  },
});

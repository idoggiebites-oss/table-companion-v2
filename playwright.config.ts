import { defineConfig, devices } from "@playwright/test";

/* Tier 3. Small and fixed — the only tier allowed to be slow.
   Never `vite dev`: V1's dev server died under repeated runs and 54 of 60
   suites then reported nothing. A built preview, health-checked. */
export default defineConfig({
  testDir: "tests/journey",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: "list",
  /* Generous on purpose. These are seconds-long tests on an idle machine, but
     tier 3 drives a real browser and a real build, and a busy laptop turns a
     one-second test into a twenty-second one. A timeout that fails under load
     reports a machine, not a defect. */
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4271",
    trace: "on-first-retry",
    ...devices["iPhone 14"],
  },
  testIgnore: "**/room.spec.ts",
  /*
   * The built preview, because these tests are about the app and a preview
   * serves it in a second. The room needs the real runtime instead and has its
   * own config — see playwright.room.config.ts.
   *
   * Port 4271 because 4173 is V1's preview, and a reused server serves the
   * wrong application without saying so — which is what `data-app` catches.
   */
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4271",
    // Opt-in only, for iterating against an already-running worker. Safety
    // comes from the data-app assertion, not from the port being free.
    reuseExistingServer: !!process.env["PW_REUSE"],
    timeout: 180_000,
  },
});

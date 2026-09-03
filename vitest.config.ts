import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  /**
   * Tests never serve public assets, and the compiled compendium in `public/`
   * is 20MB. Leaving it scannable took a single small test file from 615ms to
   * 4.0s, and tier 1 as a whole from 250ms to 14.8s — against a stated budget
   * of five seconds. The journey tier uses the real build and is unaffected.
   */
  publicDir: false,
  test: {
    projects: [
      {
        // Tier 1 — pure. No DOM, no React, no server. Budget: under 5 seconds.
        test: {
          name: "domain",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // Tier 2 — one screen, real Chromium, no server and no navigation.
        plugins: [react()],
        test: {
          name: "component",
          include: ["src/**/*.test.tsx"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});

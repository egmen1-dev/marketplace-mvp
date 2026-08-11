import { defineConfig, devices } from "@playwright/test";

/**
 * Staging acceptance against Railway (no local webServer).
 * Usage: npx playwright test tests/e2e/pickup-reservations.spec.ts -c playwright.railway.config.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL:
      process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

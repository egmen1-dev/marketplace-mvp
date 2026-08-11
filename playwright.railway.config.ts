import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

/**
 * Staging acceptance against Railway (no local webServer).
 * Usage:
 *   E2E_FIXTURE_SECRET=... npx playwright test tests/e2e/pickup*.spec.ts -c playwright.railway.config.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL:
      process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app",
    trace: "off",
    screenshot: "only-on-failure",
    locale: "ru-RU",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
/** Must match AUTH / NEXT_PUBLIC_APP_URL host (localhost ≠ 127.0.0.1 for cookies+CORS). */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "ru-RU",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: baseURL,
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
    },
  },
});

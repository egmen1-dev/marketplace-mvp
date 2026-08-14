import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

/** Read DATABASE_URL from `.env` text — avoid Vercel `.env.production.local`. */
function readLocalDatabaseUrl(): string | undefined {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
      if (!m) continue;
      return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
  return process.env.DATABASE_URL;
}

const localDatabaseUrl = readLocalDatabaseUrl();

/** Local Playwright default — staging/CI should set E2E_FIXTURE_SECRET explicitly. */
const e2eFixtureSecret =
  process.env.E2E_FIXTURE_SECRET?.trim() || "local-e2e-fixture-secret";
process.env.E2E_FIXTURE_SECRET = e2eFixtureSecret;

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
    // Reduce Chromium password-manager autofill races that rewrite inputs
    // before React hydrates (intermittent #418 on /auth/sign-in mid-suite).
    launchOptions: {
      args: [
        "--disable-features=AutofillServerCommunication,PasswordManagerOnboarding",
      ],
    },
  },
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      ...process.env,
      // process.env wins over Next `.env.production.local` (Prisma cloud / Vercel).
      ...(localDatabaseUrl ? { DATABASE_URL: localDatabaseUrl } : {}),
      NEXT_PUBLIC_APP_URL: baseURL,
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      E2E_FIXTURE_SECRET: e2eFixtureSecret,
    },
  },
});

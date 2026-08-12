/**
 * ADS-READY-001.1 — capture admin ads + product eligibility screenshots.
 * Usage: BASE_URL=https://web-production-e56fb.up.railway.app node scripts/ads-acceptance-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = "/opt/cursor/artifacts/screenshots";
const ADMIN_EMAIL = "admin@demo.lot";
const ADMIN_PASSWORD = "demo1234";

async function signIn(page, email, password) {
  await page.goto(`${BASE}/auth/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 30_000,
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${BASE}/admin/ads`);
  await page.waitForSelector('[data-testid="admin-ads-panel"]', {
    timeout: 30_000,
  });
  await page.screenshot({
    path: `${OUT}/admin-ads-dashboard.png`,
    fullPage: true,
  });

  await page.getByTestId("ads-filter-ready").click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${OUT}/ready-product.png`,
    fullPage: false,
  });

  await page.getByTestId("ads-filter-blocked").click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${OUT}/blocked-product.png`,
    fullPage: false,
  });

  await browser.close();
  console.log("Screenshots saved to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

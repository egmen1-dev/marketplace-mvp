/**
 * RELEASE-CANDIDATE-001 — capture staging screenshots.
 * Usage: node scripts/rc-screenshots.mjs
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "docs/acceptance/rc-001/screenshots");

const DEMO = {
  adminEmail: "admin@demo.lot",
  password: "demo1234",
};

async function signIn(page, email) {
  await page.goto(`${BASE}/auth/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(DEMO.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 30_000,
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Desktop 1440
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?utm_source=vk&utm_medium=cpc`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "desktop-homepage-1440.png") });

    await page.goto(`${BASE}/catalog`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "desktop-catalog-1440.png") });

    const productLink = page.locator('main a[href^="/product/"]').first();
    await productLink.click();
    await page.waitForURL(/\/product\//);
    await page.screenshot({ path: join(OUT, "desktop-pdp-1440.png") });

    await page.getByRole("button", { name: "В корзину" }).first().click();
    await page.goto(`${BASE}/cart`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "desktop-cart-1440.png") });

    await signIn(page, "buyer@demo.lot");
    await page.goto(`${BASE}/checkout`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "desktop-checkout-1440.png") });

    await signIn(page, DEMO.adminEmail);
    await page.goto(`${BASE}/admin/conversion`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "admin-conversion-1440.png") });

    await page.goto(`${BASE}/admin/ads`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "admin-ads-1440.png") });

    await ctx.close();
  }

  // Mobile 390
  {
    const ctx = await browser.newContext({
      ...devices["Pixel 5"],
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?utm_source=vk`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "mobile-homepage-390.png") });

    const productLink = page.locator('main a[href^="/product/"]').first();
    await page.goto(`${BASE}/catalog`);
    await productLink.click();
    await page.waitForURL(/\/product\//);
    await page.screenshot({ path: join(OUT, "mobile-pdp-390.png") });

    await page.getByRole("button", { name: "В корзину" }).first().click();
    await page.goto(`${BASE}/cart`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(OUT, "mobile-cart-390.png") });

    await ctx.close();
  }

  await browser.close();
  console.log("Screenshots saved to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * DESIGN-001.1 — homepage visual conversion acceptance screenshots.
 * Usage: BASE_URL=http://localhost:3000 node scripts/design-001-1-audit-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "/opt/cursor/artifacts/screenshots";
const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

async function waitHome(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(".home-marketplace", { timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function desktopShots(browser) {
  for (const [name, width, height] of [
    ["design001-desktop-1920-home-top", 1920, 1080],
    ["design001-desktop-1440-home-top", 1440, 900],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      locale: "ru-RU",
    });
    const page = await ctx.newPage();
    await waitHome(page);
    await page.screenshot({
      path: path.join(OUT, `${name}.png`),
      fullPage: false,
    });
    await page.locator("h1").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(OUT, `${name.replace("home-top", "hero")}.png`),
    });
    const categories = page.locator("text=Популярные категории").first();
    await categories.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `${name.replace("home-top", "categories")}.png`),
    });
    const products = page.locator("text=Популярные товары").first();
    await products.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `${name.replace("home-top", "products")}.png`),
    });
    await ctx.close();
  }
}

async function mobileShots(browser) {
  const ctx = await browser.newContext({
    userAgent: VK_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "ru-RU",
  });
  const page = await ctx.newPage();
  await waitHome(page);
  await page.screenshot({
    path: path.join(OUT, "design001-mobile-390-first-screen.png"),
    fullPage: false,
  });
  await page.evaluate(() => window.scrollBy(0, 520));
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT, "design001-mobile-390-after-scroll.png"),
    fullPage: false,
  });
  const categories = page.locator("text=Популярные категории").first();
  await categories.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "design001-mobile-390-categories.png"),
  });
  const products = page.locator("text=Популярные товары").first();
  await products.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "design001-mobile-390-product-cards.png"),
  });
  await ctx.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  await desktopShots(browser);
  await mobileShots(browser);
  await browser.close();
  console.log("Screenshots saved to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

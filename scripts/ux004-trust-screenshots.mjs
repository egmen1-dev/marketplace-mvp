/**
 * HOTFIX-UX-004 trust layer screenshots (VK 390px).
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = "/opt/cursor/artifacts/screenshots";
const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent: VK_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(OUT, "ux004-vk-homepage-trust-390.png"),
  });

  await page.goto(`${BASE}/catalog`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, "ux004-vk-catalog-trust-390.png"),
  });

  await page.goto(`${BASE}/catalog`, { waitUntil: "domcontentloaded" });
  const link = page.locator('main a[href^="/product/"]').first();
  if (await link.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await link.click();
    await page.waitForURL(/\/product\//);
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(OUT, "ux004-vk-pdp-trust-390.png"),
      fullPage: true,
    });
  }

  await ctx.close();
  await browser.close();
  console.log("saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

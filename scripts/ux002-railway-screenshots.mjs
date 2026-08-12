/**
 * HOTFIX-UX-002 Railway acceptance screenshots (VK WebView UA, 390px).
 * Usage: node scripts/ux002-railway-screenshots.mjs [prefix]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = "/opt/cursor/artifacts/screenshots";
const PREFIX = process.argv[2] ?? "ux002-after";
const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

const routes = [
  { name: "homepage", path: "/" },
  { name: "catalog", path: "/catalog" },
  { name: "login", path: "/auth/sign-in" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent: VK_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  for (const route of routes) {
    await page.goto(`${BASE}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(1500);
    const file = path.join(OUT, `${PREFIX}-${route.name}-390.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("saved", file);
  }

  await page.goto(`${BASE}/catalog`, { waitUntil: "domcontentloaded" });
  const product = page.locator('main a[href^="/product/"]').first();
  if (await product.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await product.click();
    await page.waitForURL(/\/product\//, { timeout: 20_000 });
    await page.waitForTimeout(1000);
    const pdpFile = path.join(OUT, `${PREFIX}-pdp-390.png`);
    await page.screenshot({ path: pdpFile, fullPage: false });
    console.log("saved", pdpFile);
  } else {
    console.warn("PDP link not found — skipped pdp screenshot");
  }

  const markers = await page.evaluate(() => ({
    webviewCompat: document.documentElement.classList.contains("webview-compat"),
    bootSplash: Boolean(document.getElementById("boot-splash")),
    h1: Boolean(document.querySelector("h1")),
  }));
  console.log("markers", JSON.stringify(markers));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

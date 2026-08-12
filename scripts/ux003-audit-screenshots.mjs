/**
 * HOTFIX-UX-003 conversion audit screenshots.
 */
import { chromium, devices } from "playwright";
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

  const vk = await browser.newContext({
    userAgent: VK_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const vkPage = await vk.newPage();
  for (const entry of [
    ["ux003-vk-homepage-390", "/"],
    ["ux003-vk-catalog-390", "/catalog"],
    ["ux003-vk-cart-390", "/cart"],
  ]) {
    const [name, url] = entry;
    await vkPage.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    await vkPage.waitForTimeout(1200);
    await vkPage.screenshot({
      path: path.join(OUT, `${name}.png`),
      fullPage: false,
    });
  }
  await vkPage.goto(`${BASE}/catalog`, { waitUntil: "domcontentloaded" });
  const link = vkPage.locator('main a[href^="/product/"]').first();
  if (await link.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await link.click();
    await vkPage.waitForURL(/\/product\//);
    await vkPage.waitForTimeout(1000);
    await vkPage.screenshot({
      path: path.join(OUT, "ux003-vk-pdp-390.png"),
    });
  }
  await vk.close();

  const chrome = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "ru-RU",
  });
  const chromePage = await chrome.newPage();
  await chromePage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await chromePage.waitForTimeout(1000);
  await chromePage.screenshot({
    path: path.join(OUT, "ux003-chrome-homepage-390.png"),
  });
  await chrome.close();

  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ru-RU",
  });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({
    path: path.join(OUT, "ux003-desktop-homepage.png"),
  });
  await desktop.close();

  await browser.close();
  console.log("screenshots saved to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * HOTFIX-UX-005 ads measurement screenshots (VK 390px + admin funnel).
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = "/opt/cursor/artifacts/screenshots";
const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";
const UTM =
  "?utm_source=vk&utm_medium=cpc&utm_campaign=ux005_demo&utm_content=shot";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent: VK_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/${UTM}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(OUT, "ux005-vk-landing-utm-390.png"),
  });

  await page.goto(`${BASE}/catalog`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, "ux005-vk-catalog-390.png"),
  });

  const link = page.locator('main a[href^="/product/"]').first();
  if (await link.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await link.click();
    await page.waitForURL(/\/product\//);
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(OUT, "ux005-vk-pdp-390.png"),
    });
  }

  await ctx.close();

  const adminCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const adminPage = await adminCtx.newPage();
  await adminPage.goto(`${BASE}/auth/sign-in`, { waitUntil: "domcontentloaded" });
  await adminPage.getByLabel("Email").fill("admin@demo.lot");
  await adminPage.getByLabel("Пароль").fill("demo1234");
  await adminPage.getByRole("button", { name: "Войти" }).click();
  await adminPage.waitForURL(/\/(admin|account|$)/, { timeout: 20_000 }).catch(() => {});
  await adminPage.goto(`${BASE}/admin/analytics`, { waitUntil: "networkidle" });
  await adminPage.waitForTimeout(1500);
  await adminPage.screenshot({
    path: path.join(OUT, "ux005-admin-analytics-funnel.png"),
    fullPage: true,
  });

  await adminCtx.close();
  await browser.close();
  console.log("saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

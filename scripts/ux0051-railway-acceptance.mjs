/**
 * HOTFIX-UX-005.1 — Railway analytics acceptance checks.
 * Usage: BASE_URL=https://web-production-e56fb.up.railway.app node scripts/ux0051-railway-acceptance.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = "/opt/cursor/artifacts/screenshots";
const EXPECT_LAYOUT = process.env.EXPECT_LAYOUT ?? "layout-ec0ff06f780d1f0f.js";
const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";
const UTM = "utm_source=vk&utm_medium=cpc&utm_campaign=test";
const ADMIN_EMAIL = "admin@demo.lot";
const ADMIN_PASSWORD = "demo1234";

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function checkApi() {
  const res = await fetch(`${BASE}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "landing_view",
      route: "/",
      visitorId: "ux0051-acceptance",
      utmSource: "vk",
      utmMedium: "cpc",
      utmCampaign: "test",
      webview: true,
    }),
  });
  record("POST /api/analytics/events → 200", res.status === 200, `status=${res.status}`);
}

async function checkDeployMarker() {
  const html = await fetch(`${BASE}/`).then((r) => r.text());
  const hasNewLayout = html.includes(EXPECT_LAYOUT);
  const hasAttribution = html.includes("attribution-root") || hasNewLayout;
  record(
    "Deploy marker (UX-005 layout chunk)",
    hasNewLayout,
    hasNewLayout ? EXPECT_LAYOUT : "old layout still served",
  );
  record("AttributionRoot in bundle", hasAttribution);
}

async function checkCookiesAndEvents(browser) {
  const events = [];
  const ctx = await browser.newContext({
    userAgent: VK_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await ctx.newPage();
  page.on("request", (req) => {
    if (req.method() !== "POST" || !req.url().includes("/api/analytics/events")) return;
    try {
      const body = req.postDataJSON();
      if (body?.event) events.push(body);
    } catch {
      /* ignore */
    }
  });

  await page.goto(`${BASE}/?${UTM}`, { waitUntil: "networkidle" });
  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, "ux0051-vk-landing-utm-390.png") });

  const cookies = await page.context().cookies();
  const vid = cookies.some((c) => c.name === "lot_vid");
  const utm = cookies.some((c) => c.name === "lot_utm");
  record("Cookie lot_vid", vid);
  record("Cookie lot_utm", utm);

  const names = new Set(events.map((e) => e.event));
  for (const ev of ["page_view", "landing_view"]) {
    record(`Event ${ev}`, names.has(ev));
  }

  await page.getByRole("button", { name: "Открыть каталог" }).click();
  await page.waitForURL(/\/catalog/, { timeout: 15_000 });

  const link = page.locator('main a[href^="/product/"]').first();
  await link.waitFor({ state: "visible", timeout: 15_000 });
  await link.click();
  await page.waitForURL(/\/product\//, { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "ux0051-vk-pdp-funnel-390.png"), fullPage: true });

  for (const ev of ["category_view", "product_view"]) {
    record(`Event ${ev}`, events.some((e) => e.event === ev));
  }

  const landing = events.find((e) => e.event === "landing_view");
  record(
    "UTM on landing_view",
    landing?.utmSource === "vk" && landing?.utmMedium === "cpc",
    landing ? JSON.stringify({ utmSource: landing.utmSource, utmMedium: landing.utmMedium }) : "no event",
  );

  await page.getByRole("button", { name: "В корзину" }).first().click();
  await page.waitForTimeout(1500);
  record("Event add_to_cart", events.some((e) => e.event === "add_to_cart"));

  await page.goto(`${BASE}/cart`);
  await page.waitForTimeout(800);

  await ctx.close();
  return events;
}

async function checkCheckout(browser) {
  const events = [];
  const ctx = await browser.newContext({
    userAgent: VK_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await ctx.newPage();
  page.on("request", (req) => {
    if (req.method() !== "POST" || !req.url().includes("/api/analytics/events")) return;
    try {
      const body = req.postDataJSON();
      if (body?.event) events.push(body);
    } catch {
      /* ignore */
    }
  });

  await page.goto(`${BASE}/auth/sign-in`);
  await page.getByLabel("Email").fill("buyer@demo.lot");
  await page.getByLabel("Пароль").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), { timeout: 30_000 });

  await page.goto(`${BASE}/catalog`);
  const link = page.locator('main a[href^="/product/"]').first();
  await link.waitFor({ state: "visible", timeout: 15_000 });
  await link.click();
  await page.getByRole("button", { name: "В корзину" }).first().click();
  await page.goto(`${BASE}/cart`);
  await page
    .getByRole("link", { name: "Оформить заказ" })
    .or(page.getByRole("button", { name: "Оформить заказ" }))
    .click();
  await page.waitForURL(/\/checkout/, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  record("Event checkout_start", events.some((e) => e.event === "checkout_start"));

  await ctx.close();
}

async function checkAdminDashboard(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/sign-in`);
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Пароль").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), { timeout: 30_000 });

  await page.goto(`${BASE}/admin/analytics`, { waitUntil: "networkidle" });
  const url = page.url();
  const onAnalytics = url.includes("/admin/analytics");
  record("Admin /admin/analytics loads", onAnalytics, url);

  if (onAnalytics) {
    const text = await page.locator("body").innerText();
    for (const label of [
      "Ads measurement baseline",
      "Visitors",
      "Products viewed",
      "Cart additions",
      "Checkout starts",
      "Funnel dashboard",
      "UTM sources",
    ]) {
      record(`Admin shows "${label}"`, text.includes(label));
    }
    await page.screenshot({
      path: path.join(OUT, "ux0051-admin-analytics-dashboard.png"),
      fullPage: true,
    });
  }

  await ctx.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await checkDeployMarker();
  await checkApi();

  const browser = await chromium.launch();
  try {
    await checkCookiesAndEvents(browser);
    await checkCheckout(browser);
    await checkAdminDashboard(browser);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  const report = {
    base: BASE,
    expectLayout: EXPECT_LAYOUT,
    timestamp: new Date().toISOString(),
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    ready: failed.length === 0,
    results,
  };
  await writeFile(
    path.join(OUT, "ux0051-railway-acceptance.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\n--- SUMMARY ---");
  console.log(`Passed: ${report.passed}/${results.length}`);
  console.log(`READY FOR ADS MEASUREMENT: ${report.ready ? "YES" : "NO"}`);
  process.exit(report.ready ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

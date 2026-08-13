/**
 * DESIGN-001.1 — Web Vitals + paint timing on homepage.
 */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "/opt/cursor/artifacts";

const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

async function measure(label, viewport, userAgent) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport,
    userAgent,
    isMobile: viewport.width < 500,
  });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    window.__vitals = { lcp: null, cls: 0, fcp: null };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          window.__vitals.fcp = entry.startTime;
        }
      }
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries.at(-1);
      if (last) window.__vitals.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(".home-marketplace", { timeout: 30_000 });
  await page.waitForTimeout(1500);

  const vitals = await page.evaluate(() => window.__vitals);
  const hydration = await page.evaluate(() => ({
    webviewCompat: document.documentElement.classList.contains("webview-compat"),
    bootSplash: document.querySelectorAll("#boot-splash").length,
    heroSearch: !!document.querySelector('[data-testid="home-hero-search"]'),
  }));
  const paintMs = Date.now() - t0;

  await ctx.close();
  await browser.close();

  return {
    label,
    paintMs,
    fcpMs: vitals.fcp != null ? Math.round(vitals.fcp) : null,
    lcpMs: vitals.lcp != null ? Math.round(vitals.lcp) : null,
    cls: vitals.cls != null ? Number(vitals.cls.toFixed(4)) : null,
    ...hydration,
  };
}

async function main() {
  const results = {
    desktop1440: await measure(
      "desktop1440",
      { width: 1440, height: 900 },
      undefined,
    ),
    mobile390Vk: await measure(
      "mobile390Vk",
      { width: 390, height: 844 },
      VK_UA,
    ),
  };

  const outPath = path.join(OUT, "design001-performance.json");
  await writeFile(outPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

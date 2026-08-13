/**
 * RELEASE-CANDIDATE-001 — measure LCP/CLS on staging (Playwright Performance API).
 */
import { chromium } from "@playwright/test";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";

async function measure(url, viewport) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      let lcp = 0;
      let cls = 0;
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "largest-contentful-paint") {
            lcp = entry.startTime;
          }
          if (entry.entryType === "layout-shift" && !entry.hadRecentInput) {
            cls += entry.value;
          }
        }
      });
      try {
        po.observe({ type: "largest-contentful-paint", buffered: true });
        po.observe({ type: "layout-shift", buffered: true });
      } catch {
        /* unsupported */
      }
      setTimeout(() => {
        po.disconnect();
        resolve({ lcp: Math.round(lcp), cls: Number(cls.toFixed(4)) });
      }, 3000);
    });
  });

  await browser.close();
  return metrics;
}

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
];

for (const vp of viewports) {
  for (const path of ["/", "/catalog"]) {
    const url = `${BASE}${path}`;
    const m = await measure(url, { width: vp.width, height: vp.height });
    console.log(`${vp.name} ${path}: LCP=${m.lcp}ms CLS=${m.cls}`);
  }
}

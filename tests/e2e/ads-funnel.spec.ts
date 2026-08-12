import { expect, test, type Page } from "@playwright/test";

import { attachErrorCollector } from "./helpers";

const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

const UTM_QUERY =
  "utm_source=vk&utm_medium=cpc&utm_campaign=ads_ready_001&utm_content=e2e";

type AnalyticsPayload = {
  event: string;
  visitorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  webview?: boolean;
};

async function collectAnalytics(page: Page): Promise<AnalyticsPayload[]> {
  const events: AnalyticsPayload[] = [];
  page.on("request", (req) => {
    if (req.method() !== "POST" || !req.url().includes("/api/analytics/events")) {
      return;
    }
    try {
      const body = req.postDataJSON() as AnalyticsPayload;
      if (body?.event) events.push(body);
    } catch {
      /* ignore malformed */
    }
  });
  return events;
}

function waitForEvent(
  events: AnalyticsPayload[],
  name: string,
  timeoutMs = 20_000,
): Promise<AnalyticsPayload> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const hit = events.find((e) => e.event === name);
      if (hit) {
        resolve(hit);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for analytics event: ${name}`));
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

test.describe("ADS-READY-001 ads funnel", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("VK mobile — landing → product → cart analytics", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);
    const events = await collectAnalytics(page);

    await page.goto(`/?${UTM_QUERY}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 5000,
    });

    await waitForEvent(events, "page_view");
    const adLanding = await waitForEvent(events, "ad_landing_view");
    expect(adLanding.utmSource).toBe("vk");
    expect(adLanding.utmMedium).toBe("cpc");
    expect(adLanding.utmCampaign).toBe("ads_ready_001");
    expect(adLanding.visitorId).toBeTruthy();

    const productLink = page.locator('main a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 15_000 });
    await waitForEvent(events, "product_view");

    await page.getByRole("button", { name: "В корзину" }).first().click();
    await waitForEvent(events, "add_to_cart");

    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/vk-ad-funnel.png",
      fullPage: false,
    });

    errors.assertClean();
    await ctx.close();
  });
});

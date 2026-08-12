import { expect, test, type Page } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

const UTM =
  "?utm_source=vk&utm_medium=cpc&utm_campaign=ux005_test&utm_content=e2e";

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

test.describe("HOTFIX-UX-005 ads measurement baseline", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("VK mobile funnel — UTM cookies + conversion events", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);
    const events = await collectAnalytics(page);

    await page.goto(`/${UTM}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 5000,
    });

    await expect
      .poll(async () => page.evaluate(() => document.cookie.includes("lot_vid=")))
      .toBe(true);
    await expect
      .poll(async () => page.evaluate(() => document.cookie.includes("lot_utm=")))
      .toBe(true);

    await waitForEvent(events, "page_view");
    await waitForEvent(events, "landing_view");

    const landing = events.find((e) => e.event === "landing_view");
    expect(landing?.utmSource).toBe("vk");
    expect(landing?.utmMedium).toBe("cpc");
    expect(landing?.utmCampaign).toBe("ux005_test");
    expect(landing?.visitorId).toBeTruthy();
    expect(landing?.webview).toBe(true);

    await page.getByRole("button", { name: "Открыть каталог" }).click();
    await expect(page).toHaveURL(/\/catalog/, { timeout: 15_000 });
    await waitForEvent(events, "category_view");

    const productLink = page.locator('main a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 15_000 });
    await waitForEvent(events, "product_view");
    await expect(page.getByTestId("pdp-trust-block")).toBeVisible({
      timeout: 15_000,
    });
    await waitForEvent(events, "trust_block_view");

    await page.getByRole("button", { name: "В корзину" }).first().click();
    await waitForEvent(events, "add_to_cart");

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /Корзина/i })).toBeVisible({
      timeout: 15_000,
    });

    errors.assertClean();
    await ctx.close();
  });

  test("VK mobile checkout — checkout_start after sign-in", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);
    const events = await collectAnalytics(page);

    await signIn(page, DEMO.buyerEmail);
    await page.goto(`/catalog${UTM}`, { waitUntil: "domcontentloaded" });
    const productLink = page.locator('main a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await page.getByRole("button", { name: "В корзину" }).first().click();
    await page.goto("/cart");
    await page
      .getByRole("link", { name: "Оформить заказ" })
      .or(page.getByRole("button", { name: "Оформить заказ" }))
      .click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 20_000 });
    await waitForEvent(events, "checkout_start");

    const checkout = events.find((e) => e.event === "checkout_start");
    expect(checkout?.utmSource).toBe("vk");
    expect(checkout?.visitorId).toBeTruthy();

    errors.assertClean();
    await ctx.close();
  });
});

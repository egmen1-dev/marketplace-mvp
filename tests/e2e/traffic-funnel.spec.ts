import { expect, test } from "@playwright/test";

import { attachErrorCollector } from "./helpers";

const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

test.describe("HOTFIX-UX-003 VK traffic funnel", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("homepage → catalog → PDP → cart — CTAs visible, no white screen", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 500,
    });
    await expect(page.getByRole("link", { name: "Открыть каталог" })).toBeVisible();
    await expect
      .poll(async () =>
        page.locator("html").evaluate((el) => el.classList.contains("webview-compat")),
      )
      .toBe(true);

    await page.getByRole("link", { name: "Открыть каталог" }).click();
    await expect(page).toHaveURL(/\/catalog/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Каталог" })).toBeVisible({
      timeout: 15_000,
    });

    const productLink = page.locator('main a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 15_000 });
    await expect(page.locator('[data-testid="pdp-purchase"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /В корзину|Купить/ }).first()).toBeVisible();

    await page.getByRole("button", { name: "В корзину" }).first().click();
    await expect(page.getByTestId("site-header")).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /Корзина/i })).toBeVisible({
      timeout: 15_000,
    });

    errors.assertClean();
    await ctx.close();
  });

  test("homepage primary CTA visible within 500ms", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
    });
    const page = await ctx.newPage();
    const t0 = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Открыть каталог" })).toBeVisible({
      timeout: 500,
    });
    expect(Date.now() - t0).toBeLessThan(5000);
    await ctx.close();
  });
});

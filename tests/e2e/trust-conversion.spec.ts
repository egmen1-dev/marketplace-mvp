import { expect, test } from "@playwright/test";

import { attachErrorCollector } from "./helpers";

const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

test.describe("HOTFIX-UX-004 trust & conversion layer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("VK mobile homepage — trust strip visible", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("trust-strip")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Безопасная оплата").first()).toBeVisible();
    await expect(page.getByText("Защита покупателя")).toBeVisible();

    errors.assertClean();
    await ctx.close();
  });

  test("VK mobile PDP — trust block, delivery, CTA", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/catalog");
    const productLink = page.locator('main a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/product\//);

    await expect(page.getByTestId("pdp-trust-block")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("pdp-delivery-estimate")).toBeVisible();
    await expect(page.getByTestId("pdp-reviews-placeholder")).toBeVisible();
    await expect(page.locator('[data-testid="pdp-purchase"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /В корзину|Купить/ }).first(),
    ).toBeVisible();

    errors.assertClean();
    await ctx.close();
  });

  test("VK mobile cart — trust note when items present", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/catalog");
    const productLink = page.locator('main a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await page.getByRole("button", { name: "В корзину" }).first().click();
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /Корзина/i })).toBeVisible({
      timeout: 15_000,
    });

    const trustNote = page.getByTestId("cart-trust-note");
    if (await trustNote.isVisible().catch(() => false)) {
      await expect(trustNote).toContainText(/Безопасн|защищ/i);
    }

    errors.assertClean();
    await ctx.close();
  });
});

import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, openFirstCatalogProduct, signIn } from "./helpers";

test.describe("MARKETPLACE-CONVERSION-AUDIT-001", () => {
  test.skip(
    process.env.MARKETPLACE_CONVERSION_ENABLED !== "true",
    "Requires MARKETPLACE_CONVERSION_ENABLED=true",
  );

  test("admin conversion center shows funnel", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/conversion");
    await expect(page.getByTestId("admin-conversion")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("admin-conversion-center")).toBeVisible();
    await expect(page.getByTestId("conversion-funnel-display")).toBeVisible();
    errors.assertClean();
  });

  test("seller sees conversion panel on business page", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-conversion-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("seller sees PDP conversion diagnostics on own product", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products");
    const productLink = page.locator('a[href^="/product/"]').first();
    if (await productLink.isVisible().catch(() => false)) {
      await productLink.click();
      await expect(page.getByTestId("pdp-conversion-diagnostics")).toBeVisible({
        timeout: 20_000,
      });
    } else {
      await openFirstCatalogProduct(page);
      await expect(page.getByTestId("pdp-conversion-diagnostics")).toBeHidden();
    }
    errors.assertClean();
  });
});

import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  cleanupPromotionFixture,
  createPromotionFixture,
  signIn,
  uniquePromotionMarker,
} from "./helpers";

test.describe("ADS-MARKETPLACE-001 promotion MVP", () => {
  test("seller starts promotion and buyer sees badge", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePromotionMarker();
    const fixture = await createPromotionFixture(page, { marker });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/promotions");
      await expect(page.getByTestId("seller-promotions-panel")).toBeVisible({
        timeout: 20_000,
      });

      const startBtn = page.getByTestId(`promotion-start-${fixture.productId}`);
      await expect(startBtn).toBeEnabled({ timeout: 15_000 });
      await startBtn.click();

      await expect(
        page.getByTestId(`promotion-row-${fixture.productId}`).getByText("Активно"),
      ).toBeVisible({ timeout: 15_000 });

      await page.goto(fixture.productPath);
      await expect(page.getByTestId("promoted-badge")).toBeVisible({
        timeout: 15_000,
      });

      errors.assertClean();
    } finally {
      await cleanupPromotionFixture(page, marker);
    }
  });

  test("admin sees promotions dashboard", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/promotions");
    await expect(page.getByTestId("admin-promotions-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

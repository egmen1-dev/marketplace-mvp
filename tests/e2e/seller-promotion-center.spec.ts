import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  cleanupPromotionFixture,
  createPromotionFixture,
  signIn,
  signOut,
  uniquePromotionMarker,
} from "./helpers";

test.describe("SELLER-PROMOTION-CENTER-001 intelligent promotion dashboard", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    process.env.SELLER_PROMOTION_CENTER_ENABLED !== "true",
    "Requires SELLER_PROMOTION_CENTER_ENABLED=true",
  );

  test("seller opens promotion center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/promotion-center");
    await expect(page.getByTestId("seller-promotion-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("promotion-summary-cards")).toBeVisible();
    errors.assertClean();
  });

  test("seller views analytics and AI recommendation blocks", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePromotionMarker();
    const fixture = await createPromotionFixture(page, { marker });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/promotion-center");
      await expect(page.getByTestId("promotion-opportunities")).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId("promotion-analytics-detail")).toBeVisible();
      await expect(page.getByTestId("promotion-ai-coach")).toBeVisible();
      await expect(
        page.getByTestId(`campaign-${fixture.productId}`),
      ).toBeVisible({ timeout: 15_000 });
      errors.assertClean();
    } finally {
      await cleanupPromotionFixture(page, marker);
    }
  });

  test("legacy promotions route redirects to promotion center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/promotions");
    await page.waitForURL("**/account/promotion-center**", { timeout: 15_000 });
    await expect(page.getByTestId("seller-promotion-center-panel")).toBeVisible();
    errors.assertClean();
  });

  test("admin sees promotion control extension", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/promotions");
    await expect(page.getByTestId("admin-promotion-control-panel")).toBeVisible({
      timeout: 20_000,
    });
    await signOut(page);
    errors.assertClean();
  });
});

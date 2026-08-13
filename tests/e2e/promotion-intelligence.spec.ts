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

test.describe("ADS-MARKETPLACE-005 promotion intelligence", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    process.env.PROMOTION_INTELLIGENCE_ENABLED !== "true",
    "Requires PROMOTION_INTELLIGENCE_ENABLED=true",
  );

  test("seller sees AI recommendations", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePromotionMarker();
    const fixture = await createPromotionFixture(page, { marker });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/promotions");
      await expect(
        page.getByTestId("promotion-recommendations-panel"),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByTestId(`promotion-recommendation-${fixture.productId}`),
      ).toBeVisible({ timeout: 15_000 });
      errors.assertClean();
    } finally {
      await cleanupPromotionFixture(page, marker);
    }
  });

  test("admin sees AI opportunities", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/promotions");
    await expect(page.getByTestId("admin-promotion-intelligence")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByTestId("admin-intelligence-ready-unpromoted"),
    ).toBeVisible();
    await signOut(page);
    errors.assertClean();
  });
});

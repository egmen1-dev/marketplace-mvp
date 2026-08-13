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

test.describe("ADS-MARKETPLACE-003 promotion analytics", () => {
  test.describe.configure({ mode: "serial" });

  test("seller sees analytics when enabled and admin sees metrics", async ({
    page,
  }) => {
    test.skip(
      process.env.PROMOTION_ANALYTICS_ENABLED !== "true",
      "Requires PROMOTION_ANALYTICS_ENABLED=true",
    );

    const errors = attachErrorCollector(page);
    const marker = uniquePromotionMarker();
    const fixture = await createPromotionFixture(page, { marker });
    const visitorId = `e2e-promo-analytics-${Date.now()}`;

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/promotions");
      const main = page.locator("main");
      const startBtn = main.getByTestId(`promotion-start-${fixture.productId}`);
      await expect(startBtn).toBeEnabled({ timeout: 15_000 });
      await startBtn.click();
      await expect(
        main.getByTestId(`promotion-pause-${fixture.productId}`),
      ).toBeVisible({ timeout: 20_000 });

      await page.request.post("/api/analytics/events", {
        data: {
          event: "promotion_impression",
          entityId: fixture.productId,
          visitorId,
        },
      });
      await page.request.post("/api/analytics/events", {
        data: {
          event: "promotion_click",
          entityId: fixture.productId,
          visitorId,
        },
      });

      await page.reload();
      await expect(
        main.getByTestId(`promotion-analytics-${fixture.productId}`),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        main.getByTestId(`promotion-analytics-${fixture.productId}`),
      ).toContainText("Показы");

      await signOut(page);
      await signIn(page, DEMO.adminEmail);
      await page.goto("/admin/promotions");
      await expect(page.getByTestId("admin-promotion-analytics")).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByTestId(`admin-promotion-analytics-row-${fixture.productId}`),
      ).toBeVisible({ timeout: 15_000 });

      errors.assertClean();
    } finally {
      await cleanupPromotionFixture(page, marker);
    }
  });
});

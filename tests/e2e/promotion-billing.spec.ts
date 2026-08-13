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

const E2E_SECRET = process.env.E2E_FIXTURE_SECRET ?? "";

test.describe("ADS-MARKETPLACE-004 promotion billing", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !E2E_SECRET,
    "Requires E2E_FIXTURE_SECRET and PROMOTION_BILLING_ENABLED=true",
  );

  test("seller buys promotion, campaign active, admin sees revenue", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePromotionMarker();
    const fixture = await createPromotionFixture(page, { marker });

    try {
      const finalizeRes = await page.request.post(
        "/api/e2e/promotion-billing-fixture",
        {
          headers: { "x-e2e-secret": E2E_SECRET },
          data: {
            productId: fixture.productId,
            sellerProfileId: fixture.sellerProfileId,
            planName: "STARTER",
          },
        },
      );
      expect(finalizeRes.ok()).toBeTruthy();

      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/promotions");
      await expect(
        page.getByTestId(`promotion-end-date-${fixture.productId}`),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByTestId(`promotion-pause-${fixture.productId}`),
      ).toBeVisible({ timeout: 20_000 });

      await signOut(page);
      await signIn(page, DEMO.adminEmail);
      await page.goto("/admin/promotions");
      await expect(page.getByTestId("admin-promotion-billing")).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId("admin-promotion-revenue")).toContainText(
        "990",
      );
      await expect(
        page.getByTestId(`admin-promotion-order-${fixture.productId}`),
      ).toBeVisible({ timeout: 15_000 });

      errors.assertClean();
    } finally {
      await cleanupPromotionFixture(page, marker);
    }
  });
});

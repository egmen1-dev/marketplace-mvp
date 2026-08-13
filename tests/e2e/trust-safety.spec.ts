import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("TRUST-SAFETY-001 marketplace trust layer", () => {
  test.skip(
    process.env.TRUST_SAFETY_ENABLED !== "true",
    "Requires TRUST_SAFETY_ENABLED=true",
  );

  test("buyer sees PDP trust safety block", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog");
    await page.locator('a[href^="/product/"]').first().click();
    await expect(page.getByTestId("pdp-trust-safety-block")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("trust-seller-section")).toBeVisible();
    await expect(page.getByTestId("trust-product-section")).toBeVisible();
    await expect(page.getByTestId("trust-protection-section")).toBeVisible();
    errors.assertClean();
  });

  test("seller sees trust coach on growth page", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/growth");
    await expect(page.getByTestId("seller-trust-coach-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("seller-trust-score")).toBeVisible();
    errors.assertClean();
  });

  test("admin opens trust center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/trust-center");
    await expect(page.getByTestId("admin-trust-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("admin-trust-health")).toBeVisible();
    errors.assertClean();
  });

  test("seller sees trust notifications in inbox", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/notifications");
    await expect(page.getByTestId("ai-notification-center")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

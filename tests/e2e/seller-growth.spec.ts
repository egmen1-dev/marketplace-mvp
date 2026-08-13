import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("SELLER-GROWTH-001 seller growth engine", () => {
  test.skip(
    process.env.SELLER_GROWTH_ENABLED !== "true",
    "Requires SELLER_GROWTH_ENABLED=true",
  );

  test("seller opens growth dashboard with AI insights", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/growth");
    await expect(page.getByTestId("seller-growth-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("seller-growth-score")).toBeVisible();
    errors.assertClean();
  });

  test("admin sees seller growth overview", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/sellers");
    await expect(page.getByTestId("admin-seller-growth-overview")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

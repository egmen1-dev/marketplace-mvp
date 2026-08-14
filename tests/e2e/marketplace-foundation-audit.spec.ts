import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("MARKETPLACE-FOUNDATION-AUDIT-001 readiness dashboards", () => {
  test.skip(
    process.env.MARKETPLACE_FOUNDATION_AUDIT_ENABLED !== "true",
    "Requires MARKETPLACE_FOUNDATION_AUDIT_ENABLED=true",
  );

  test("admin sees foundation dashboard", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/foundation");
    await expect(page.getByTestId("admin-foundation-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("foundation-health-score")).toBeVisible();
    await expect(page.getByTestId("foundation-launch-checklist")).toBeVisible();
    errors.assertClean();
  });

  test("admin sees operations overview", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/operations");
    await expect(page.getByTestId("admin-operations-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("operations-orders")).toBeVisible();
    await expect(page.getByTestId("operations-finance")).toBeVisible();
    errors.assertClean();
  });

  test("buyer can reach catalog without audit flag on buyer UI", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog");
    await expect(page).toHaveURL(/\/catalog/);
    errors.assertClean();
  });

  test("seller can reach business page", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page).toHaveURL(/\/account\/business/);
    errors.assertClean();
  });
});

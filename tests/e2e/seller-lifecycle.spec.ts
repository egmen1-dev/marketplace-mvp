import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("SELLER-LIFECYCLE-001 seller journey integration", () => {
  test.skip(
    process.env.SELLER_LIFECYCLE_ENABLED !== "true",
    "Requires SELLER_LIFECYCLE_ENABLED=true",
  );

  test("seller sees journey in command center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/command-center");
    await expect(page.getByTestId("seller-journey-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("seller-journey-progress")).toBeVisible();
    await expect(page.getByTestId("seller-journey-coach")).toBeVisible();
    errors.assertClean();
  });

  test("seller account home shows journey when enabled", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account");
    await expect(page.getByTestId("seller-journey-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin sees seller funnel", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/sellers");
    await expect(page.getByTestId("admin-seller-funnel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

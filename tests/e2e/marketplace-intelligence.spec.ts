import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-INTELLIGENCE-001 marketplace brain", () => {
  test.skip(
    process.env.MARKETPLACE_INTELLIGENCE_ENABLED !== "true",
    "Requires MARKETPLACE_INTELLIGENCE_ENABLED=true",
  );

  test("admin opens intelligence dashboard", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/intelligence");
    await expect(
      page.getByTestId("admin-marketplace-intelligence-panel"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("marketplace-health-metrics")).toBeVisible();
    await expect(page.getByTestId("marketplace-opportunities")).toBeVisible();
    await expect(page.getByTestId("marketplace-recommendations")).toBeVisible();
    errors.assertClean();
  });

  test("catalog search shows buyer demand insights when enabled", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog?q=дрель");
    await expect(page.getByTestId("buyer-demand-insights")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

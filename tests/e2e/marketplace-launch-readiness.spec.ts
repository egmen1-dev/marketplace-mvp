import { test, expect } from "@playwright/test";

test.describe("marketplace launch readiness", () => {
  test("launch dashboard loads", async ({ page }) => {
    test.skip(
      process.env.MARKETPLACE_LAUNCH_READINESS_ENABLED !== "true",
      "launch readiness flag off",
    );
    await page.goto("/admin/launch");
    await expect(page.getByTestId("admin-launch-dashboard")).toBeVisible({
      timeout: 15000,
    });
  });

  test("health dashboard loads", async ({ page }) => {
    test.skip(
      process.env.MARKETPLACE_LAUNCH_READINESS_ENABLED !== "true",
      "launch readiness flag off",
    );
    await page.goto("/admin/health");
    await expect(page.getByTestId("admin-marketplace-health")).toBeVisible({
      timeout: 15000,
    });
  });
});

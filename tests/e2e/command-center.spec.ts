import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-CONTROL-CENTER-001 unified command center", () => {
  test.skip(
    process.env.MARKETPLACE_COMMAND_CENTER_ENABLED !== "true",
    "Requires MARKETPLACE_COMMAND_CENTER_ENABLED=true",
  );

  test("seller opens command center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/command-center");
    await expect(page.getByTestId("seller-command-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("cc-seller-health")).toBeVisible();
    await expect(page.getByTestId("cc-ai-summary")).toBeVisible();
    errors.assertClean();
  });

  test("admin opens command center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/command-center");
    await expect(page.getByTestId("admin-command-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("cc-admin-priorities")).toBeVisible();
    errors.assertClean();
  });
});

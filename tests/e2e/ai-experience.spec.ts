import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-AI-EXPERIENCE-001 unified AI layer", () => {
  test.skip(
    process.env.AI_EXPERIENCE_ENABLED !== "true",
    "Requires AI_EXPERIENCE_ENABLED=true",
  );

  test("seller opens AI center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/ai-center");
    await expect(page.getByTestId("seller-ai-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("ai-happening")).toBeVisible();
    errors.assertClean();
  });

  test("buyer sees AI assistant on PDP", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog");
    await page.locator('a[href^="/product/"]').first().click();
    await expect(page.getByTestId("buyer-ai-assistant")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin opens AI command center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/ai-center");
    await expect(page.getByTestId("admin-ai-command-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("ai-admin-health")).toBeVisible();
    errors.assertClean();
  });

  test("user opens notification inbox", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/notifications");
    await expect(page.getByTestId("ai-notification-center")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

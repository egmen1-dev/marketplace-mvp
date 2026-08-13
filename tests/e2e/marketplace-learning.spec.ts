import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-LEARNING-LOOP-001 self learning layer", () => {
  test.skip(
    process.env.MARKETPLACE_LEARNING_ENABLED !== "true",
    "Requires MARKETPLACE_LEARNING_ENABLED=true",
  );

  test("seller sees what works in AI center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/ai-center");
    await expect(page.getByTestId("seller-ai-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("ai-what-works")).toBeVisible();
    errors.assertClean();
  });

  test("admin opens learning center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/learning");
    await expect(page.getByTestId("admin-learning-center-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("admin-learning-patterns")).toBeVisible();
    await expect(page.getByTestId("admin-learning-accuracy")).toBeVisible();
    errors.assertClean();
  });

  test("seller AI recommendation tracking CTA visible", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/ai-center");
    const priority = page.getByTestId("ai-priority-action");
    if (await priority.isVisible()) {
      await expect(priority.getByRole("link", { name: "Выполнить" })).toBeVisible();
    }
    errors.assertClean();
  });
});

import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-EDUCATION-001 AI marketplace coach layer", () => {
  test.skip(
    process.env.MARKETPLACE_EDUCATION_ENABLED !== "true",
    "Requires MARKETPLACE_EDUCATION_ENABLED=true",
  );

  test("seller opens onboarding checklist", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/onboarding");
    await expect(page.getByTestId("seller-onboarding-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("onboarding-step-onboard-product")).toBeVisible();
    errors.assertClean();
  });

  test("seller sees quality score explanation on product edit", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products");
    const editLink = page.getByRole("link", { name: /редактировать/i }).first();
    if (await editLink.isVisible().catch(() => false)) {
      await editLink.click();
      await expect(page.getByTestId("quality-score-explanation")).toBeVisible({
        timeout: 20_000,
      });
    }
    errors.assertClean();
  });

  test("buyer sees help on PDP", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog");
    const productLink = page.locator('a[href^="/product/"]').first();
    await productLink.click();
    await expect(page.getByTestId("buyer-education-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("buyer-smart-assistant")).toBeVisible();
    errors.assertClean();
  });

  test("seller sees AI coach on growth page", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/growth");
    await expect(page.getByTestId("seller-ai-coach-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin opens education content manager", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/education");
    await expect(
      page.getByTestId("admin-marketplace-education-panel"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("education-content-cms")).toBeVisible();
    await expect(page.getByTestId("education-guides")).toBeVisible();
    errors.assertClean();
  });
});

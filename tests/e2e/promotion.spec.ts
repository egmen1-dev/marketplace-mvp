import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  cleanupPromotionFixture,
  createPromotionFixture,
  signIn,
  signOut,
  uniquePromotionMarker,
} from "./helpers";

test.describe("ADS-MARKETPLACE-001 promotion MVP", () => {
  test.describe.configure({ mode: "serial" });

  test("seller starts promotion and buyer sees badge", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePromotionMarker();
    const fixture = await createPromotionFixture(page, { marker });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/promotions");
      const main = page.locator("main");
      await expect(main.getByTestId("seller-promotions-panel")).toBeVisible({
        timeout: 20_000,
      });

      const startBtn = main.getByTestId(`promotion-start-${fixture.productId}`);
      await expect(startBtn).toBeEnabled({ timeout: 15_000 });
      await startBtn.click();

      await expect(
        main.getByTestId(`promotion-pause-${fixture.productId}`),
      ).toBeVisible({ timeout: 20_000 });

      await page.goto(fixture.productPath);
      await expect(page.locator("main").getByTestId("promoted-badge")).toBeVisible({
        timeout: 15_000,
      });

      errors.assertClean();
    } finally {
      await cleanupPromotionFixture(page, marker);
    }
  });

  test("admin sees promotions dashboard with placements", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePromotionMarker();
    const fixture = await createPromotionFixture(page, { marker });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/promotions");
      const main = page.locator("main");
      const startBtn = main.getByTestId(`promotion-start-${fixture.productId}`);
      await expect(startBtn).toBeEnabled({ timeout: 15_000 });
      await startBtn.click();
      await expect(
        main.getByTestId(`promotion-pause-${fixture.productId}`),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        main.getByTestId(`promotion-placements-${fixture.productId}`),
      ).toBeVisible({ timeout: 15_000 });

      await signOut(page);
      await signIn(page, DEMO.adminEmail);
      await page.goto("/admin/promotions");
      await expect(page.getByTestId("admin-promotions-panel")).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByTestId(`admin-promotion-row-${fixture.productId}`),
      ).toBeVisible({ timeout: 15_000 });
      errors.assertClean();
    } finally {
      await cleanupPromotionFixture(page, marker);
    }
  });

  test("homepage unchanged when promotion surfaces flag is off", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");
    await expect(page.getByTestId("promoted-products-section")).toHaveCount(0);
    errors.assertClean();
  });
});

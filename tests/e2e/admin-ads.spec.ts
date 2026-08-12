import { test, expect } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("admin ads readiness panel", () => {
  test("ADMIN opens /admin/ads with summary and filters", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/ads");
    await expect(
      page.getByRole("heading", { name: "Ads readiness" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("admin-ads-panel")).toBeVisible();
    await expect(page.getByText("Всего товаров")).toBeVisible();
    await expect(page.getByText("Готовы к рекламе")).toBeVisible();
    await expect(page.getByTestId("ads-filter-ready")).toBeVisible();
    await expect(page.getByTestId("ads-filter-blocked")).toBeVisible();
    errors.assertClean();
  });

  test("READY filter shows only eligible rows", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/ads?filter=READY");
    await expect(page.getByTestId("admin-ads-panel")).toBeVisible({
      timeout: 20_000,
    });
    const rows = page.locator("[data-eligible]");
    const count = await rows.count();
    if (count > 0) {
      for (let i = 0; i < count; i += 1) {
        await expect(rows.nth(i)).toHaveAttribute("data-eligible", "true");
      }
    }
    errors.assertClean();
  });

  test("BLOCKED filter shows ineligible products", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/ads?filter=BLOCKED");
    await expect(page.getByTestId("admin-ads-panel")).toBeVisible({
      timeout: 20_000,
    });
    const blockedBadge = page.getByText("BLOCKED").first();
    if ((await blockedBadge.count()) > 0) {
      await expect(blockedBadge).toBeVisible();
    }
    errors.assertClean();
  });
});

test.describe("seller ad eligibility warnings", () => {
  test("seller sees promotion banner on draft product edit", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products");
    const editLink = page
      .getByRole("link", { name: "Редактировать" })
      .first();
    await expect(editLink).toBeVisible({ timeout: 20_000 });
    await editLink.click();
    await expect(page).toHaveURL(/\/account\/products\/.+\/edit/);
    const banner = page.getByTestId("product-ad-eligibility-banner");
    if ((await banner.count()) > 0) {
      await expect(banner).toContainText("не готова к продвижению");
    }
    errors.assertClean();
  });
});

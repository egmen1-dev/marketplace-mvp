import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("MARKETPLACE-UX-COMPLETION-001", () => {
  test.skip(
    process.env.MARKETPLACE_UX_COMPLETION_ENABLED !== "true",
    "Requires MARKETPLACE_UX_COMPLETION_ENABLED=true",
  );

  test("buyer sees onboarding banner on first visit", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.context().clearCookies();
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/");
    await expect(page.getByTestId("buyer-onboarding-banner")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("account overview with mode switch", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account");
    await expect(page.getByTestId("account-overview-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("account-mode-switch")).toBeVisible();
    errors.assertClean();
  });

  test("settings completion panel", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/settings");
    await expect(page.getByTestId("settings-completion-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("seller business dashboard completion", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-home-completion")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("favorites empty state", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/favorites");
    await expect(page.getByTestId("ux-empty-state-favorites")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("orders empty state for buyer without orders", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/orders");
    const empty = page.getByTestId("ux-empty-state-orders");
    const list = page.getByRole("link", { name: /Заказ/i });
    await expect(empty.or(list.first())).toBeVisible({ timeout: 20_000 });
    errors.assertClean();
  });

  test("PDP trust and education blocks", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog");
    const productLink = page.locator('a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 20_000 });
    await productLink.click();
    await expect(page.getByTestId("pdp-trust-completion")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("pdp-purchase-education")).toBeVisible();
    errors.assertClean();
  });

  test("admin ux overview dashboard", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("admin-ux-overview-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

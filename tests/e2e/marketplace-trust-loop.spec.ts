import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("MARKETPLACE-TRUST-LOOP-001 reviews and moderation", () => {
  test.skip(
    process.env.MARKETPLACE_TRUST_LOOP_ENABLED !== "true",
    "Requires MARKETPLACE_TRUST_LOOP_ENABLED=true",
  );

  test("admin sees moderation queue", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/moderation");
    await expect(page.getByTestId("admin-moderation-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin sees trust dashboard", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/trust");
    await expect(page.getByTestId("admin-trust-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("seller sees reputation page", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/reputation");
    await expect(page.getByTestId("seller-reputation-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("PDP renders trust signals when enabled", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog");
    const productLink = page.locator('a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 20_000 });
    await productLink.click();
    await expect(page.getByTestId("pdp-trust-signals").or(page.getByTestId("pdp-trust-block"))).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

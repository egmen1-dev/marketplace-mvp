import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("MARKETPLACE-DISCOVERY-001 consumer discovery", () => {
  test.skip(
    process.env.MARKETPLACE_DISCOVERY_ENABLED !== "true",
    "Requires MARKETPLACE_DISCOVERY_ENABLED=true",
  );

  test("homepage shows discovery block", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");
    await expect(page.getByTestId("discovery-home")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("discovery daily find renders", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");
    await expect(page.getByTestId("discovery-daily-find")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("collection page loads", async ({ page }) => {
    test.skip(
      process.env.DISCOVERY_COLLECTIONS_ENABLED !== "true",
      "Requires DISCOVERY_COLLECTIONS_ENABLED=true",
    );
    const errors = attachErrorCollector(page);
    await page.goto("/discover/collections/nakhodki-do-500");
    await expect(page.getByTestId("discovery-collection-page")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("seller sees discovery tips", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/discovery");
    await expect(page.getByTestId("seller-discovery-tips")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin sees discovery center", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/discovery");
    await expect(page.getByTestId("admin-discovery-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("PDP shows discovery why block when enabled", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog");
    const productLink = page.locator('a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 20_000 });
    await productLink.click();
    await expect(page.getByTestId("pdp-discovery-why")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

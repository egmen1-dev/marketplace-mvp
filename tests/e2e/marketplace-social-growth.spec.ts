import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("MARKETPLACE-SOCIAL-GROWTH-001 viral commerce", () => {
  test.skip(
    process.env.MARKETPLACE_SOCIAL_GROWTH_ENABLED !== "true",
    "Requires MARKETPLACE_SOCIAL_GROWTH_ENABLED=true",
  );

  test("discovery share button opens modal", async ({ page }) => {
    test.skip(
      process.env.SOCIAL_SHARE_CARDS_ENABLED !== "true",
      "Requires SOCIAL_SHARE_CARDS_ENABLED=true",
    );
    const errors = attachErrorCollector(page);
    await page.goto("/");
    await page.getByTestId("share-find-button").first().click();
    await expect(page.getByTestId("share-card-modal")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("social landing page loads", async ({ page }) => {
    test.skip(
      process.env.SOCIAL_COLLECTIONS_ENABLED !== "true",
      "Requires SOCIAL_COLLECTIONS_ENABLED=true",
    );
    const errors = attachErrorCollector(page);
    await page.goto("/social/gifts");
    await expect(page.getByTestId("social-landing-page")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("user collections page loads", async ({ page }) => {
    test.skip(
      process.env.SOCIAL_COLLECTIONS_ENABLED !== "true",
      "Requires SOCIAL_COLLECTIONS_ENABLED=true",
    );
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/finds");
    await expect(page.getByTestId("user-collections-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("seller social tools page loads", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/social-tools");
    await expect(page.getByTestId("seller-social-tools")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin social growth dashboard loads", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/social-growth");
    await expect(page.getByTestId("admin-social-growth-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

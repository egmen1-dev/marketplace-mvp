import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-COMMUNICATION-001 growth communication engine", () => {
  test.skip(
    process.env.MARKETPLACE_COMMUNICATION_ENABLED !== "true",
    "Requires MARKETPLACE_COMMUNICATION_ENABLED=true",
  );

  test("admin opens communication dashboard with campaign workflow", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/communication");
    await expect(
      page.getByTestId("admin-marketplace-communication-panel"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("communication-active-campaigns")).toBeVisible();
    await expect(page.getByTestId("communication-audiences")).toBeVisible();
    await expect(page.getByTestId("communication-templates")).toBeVisible();
    await expect(page.getByTestId("communication-pending-approval")).toBeVisible();
    await expect(page.getByTestId("communication-results")).toBeVisible();
    errors.assertClean();
  });

  test("seller sees LOT recommendation on growth page", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/growth");
    await expect(page.getByTestId("seller-lot-recommendation")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("link", { name: "Исправить" })).toBeVisible();
    errors.assertClean();
  });
});

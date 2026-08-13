import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  cleanupFinanceFixture,
  createFinanceFixture,
  signIn,
  uniqueFinanceMarker,
} from "./helpers";

test.describe("EPIC-FINANCE-001 finance foundation", () => {
  test("seller sees pending balance after transaction", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniqueFinanceMarker();
    await createFinanceFixture(page, { marker });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/balance");
      await expect(page.getByTestId("seller-balance-panel")).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("Ожидается").first()).toBeVisible();
      errors.assertClean();
    } finally {
      await cleanupFinanceFixture(page, marker);
    }
  });

  test("buyer sees safe deal block on paid order", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniqueFinanceMarker();
    const fixture = await createFinanceFixture(page, { marker });

    try {
      await signIn(page, DEMO.buyerEmail);
      await page.goto(fixture.orderPath);
      await expect(page.getByTestId("safe-deal-block")).toBeVisible({
        timeout: 20_000,
      });
      errors.assertClean();
    } finally {
      await cleanupFinanceFixture(page, marker);
    }
  });

  test("admin sees finance dashboard with transaction", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniqueFinanceMarker();
    await createFinanceFixture(page, { marker });

    try {
      await signIn(page, DEMO.adminEmail);
      await page.goto("/admin/finance");
      await expect(page.getByTestId("admin-finance-panel")).toBeVisible({
        timeout: 20_000,
      });
      errors.assertClean();
    } finally {
      await cleanupFinanceFixture(page, marker);
    }
  });
});

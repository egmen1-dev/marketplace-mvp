import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

/**
 * TRUST-SAFETY-001 — foundation flows.
 * UI surfaces are gated by TRUST_SAFETY_ENABLED (default false).
 * When flag is off, trust panels stay hidden; admin page still loads.
 */
test.describe("trust safety foundation", () => {
  test("admin trust center is reachable for admin", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/trust");
    await expect(
      page.getByRole("heading", { name: "Trust Center" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("admin-trust")).toBeVisible();
    errors.assertClean();
  });

  test("buyer order page stays healthy (trust panel optional)", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/orders");
    const first = page.locator('a[href*="/account/orders/"]').first();
    if ((await first.count()) === 0) {
      test.skip();
      return;
    }
    await first.click();
    await expect(page.getByText("История заказа")).toBeVisible({
      timeout: 20_000,
    });
    // When TRUST_SAFETY_ENABLED=true: timeline + buyer actions appear
    const panel = page.getByTestId("order-trust-panel");
    if (await panel.count()) {
      await expect(page.getByTestId("order-trust-timeline")).toBeVisible();
    }
    errors.assertClean();
  });

  test("checkout remains healthy with optional safe-deal block", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/checkout");
    // May redirect to cart if empty — either path is fine
    await page.waitForLoadState("domcontentloaded");
    const safeDeal = page.getByTestId("checkout-safe-deal");
    if (await safeDeal.count()) {
      await expect(safeDeal.getByText("Безопасная сделка")).toBeVisible();
    }
    errors.assertClean();
  });

  test("seller balance page optional payout education", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/balance");
    await expect(page.getByTestId("seller-balance")).toBeVisible({
      timeout: 20_000,
    });
    const edu = page.getByTestId("seller-payout-education");
    if (await edu.count()) {
      await expect(edu.getByText("Как работает выплата")).toBeVisible();
    }
    errors.assertClean();
  });
});

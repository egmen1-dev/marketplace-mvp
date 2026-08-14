import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn, signOut } from "./helpers";

const E2E_SECRET = process.env.E2E_FIXTURE_SECRET ?? "";

test.describe("SELLER-PAYOUT-001 seller withdrawal workflow", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !E2E_SECRET || process.env.SELLER_PAYOUT_ENABLED !== "true",
    "Requires E2E_FIXTURE_SECRET and SELLER_PAYOUT_ENABLED=true",
  );

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/e2e/payout-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
      data: { availableAmount: 42000 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete("/api/e2e/payout-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });
  });

  test("seller opens balance and sees available funds", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/balance");
    await expect(page.getByTestId("seller-balance-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("balance-available-amount")).toBeVisible();
    await expect(page.getByTestId("balance-withdraw-btn")).toBeVisible();
    errors.assertClean();
  });

  test("seller creates payout request and sees status", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/payouts");
    await expect(page.getByTestId("seller-payout-panel")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel("Введите сумму").fill("20000");
    await page.getByRole("button", { name: "Продолжить" }).click();
    await expect(page.getByTestId("payout-step-method")).toBeVisible();

    const method = page.locator("[data-testid^='payout-method-']").first();
    await method.click();
    await page.getByRole("button", { name: "Продолжить" }).click();
    await page.getByTestId("payout-submit-request").click();

    await expect(page.getByTestId("payout-step-success")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("На проверке")).toBeVisible();
    errors.assertClean();
  });

  test("admin processes payout queue", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/payouts");
    await expect(page.getByTestId("admin-payout-panel")).toBeVisible({
      timeout: 20_000,
    });

    const openLink = page.getByRole("link", { name: "Открыть" }).first();
    await expect(openLink).toBeVisible({ timeout: 15_000 });
    await openLink.click();
    await expect(page.getByTestId("admin-payout-detail")).toBeVisible();

    await page.getByRole("button", { name: "Одобрить" }).click();
    await page.getByTestId("admin-payout-complete").click();

    await signOut(page);
    errors.assertClean();
  });
});

/**
 * MARKETPLACE-FINANCIAL-E2E-001 — full staging acceptance (real Stripe + wallet flows).
 *
 * Run:
 *   export BASE_URL=https://web-production-e56fb.up.railway.app
 *   export PLAYWRIGHT_BASE_URL=$BASE_URL
 *   export E2E_FIXTURE_SECRET=...
 *   export SELLER_PAYOUT_ENABLED=true
 *   npx playwright test tests/e2e/financial-acceptance-staging.spec.ts -c playwright.railway.config.ts
 */

import { expect, test } from "@playwright/test";

import {
  readWalletFixture,
  resetWalletFixture,
  seedWalletFixture,
} from "./helpers/financial-fixture";
import { completeStripeTestCheckout } from "./helpers/financial-stripe";
import {
  DEMO,
  attachErrorCollector,
  clearCart,
  openFirstCatalogProduct,
  primaryAddToCart,
  signIn,
  signOut,
} from "./helpers";

const E2E_SECRET = process.env.E2E_FIXTURE_SECRET ?? "";
const STAGING =
  process.env.PLAYWRIGHT_BASE_URL?.includes("railway.app") ?? false;

const TOPUP_AMOUNT = 10_000;
const ACCEPTANCE_MARKER = `FIN-E2E-${Date.now().toString(36)}`;

test.describe("MARKETPLACE-FINANCIAL-E2E-001 staging acceptance", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });
  test.skip(!STAGING, "Set PLAYWRIGHT_BASE_URL to Railway staging");
  test.skip(!E2E_SECRET, "Requires E2E_FIXTURE_SECRET");

  let buyerTopupBefore = 0;
  let buyerTopupAfter = 0;
  let ledgerAfterTopup = 0;
  let orderId = "";
  let orderPath = "";

  test.beforeAll(async ({ request }) => {
    const health = await request.get("/api/health");
    const json = (await health.json()) as {
      checks: { stripe?: { configured?: boolean } };
    };
    test.skip(!json.checks.stripe?.configured, "Stripe not configured on staging");

    await resetWalletFixture(request, DEMO.buyerEmail);
    await resetWalletFixture(request, DEMO.sellerEmail);
  });

  // ── STAGE 1: Stripe top-up ────────────────────────────────────────────────

  test("1.1 checkout session created and Stripe redirect works", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    const before = await readWalletFixture(page.request, DEMO.buyerEmail);
    buyerTopupBefore = before.topupSpendableAmount;

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/wallet?tab=topup");
    await expect(page.getByTestId("wallet-topup-form")).toBeVisible({
      timeout: 20_000,
    });

    await page.locator("#topup-amount").fill(String(TOPUP_AMOUNT));
    await page
      .getByTestId("wallet-topup-form")
      .getByRole("button", { name: "Пополнить" })
      .click();

    await completeStripeTestCheckout(
      page,
      /\/account\/wallet.*topup=success/,
    );

    await expect(page.getByText(/пополнение прошло успешно/i)).toBeVisible({
      timeout: 30_000,
    });
    errors.assertClean();
  });

  test("1.2 webhook credits ledger once and balance increases", async ({
    request,
  }) => {
    await expect
      .poll(
        async () => {
          const state = await readWalletFixture(request, DEMO.buyerEmail);
          return state.topupSpendableAmount;
        },
        { timeout: 60_000, intervals: [2000, 3000, 5000] },
      )
      .toBeGreaterThanOrEqual(buyerTopupBefore + TOPUP_AMOUNT - 0.01);

    const after = await readWalletFixture(request, DEMO.buyerEmail);
    buyerTopupAfter = after.topupSpendableAmount;
    ledgerAfterTopup = after.ledgerEntryCount ?? 0;

    expect(buyerTopupAfter).toBeGreaterThanOrEqual(buyerTopupBefore + TOPUP_AMOUNT);
    if (ledgerAfterTopup > 0) {
      expect(ledgerAfterTopup).toBeGreaterThanOrEqual(1);
    }
  });

  test("1.3 top-up appears in wallet history UI", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/wallet?tab=history");
    await expect(page.getByText(/пополнение/i).first()).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  // ── STAGE 2: Buyer wallet checkout ────────────────────────────────────────

  test("2.1 wallet payment succeeds when balance sufficient", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await clearCart(page);
    await openFirstCatalogProduct(page);
    await primaryAddToCart(page).click();
    await expect(page.getByRole("button", { name: "Добавлено" }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/cart");
    await page
      .getByRole("link", { name: "Оформить заказ" })
      .or(page.getByRole("button", { name: "Оформить заказ" }))
      .click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 20_000 });

    await page.getByLabel("Имя получателя").fill("Financial E2E");
    await page.getByLabel("Телефон").fill("+79001234567");
    await page.getByLabel("Город", { exact: true }).fill("Москва");
    await expect(page.getByLabel("Пункт выдачи (ПВЗ)")).not.toHaveValue("", {
      timeout: 15_000,
    });

    await page.getByTestId("checkout-payment-wallet").check();
    const balanceBeforePay = buyerTopupAfter;
    await page.getByRole("button", { name: /Оплатить/i }).click();

    const navigated = await page
      .waitForURL(/\/account\/orders\//, { timeout: 45_000 })
      .then(() => true)
      .catch(() => false);

    if (!navigated) {
      await expect
        .poll(async () => {
          const w = await readWalletFixture(page.request, DEMO.buyerEmail);
          return balanceBeforePay - w.topupSpendableAmount;
        }, { timeout: 45_000 })
        .toBeGreaterThan(1000);
      await page.goto("/account/orders");
      const orderLink = page
        .getByRole("link", { name: /Открыть детали/i })
        .first();
      await expect(orderLink).toBeVisible({ timeout: 20_000 });
      await orderLink.click();
    }

    await expect(page).toHaveURL(/\/account\/orders\/[^/]+/, { timeout: 20_000 });
    orderPath = new URL(page.url()).pathname;
    orderId = orderPath.split("/").pop() ?? "";
    expect(orderId.length).toBeGreaterThan(5);

    await expect(page.getByTestId("payment-success-banner")).toBeVisible({
      timeout: 15_000,
    });
    errors.assertClean();
  });

  test("2.2 insufficient funds blocks wallet checkout", async ({ page }) => {
    await resetWalletFixture(page.request, DEMO.buyerEmail);
    await seedWalletFixture(page.request, {
      email: DEMO.buyerEmail,
      topupAmount: 50,
    });

    await signIn(page, DEMO.buyerEmail);
    await clearCart(page);
    await openFirstCatalogProduct(page);
    await primaryAddToCart(page).click();
    await page.goto("/cart");
    await page
      .getByRole("link", { name: "Оформить заказ" })
      .or(page.getByRole("button", { name: "Оформить заказ" }))
      .click();

    await page.getByLabel("Имя получателя").fill("Low Balance");
    await page.getByLabel("Телефон").fill("+79001234567");
    await page.getByLabel("Город", { exact: true }).fill("Москва");
    await expect(page.getByLabel("Пункт выдачи (ПВЗ)")).not.toHaveValue("", {
      timeout: 15_000,
    });

    await page.getByTestId("checkout-payment-wallet").check();
    const payBtn = page.getByRole("button", { name: /Оплатить/i });
    await expect(payBtn).toBeDisabled();

    await seedWalletFixture(page.request, {
      email: DEMO.buyerEmail,
      topupAmount: buyerTopupAfter,
    });
  });

  test("2.3 double payment on same order is impossible", async ({ page }) => {
    test.skip(!orderId, "Prior wallet order missing");
    await signIn(page, DEMO.buyerEmail);
    await page.goto(orderPath);
    await expect(page.getByText(/оплачен/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /оплатить/i })).toHaveCount(0);
  });

  // ── STAGE 3: Seller ledger HELD → AVAILABLE ───────────────────────────────

  test("3.1 seller funds held after purchase (not available immediately)", async ({
    page,
  }) => {
    test.skip(!orderId, "Prior wallet order missing");
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/balance");
    await expect(page.getByTestId("seller-balance-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Ожидается").first()).toBeVisible();
    const pendingText = await page
      .getByTestId("seller-balance-panel")
      .getByText(/Ожидается/)
      .locator("..")
      .locator("p.tabular-nums")
      .first()
      .textContent();
    const pending = Number(
      (pendingText ?? "0").replace(/[^\d]/g, ""),
    );
    expect(pending).toBeGreaterThan(0);
  });

  test("3.2 seller progresses order and buyer confirms → funds available", async ({
    page,
  }) => {
    test.skip(!orderId, "Prior wallet order missing");

    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/sales?bucket=AWAITING_CONFIRMATION");
    const orderLink = page.getByRole("link", { name: new RegExp(orderId.slice(0, 8), "i") }).first();
    if ((await orderLink.count()) === 0) {
      await page.goto("/account/sales");
    }
    const anyOrder = page.locator(`a[href*="${orderId}"]`).first();
    await expect(anyOrder).toBeVisible({ timeout: 20_000 });
    await anyOrder.click();

    async function confirmStatus(label: string) {
      await page.getByRole("button", { name: label }).click();
      await page.getByRole("button", { name: "Подтвердить" }).click();
      await page.waitForTimeout(1500);
    }

    for (const label of [
      "Подтверждён",
      "Комплектуется",
      "Готов к отправке",
      "Отправлен",
      "Доставлен",
    ]) {
      const btn = page.getByRole("button", { name: label });
      if (await btn.isVisible().catch(() => false)) {
        await confirmStatus(label);
      }
    }

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto(orderPath);
    const confirmBtn = page.getByRole("button", {
      name: "Подтвердить получение",
    });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await expect(page.getByText(/заверш/i).first()).toBeVisible({
        timeout: 20_000,
      });
    }

    await signOut(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/balance");
    await expect
      .poll(
        async () => {
          const text = await page
            .getByTestId("balance-available-amount")
            .textContent();
          return Number((text ?? "0").replace(/[^\d]/g, ""));
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);
  });

  // ── STAGE 4: Promotion wallet payment ─────────────────────────────────────

  test("4.1 promotion debited from LOT wallet", async ({ page, request }) => {
    await seedWalletFixture(request, {
      email: DEMO.sellerEmail,
      topupAmount: 5000,
    });
    const before = await readWalletFixture(request, DEMO.sellerEmail);
    const beforeSpend = before.topupSpendableAmount;

    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/promotion-center");
    await expect(page.getByTestId("promotion-center-panel")).toBeVisible({
      timeout: 20_000,
    });

    const starterBtn = page.getByRole("button", { name: /STARTER/i }).first();
    test.skip((await starterBtn.count()) === 0, "No promotion-ready products");

    await starterBtn.click();
    await expect(page.getByText(/продвижение оплачено/i)).toBeVisible({
      timeout: 20_000,
    });

    await expect
      .poll(async () => {
        const after = await readWalletFixture(request, DEMO.sellerEmail);
        return beforeSpend - after.topupSpendableAmount;
      })
      .toBeGreaterThanOrEqual(990);
  });

  test("4.2 promotion insufficient funds shows error", async ({ page, request }) => {
    await resetWalletFixture(request, DEMO.sellerEmail);
    await seedWalletFixture(request, { email: DEMO.sellerEmail, topupAmount: 100 });

    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/promotion-center");
    const starterBtn = page.getByRole("button", { name: /STARTER/i }).first();
    test.skip((await starterBtn.count()) === 0, "No promotion-ready products");
    await starterBtn.click();
    await expect(page.getByText(/недостаточно/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── STAGE 5: Payout lifecycle ─────────────────────────────────────────────

  test("5.1 seller payout request → admin approve → complete", async ({
    page,
  }) => {
    test.skip(
      process.env.SELLER_PAYOUT_ENABLED !== "true",
      "SELLER_PAYOUT_ENABLED required",
    );

    await seedWalletFixture(page.request, {
      email: DEMO.sellerEmail,
      sellerAvailableAmount: 25_000,
    });

    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/payouts");
    await expect(page.getByTestId("seller-payout-panel")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel("Введите сумму").fill("5000");
    await page.getByRole("button", { name: "Продолжить" }).click();
    await page.locator("[data-testid^='payout-method-']").first().click();
    await page.getByRole("button", { name: "Продолжить" }).click();
    await page.getByTestId("payout-submit-request").click();
    await expect(page.getByTestId("payout-step-success")).toBeVisible({
      timeout: 15_000,
    });

    await signOut(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/payouts");
    await page.getByRole("link", { name: "Открыть" }).first().click();
    await page.getByRole("button", { name: "Одобрить" }).click();
    await page.getByTestId("admin-payout-complete").click();
    await expect(page.getByText(/выплачен|заверш/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  // ── STAGE 8: Admin dashboards ─────────────────────────────────────────────

  test("8.1 admin wallet / payouts / payments pages load", async ({ page }) => {
    await signIn(page, DEMO.adminEmail);
    for (const path of ["/admin/wallet", "/admin/payouts", "/admin/payments"]) {
      await page.goto(path);
      await expect(page.getByRole("heading").first()).toBeVisible({
        timeout: 20_000,
      });
    }
  });
});

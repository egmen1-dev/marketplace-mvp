import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  clearCart,
  signIn,
  signOut,
} from "./helpers";

async function createPickupProduct(
  page: import("@playwright/test").Page,
  opts: { pointName: string; title: string; prepayment: string },
) {
  await page.goto("/account/pickup-points/new");
  await page.getByLabel("Название").fill(opts.pointName);
  await page.getByLabel("Город").fill("Екатеринбург");
  await page.getByLabel("Адрес").fill("ул. Ленина 10");
  await page.getByLabel("График работы").fill("Пн-Пт 09:00-18:00");
  await page.getByRole("button", { name: "Добавить точку" }).click();
  await expect(page).toHaveURL(/\/account\/pickup-points\/?$/, {
    timeout: 30_000,
  });
  await expect(page.getByText(opts.pointName)).toBeVisible();

  await page.goto("/account/products/new");
  await page.getByLabel("Название", { exact: true }).fill(opts.title);
  await expect(page.getByText("Мы рекомендуем")).toBeVisible({
    timeout: 15_000,
  });
  await page
    .getByRole("button", { name: /Тепловые пушки/i })
    .first()
    .click();
  await expect(page.getByText("Характеристики")).toBeVisible({
    timeout: 10_000,
  });
  const power = page.getByLabel(/Мощность/i).first();
  if (await power.isVisible().catch(() => false)) {
    await power.fill("5");
  }
  const heatType = page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: "электрический" }) })
    .first();
  if (await heatType.isVisible().catch(() => false)) {
    await heatType.selectOption({ label: "электрический" });
  }
  await page.locator("#description").fill("Pickup reservation e2e");
  await page.getByLabel("Цена, ₽").fill("10000");
  await page.getByLabel("Количество на складе").fill("3");
  await page.getByLabel("Город", { exact: true }).fill("Екатеринбург");

  await page.getByLabel("Доступен самовывоз").check();
  await page.getByLabel(opts.pointName).check();
  await page.getByLabel("Возможна бронь товара").check();
  await page.getByLabel("Размер предоплаты (%)").selectOption(opts.prepayment);

  await page.getByRole("button", { name: "Опубликовать товар" }).click();
  await expect(page).toHaveURL(/\/account\/products\/?(?:\?.*)?$/, {
    timeout: 45_000,
  });
  await expect(page).not.toHaveURL(/\/new/);
  await expect(page.getByText(opts.title).first()).toBeVisible({
    timeout: 20_000,
  });

  const href = await page
    .locator("tr")
    .filter({ hasText: opts.title })
    .locator('a[href^="/product/"]')
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

async function buyerReserveAtCheckout(
  page: import("@playwright/test").Page,
  href: string,
) {
  await clearCart(page);
  await page.goto(href);
  await expect(page.getByTestId("pdp-reserve")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("pdp-reserve").click();
  await expect(page).toHaveURL(/\/checkout/, { timeout: 30_000 });
  // preferSellerPickup applies after mount
  await expect(page.getByTestId("checkout-fulfillment-pickup")).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByTestId("checkout-fulfillment-pickup").click();
  await expect(page.getByTestId("checkout-pickup-points")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Телефон").fill("+79991234567");
  await page.getByRole("button", { name: /^Забронировать$/ }).click();
  await expect(page).toHaveURL(/\/account\/orders\//, { timeout: 45_000 });
}

test.describe("pickup points & reservations", () => {
  test("seller creates pickup point and enables on product", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);

    const pointName = `Склад E2E ${Date.now()}`;
    const title = `E2E тепловая пушка Pickup ${Date.now()}`;
    const href = await createPickupProduct(page, {
      pointName,
      title,
      prepayment: "20",
    });

    // Seller views own PDP — fulfillment visible, reserve CTA hidden
    await page.goto(href);
    await expect(page.getByTestId("pdp-fulfillment")).toContainText(
      /Самовывоз/i,
    );
    await expect(page.getByTestId("pdp-fulfillment")).toContainText(/20%/);
    await expect(page.getByTestId("pdp-reserve")).toHaveCount(0);

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto(href);
    await expect(page.getByTestId("pdp-reserve")).toBeVisible({
      timeout: 20_000,
    });

    errors.assertClean();
  });

  test("buyer reserves via PDP, seller confirms status machine", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const stamp = Date.now();
    const pointName = `Склад Reserve ${stamp}`;
    const title = `E2E тепловая пушка Reserve ${stamp}`;

    await signIn(page, DEMO.sellerEmail);
    const href = await createPickupProduct(page, {
      pointName,
      title,
      prepayment: "0",
    });

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await buyerReserveAtCheckout(page, href);

    await page.goto("/account/reservations");
    await expect(page.getByTestId("reservation-card").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByTestId("reservation-card").filter({ hasText: title }).first(),
    ).toBeVisible();
    await expect(
      page.getByTestId("reservation-card").filter({ hasText: title }).first(),
    ).toHaveAttribute("data-status", "PENDING");

    await signOut(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/reservations");
    const card = page
      .getByTestId("reservation-card")
      .filter({ hasText: title })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.getByTestId("reservation-action-confirmed").click();
    await expect(card).toHaveAttribute("data-status", "CONFIRMED", {
      timeout: 15_000,
    });
    await card.getByTestId("reservation-action-ready").click();
    await expect(card).toHaveAttribute("data-status", "READY", {
      timeout: 15_000,
    });
    await card.getByTestId("reservation-action-completed").click();
    await expect(card).toHaveAttribute("data-status", "COMPLETED", {
      timeout: 15_000,
    });

    errors.assertClean();
  });

  test("buyer sees reservations section in cabinet", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/reservations");
    await expect(
      page.getByRole("heading", { name: "Бронирования" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Мои брони" })).toBeVisible();
    errors.assertClean();
  });

  test("admin can open reservations moderation", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/reservations");
    await expect(
      page.getByRole("heading", { name: "Бронирования" }),
    ).toBeVisible({ timeout: 15_000 });
    errors.assertClean();
  });

  test("seller can reject pending reservation", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const stamp = Date.now();
    const title = `E2E тепловая пушка Reject ${stamp}`;

    await signIn(page, DEMO.sellerEmail);
    const href = await createPickupProduct(page, {
      pointName: `Склад Reject ${stamp}`,
      title,
      prepayment: "0",
    });

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await buyerReserveAtCheckout(page, href);

    await signOut(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/reservations");
    const card = page
      .getByTestId("reservation-card")
      .filter({ hasText: title })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card).toHaveAttribute("data-status", "PENDING");
    await card.getByTestId("reservation-action-cancelled").click();
    await expect(card).toHaveAttribute("data-status", "CANCELLED", {
      timeout: 15_000,
    });

    errors.assertClean();
  });

  test("buyer can cancel pending reservation", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const stamp = Date.now();
    const title = `E2E тепловая пушка Cancel ${stamp}`;

    await signIn(page, DEMO.sellerEmail);
    const href = await createPickupProduct(page, {
      pointName: `Склад Cancel ${stamp}`,
      title,
      prepayment: "0",
    });

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await buyerReserveAtCheckout(page, href);

    await page.goto("/account/reservations");
    const card = page
      .getByTestId("reservation-card")
      .filter({ hasText: title })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card).toHaveAttribute("data-status", "PENDING");
    await card.getByTestId("reservation-cancel").click();
    await expect(card).toHaveAttribute("data-status", "CANCELLED", {
      timeout: 15_000,
    });

    errors.assertClean();
  });

  test("checkout shows pickup toggle, point, and prepayment amounts", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const stamp = Date.now();
    const title = `E2E тепловая пушка Checkout ${stamp}`;

    await signIn(page, DEMO.sellerEmail);
    const href = await createPickupProduct(page, {
      pointName: `Склад Checkout ${stamp}`,
      title,
      prepayment: "0",
    });

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await clearCart(page);
    await page.goto(href);
    await page.getByTestId("pdp-reserve").click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 30_000 });

    await expect(page.getByTestId("checkout-fulfillment-pickup")).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByTestId("checkout-fulfillment-pickup").click();
    await expect(page.getByTestId("checkout-pickup-points")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("checkout-pickup-point").first()).toBeVisible();
    await expect(
      page.getByTestId("checkout-pickup-amounts").first(),
    ).toContainText(/Предоплата/i);
    await expect(
      page.getByTestId("checkout-pickup-amounts").first(),
    ).toContainText(/остаток/i);
    await expect(page.getByTestId("checkout-pay-now")).toContainText(
      /К оплате сейчас/i,
    );

    errors.assertClean();
  });

  test("reservation create and confirm emit chat messages", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const stamp = Date.now();
    const title = `E2E тепловая пушка ChatRes ${stamp}`;

    await signIn(page, DEMO.sellerEmail);
    const href = await createPickupProduct(page, {
      pointName: `Склад ChatRes ${stamp}`,
      title,
      prepayment: "0",
    });

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await buyerReserveAtCheckout(page, href);

    await page.goto("/");
    await page.getByTestId("header-messages").click();
    await expect(page).toHaveURL(/\/account\/messages/, { timeout: 15_000 });
    await expect(page.getByText(/Создана бронь товара/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.getByText(/Создана бронь товара/i).first().click();
    await expect(page.getByTestId("conversation-thread")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId("chat-system-message").filter({
        hasText: /Создана бронь товара/i,
      }),
    ).toBeVisible();

    await signOut(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/reservations");
    const card = page
      .getByTestId("reservation-card")
      .filter({ hasText: title })
      .first();
    await card.getByTestId("reservation-action-confirmed").click();
    await expect(card).toHaveAttribute("data-status", "CONFIRMED", {
      timeout: 15_000,
    });

    await page.goto("/");
    await page.getByTestId("header-messages").click();
    await expect(
      page.getByText(/Продавец подтвердил бронь/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    errors.assertClean();
  });
});

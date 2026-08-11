import { expect, test, type Page } from "@playwright/test";

import { DEMO, attachErrorCollector, clearCart, signIn, signOut } from "./helpers";

/**
 * Real review E2E (TASK 059, sections 37/38). Uses the pickup reservation flow to
 * produce a genuine completed purchase, then: buyer leaves a review → PDP shows it
 * with a verified-purchase badge → seller replies → reply is visible on the PDP.
 */

async function createPickupProduct(
  page: Page,
  opts: { pointName: string; title: string },
): Promise<string> {
  await page.goto("/account/pickup-points/new");
  await page.getByLabel("Название").fill(opts.pointName);
  await page.getByLabel("Город").fill("Екатеринбург");
  await page.getByLabel("Адрес").fill("ул. Ленина 10");
  await page.getByLabel("График работы").fill("Пн-Пт 09:00-18:00");
  await page.getByRole("button", { name: "Добавить точку" }).click();
  await expect(page).toHaveURL(/\/account\/pickup-points\/?$/, { timeout: 30_000 });

  await page.goto("/account/products/new");
  await page.getByLabel("Название", { exact: true }).fill(opts.title);
  await expect(page.getByText("Мы рекомендуем")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Тепловые пушки/i }).first().click();
  await expect(page.getByText("Характеристики")).toBeVisible({ timeout: 10_000 });
  const power = page.getByLabel(/Мощность/i).first();
  if (await power.isVisible().catch(() => false)) await power.fill("5");
  const heatType = page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: "электрический" }) })
    .first();
  if (await heatType.isVisible().catch(() => false)) {
    await heatType.selectOption({ label: "электрический" });
  }
  await page.locator("#description").fill("Отзыв E2E товар");
  await page.getByLabel("Цена, ₽").fill("10000");
  await page.getByLabel("Количество на складе").fill("3");
  await page.getByLabel("Город", { exact: true }).fill("Екатеринбург");
  await page.getByLabel("Доступен самовывоз").check();
  await page.getByLabel(opts.pointName).check();
  await page.getByLabel("Возможна бронь товара").check();
  await page.getByLabel("Размер предоплаты (%)").selectOption("0");
  await page.getByRole("button", { name: "Опубликовать товар" }).click();
  await expect(page).toHaveURL(/\/account\/products\/?(?:\?.*)?$/, { timeout: 45_000 });
  await expect(page.getByText(opts.title).first()).toBeVisible({ timeout: 20_000 });

  const href = await page
    .locator("tr")
    .filter({ hasText: opts.title })
    .locator('a[href^="/product/"]')
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

async function buyerReserve(page: Page, href: string) {
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
  await page.getByLabel("Телефон").fill("+79991234567");
  await page.getByRole("button", { name: /^Забронировать$/ }).click();
  await expect(page).toHaveURL(/\/account\/orders\//, { timeout: 45_000 });
}

async function completeReservationAsSeller(page: Page, title: string) {
  await page.goto("/account/reservations");
  const card = page.getByTestId("reservation-card").filter({ hasText: title }).first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.getByTestId("reservation-action-confirmed").click();
  await expect(card).toHaveAttribute("data-status", "CONFIRMED", { timeout: 15_000 });
  await card.getByTestId("reservation-action-ready").click();
  await expect(card).toHaveAttribute("data-status", "READY", { timeout: 15_000 });
  await card.getByTestId("reservation-action-completed").click();
  await expect(card).toHaveAttribute("data-status", "COMPLETED", { timeout: 15_000 });
}

test.describe("reviews — real buyer review + seller reply", () => {
  test("completed purchase → review on PDP → seller reply visible", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const stamp = Date.now();
    const title = `E2E Отзыв пушка ${stamp}`;

    // Seller creates a pickup product.
    await signIn(page, DEMO.sellerEmail);
    const href = await createPickupProduct(page, {
      pointName: `Склад Review ${stamp}`,
      title,
    });

    // Buyer reserves it.
    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await buyerReserve(page, href);

    // Seller completes the reservation (purchase completed).
    await signOut(page);
    await signIn(page, DEMO.sellerEmail);
    await completeReservationAsSeller(page, title);

    // Buyer leaves a review.
    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/reviews");
    const awaiting = page
      .getByTestId("awaiting-review-item")
      .filter({ hasText: title })
      .first();
    await expect(awaiting).toBeVisible({ timeout: 20_000 });
    await awaiting.getByTestId("leave-review-cta").click();
    await awaiting.getByTestId("rating-star-5").click();
    await awaiting
      .getByPlaceholder(/Поделитесь впечатлением/i)
      .fill("Отличный товар, всё соответствует описанию.");
    await awaiting.getByRole("button", { name: /Опубликовать отзыв/i }).click();
    // On success the item leaves the "awaiting" list (revalidated).
    await expect(awaiting).toBeHidden({ timeout: 15_000 });

    // PDP shows the review with a verified-purchase badge and avg 5.0.
    await page.goto(href);
    const reviews = page.getByTestId("pdp-reviews");
    await expect(reviews.getByTestId("reviews-avg")).toHaveText("5.0", {
      timeout: 15_000,
    });
    await expect(reviews.getByTestId("review-card").first()).toContainText(
      "Отличный товар",
    );
    await expect(
      reviews.getByTestId("verified-purchase-badge").first(),
    ).toBeVisible();

    // Seller replies.
    await signOut(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/reviews");
    await page.getByTestId("reviews-tab-seller").click();
    const sellerItem = page
      .getByTestId("seller-review-item")
      .filter({ hasText: title })
      .first();
    await expect(sellerItem).toBeVisible({ timeout: 20_000 });
    await sellerItem.getByTestId("seller-reply-cta").click();
    await sellerItem
      .getByPlaceholder(/Ваш ответ покупателю/i)
      .fill("Спасибо за покупку!");
    await sellerItem.getByRole("button", { name: /^Ответить$/ }).click();
    await expect(sellerItem).toContainText("Спасибо за покупку!", { timeout: 15_000 });

    // Buyer/PDP sees the seller reply.
    await signOut(page);
    await page.goto(href);
    await expect(page.getByTestId("pdp-reviews")).toContainText("Ответ продавца");
    await expect(page.getByTestId("pdp-reviews")).toContainText("Спасибо за покупку!");

    errors.assertClean();
  });

  test("guest cannot access /account/reviews", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/account/reviews");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
  });
});

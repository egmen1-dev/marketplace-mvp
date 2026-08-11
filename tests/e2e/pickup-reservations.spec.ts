import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  cleanupPickupFixture,
  clearCart,
  createPickupFixture,
  expectSessionEmail,
  signIn,
  signOut,
  uniquePickupMarker,
  type PickupFixture,
} from "./helpers";

async function buyerReserveAtCheckout(
  page: import("@playwright/test").Page,
  fixture: PickupFixture,
) {
  await clearCart(page);
  await expectSessionEmail(page, DEMO.buyerEmail);
  await page.goto(fixture.productPath);
  await expect(page.getByTestId("pdp-purchase")).toHaveAttribute(
    "data-own-product",
    "0",
  );
  await expect(page.getByTestId("pdp-purchase")).toHaveAttribute(
    "data-reservation-available",
    "1",
  );
  await expect(page.getByTestId("pdp-reserve")).toBeVisible();
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

test.describe("pickup points & reservations", () => {
  test.describe.configure({ mode: "serial" });

  test("seller creates pickup point and enables on product", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePickupMarker(`cta-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, {
      marker,
      prepaymentPercent: 20,
    });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto(fixture.productPath);
      await expect(page.getByTestId("pdp-fulfillment")).toContainText(
        /Самовывоз/i,
      );
      await expect(page.getByTestId("pdp-fulfillment")).toContainText(/20%/);
      await expect(page.getByTestId("pdp-purchase")).toHaveAttribute(
        "data-own-product",
        "1",
      );
      await expect(page.getByTestId("pdp-reserve")).toHaveCount(0);

      await signOut(page);
      await signIn(page, DEMO.buyerEmail);
      await page.goto(fixture.productPath);
      await expect(page.getByTestId("pdp-purchase")).toHaveAttribute(
        "data-own-product",
        "0",
      );
      await expect(page.getByTestId("pdp-reserve")).toBeVisible();
      errors.assertClean();
    } finally {
      await cleanupPickupFixture(page, marker);
    }
  });

  test("buyer reserves via PDP, seller confirms status machine", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const marker = uniquePickupMarker(`flow-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, {
      marker,
      prepaymentPercent: 0,
    });

    try {
      await signIn(page, DEMO.buyerEmail);
      await buyerReserveAtCheckout(page, fixture);

      await page.goto("/account/reservations");
      const buyerCard = page
        .getByTestId("reservation-card")
        .filter({ hasText: fixture.title })
        .first();
      await expect(buyerCard).toBeVisible({ timeout: 20_000 });
      await expect(buyerCard).toHaveAttribute("data-status", "PENDING");

      await signOut(page);
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/reservations");
      const card = page
        .getByTestId("reservation-card")
        .filter({ hasText: fixture.title })
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
    } finally {
      await cleanupPickupFixture(page, marker);
    }
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
    const marker = uniquePickupMarker(`reject-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, {
      marker,
      prepaymentPercent: 0,
    });

    try {
      await signIn(page, DEMO.buyerEmail);
      await buyerReserveAtCheckout(page, fixture);

      await signOut(page);
      await signIn(page, DEMO.sellerEmail);
      await page.goto("/account/reservations");
      const card = page
        .getByTestId("reservation-card")
        .filter({ hasText: fixture.title })
        .first();
      await expect(card).toBeVisible({ timeout: 20_000 });
      await expect(card).toHaveAttribute("data-status", "PENDING");
      await card.getByTestId("reservation-action-cancelled").click();
      await expect(card).toHaveAttribute("data-status", "CANCELLED", {
        timeout: 15_000,
      });

      errors.assertClean();
    } finally {
      await cleanupPickupFixture(page, marker);
    }
  });

  test("buyer can cancel pending reservation", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const marker = uniquePickupMarker(`cancel-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, {
      marker,
      prepaymentPercent: 0,
    });

    try {
      await signIn(page, DEMO.buyerEmail);
      await buyerReserveAtCheckout(page, fixture);

      await page.goto("/account/reservations");
      const card = page
        .getByTestId("reservation-card")
        .filter({ hasText: fixture.title })
        .first();
      await expect(card).toBeVisible({ timeout: 20_000 });
      await expect(card).toHaveAttribute("data-status", "PENDING");
      await card.getByTestId("reservation-cancel").click();
      await expect(card).toHaveAttribute("data-status", "CANCELLED", {
        timeout: 15_000,
      });

      errors.assertClean();
    } finally {
      await cleanupPickupFixture(page, marker);
    }
  });

  test("checkout shows pickup toggle, point, and prepayment amounts", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const marker = uniquePickupMarker(`checkout-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, {
      marker,
      prepaymentPercent: 20,
      price: 10_000,
    });

    try {
      await signIn(page, DEMO.buyerEmail);
      await clearCart(page);
      await page.goto(fixture.productPath);
      await expect(page.getByTestId("pdp-reserve")).toBeVisible();
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
      ).toContainText(/2[\u00a0 ]?000/);
      await expect(
        page.getByTestId("checkout-pickup-amounts").first(),
      ).toContainText(/остаток/i);
      await expect(page.getByTestId("checkout-pay-now")).toContainText(
        /К оплате сейчас/i,
      );

      errors.assertClean();
    } finally {
      await cleanupPickupFixture(page, marker);
    }
  });

  test("reservation create and confirm emit chat messages", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = attachErrorCollector(page);
    const marker = uniquePickupMarker(`chat-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, {
      marker,
      prepaymentPercent: 0,
    });

    try {
      await signIn(page, DEMO.buyerEmail);
      await buyerReserveAtCheckout(page, fixture);

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
        .filter({ hasText: fixture.title })
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
    } finally {
      await cleanupPickupFixture(page, marker);
    }
  });
});

import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  cleanupPickupFixture,
  clearCart,
  createPickupFixture,
  signIn,
  uniquePickupMarker,
} from "./helpers";

test.describe("pickup security", () => {
  test("guest sees reserve CTA but must sign in to book", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePickupMarker(`guest-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, { marker });

    try {
      await page.goto(fixture.productPath);
      await expect(page.getByTestId("pdp-purchase")).toHaveAttribute(
        "data-own-product",
        "0",
      );
      await expect(page.getByTestId("pdp-reserve")).toBeVisible();
      await page.getByTestId("pdp-reserve").click();
      await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 20_000 });
      errors.assertClean();
    } finally {
      await cleanupPickupFixture(page, marker);
    }
  });

  test("seller never sees reserve CTA on own product", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const marker = uniquePickupMarker(`own-${Date.now().toString(36)}`);
    const fixture = await createPickupFixture(page, { marker });

    try {
      await signIn(page, DEMO.sellerEmail);
      await page.goto(fixture.productPath);
      await expect(page.getByTestId("pdp-purchase")).toHaveAttribute(
        "data-own-product",
        "1",
      );
      await expect(page.getByTestId("pdp-purchase")).toHaveAttribute(
        "data-reservation-reason",
        "own_product",
      );
      await expect(page.getByTestId("pdp-reserve")).toHaveCount(0);
      await expect(page.getByTestId("pdp-own-product")).toBeVisible();
      errors.assertClean();
    } finally {
      await cleanupPickupFixture(page, marker);
    }
  });

  test("buyer B cannot cancel buyer A reservation", async ({ browser }) => {
    test.setTimeout(180_000);
    const marker = uniquePickupMarker(`idor-${Date.now().toString(36)}`);

    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    const errors = attachErrorCollector(buyerPage);

    try {
      const fixture = await createPickupFixture(buyerPage, {
        marker,
        prepaymentPercent: 0,
      });

      await signIn(buyerPage, DEMO.buyerEmail);
      await clearCart(buyerPage);
      await buyerPage.goto(fixture.productPath);
      await buyerPage.getByTestId("pdp-reserve").click();
      await expect(buyerPage).toHaveURL(/\/checkout/, { timeout: 30_000 });
      await buyerPage.getByTestId("checkout-fulfillment-pickup").click();
      await buyerPage.getByLabel("Телефон").fill("+79991234567");
      await buyerPage.getByRole("button", { name: /^Забронировать$/ }).click();
      await expect(buyerPage).toHaveURL(/\/account\/orders\//, {
        timeout: 45_000,
      });

      await buyerPage.goto("/account/reservations");
      const card = buyerPage
        .getByTestId("reservation-card")
        .filter({ hasText: fixture.title })
        .first();
      await expect(card).toBeVisible();
      await expect(card.getByTestId("reservation-cancel")).toBeVisible();

      // Isolated context — no shared cookies with buyer A (avoids staging session races).
      await signIn(otherPage, DEMO.sellerBEmail);
      await otherPage.goto("/account/reservations");
      await expect(
        otherPage
          .getByTestId("reservation-card")
          .filter({ hasText: fixture.title }),
      ).toHaveCount(0);

      errors.assertClean();
      await cleanupPickupFixture(buyerPage, marker);
    } finally {
      await buyerContext.close();
      await otherContext.close();
    }
  });
});

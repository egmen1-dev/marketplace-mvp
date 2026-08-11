import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  signIn,
} from "./helpers";

test.describe("order lifecycle oms", () => {
  test("seller orders dashboard shows OMS counters and filters", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/sales");
    await expect(
      page.getByRole("heading", { name: "Заказы" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Новых")).toBeVisible();
    await expect(page.getByText("В работе")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Требуют подтверждения" }),
    ).toBeVisible();
    errors.assertClean();
  });

  test("buyer order detail shows timeline section when order exists", async ({
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
    errors.assertClean();
  });
});

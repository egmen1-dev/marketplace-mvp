import { test, expect } from "@playwright/test";

import {
  attachErrorCollector,
  openFirstCatalogProduct,
  primaryAddToCart,
} from "./helpers";

test.describe("product page conversion", () => {
  test("PDP opens with title, price, buy and seller", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await openFirstCatalogProduct(page);

    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByTestId("pdp-title")).toBeVisible();
    await expect(page.getByTestId("pdp-price")).toBeVisible();
    await expect(page.getByTestId("pdp-buy")).toBeVisible();
    await expect(page.getByTestId("pdp-add-cart")).toBeVisible();
    await expect(page.getByTestId("pdp-seller")).toBeVisible();
    await expect(page.getByTestId("pdp-specs")).toBeVisible();
    await expect(page.getByTestId("pdp-delivery")).toBeVisible();

    errors.assertClean();
  });

  test("add to cart from PDP works", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await openFirstCatalogProduct(page);

    await primaryAddToCart(page).click();
    await expect(
      page.getByRole("button", { name: "Добавлено" }).first(),
    ).toBeVisible({ timeout: 10_000 });

    errors.assertClean();
  });

  test("similar products section is present", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await openFirstCatalogProduct(page);

    const similar = page.getByTestId("pdp-similar").or(
      page.getByTestId("pdp-similar-empty"),
    );
    await expect(similar).toBeVisible();
    await expect(page.getByRole("heading", { name: "Похожие товары" })).toBeVisible();

    errors.assertClean();
  });

  test("mobile sticky buy CTA appears after scroll", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFirstCatalogProduct(page);

    await expect(page.getByTestId("pdp-buy")).toBeVisible();
    // Let client hydration settle before scroll (avoids flaky #418 races).
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);

    const sticky = page.getByTestId("pdp-sticky-purchase");
    await expect(sticky).toBeVisible();
    await expect(page.getByTestId("pdp-sticky-buy")).toBeVisible();

    errors.assertClean();
  });
});

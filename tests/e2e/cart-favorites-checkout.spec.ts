import { test, expect } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  openFirstCatalogProduct,
  primaryAddToCart,
  signIn,
} from "./helpers";

test.describe("guest cart", () => {
  test("add product to cart without auth", async ({ page }) => {
    const errors = attachErrorCollector(page);

    await openFirstCatalogProduct(page);
    await primaryAddToCart(page).click();
    await expect(page.getByRole("button", { name: "Добавлено" }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Корзина" })).toBeVisible();
    await expect(page.getByText("Корзина пуста")).toHaveCount(0);
    // Base UI Button+Link may expose as button
    await expect(
      page.getByRole("link", { name: "Оформить заказ" }).or(
        page.getByRole("button", { name: "Оформить заказ" }),
      ),
    ).toBeVisible();

    errors.assertClean();
  });
});

test.describe("favorites", () => {
  test("buyer can favorite a product", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);

    await openFirstCatalogProduct(page);
    const fav = page
      .locator("main")
      .getByRole("button", { name: /В избранное|Убрать из избранного/ })
      .first();
    await expect(fav).toBeVisible();

    if ((await fav.getAttribute("aria-pressed")) !== "true") {
      await fav.click();
    }
    await expect(fav).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
    await expect(fav).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });
    await expect(page.getByText(/Добавлено в избранное/i)).toBeVisible({
      timeout: 10_000,
    }).catch(() => undefined);

    await page.goto("/favorites");
    await expect(page).toHaveURL(/\/account\/favorites/);
    await expect(page.getByRole("heading", { name: /Избранн/i })).toBeVisible();
    await expect(page.getByText("В избранном пока пусто")).toHaveCount(0);
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({
      timeout: 15_000,
    });

    errors.assertClean();
  });
});

test.describe("checkout stop before payment", () => {
  test("buyer reaches checkout with CDEK quote, no Stripe charge", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);

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
    await expect(
      page.getByRole("heading", { name: "Оформление заказа" }),
    ).toBeVisible();

    await page.getByLabel("Имя получателя").fill("E2E Buyer");
    await page.getByLabel("Телефон").fill("+79001234567");
    await page.getByLabel("Город", { exact: true }).fill("Москва");

    await expect(page.getByLabel("Пункт выдачи (ПВЗ)")).not.toHaveValue("", {
      timeout: 15_000,
    });
    await expect(page.getByText(/Стоимость:/)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: "Оплатить" })).toBeVisible();
    await expect(page).not.toHaveURL(/stripe\.com/);

    errors.assertClean();
  });
});

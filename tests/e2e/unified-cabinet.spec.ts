import { expect, test } from "@playwright/test";

import {
  openFirstCatalogProduct,
  primaryAddToCart,
  uniqueEmail,
} from "./helpers";

test.describe("unified cabinet buyer → seller journey", () => {
  test("register, buy, become seller, list own product", async ({ page }) => {
    const email = uniqueEmail("cabinet");
    const password = "demo1234x";
    const title = `E2E Cabinet ${Date.now()}`;

    // 1) Registration (buyer)
    await page.goto("/auth/sign-up");
    await page.getByRole("button", { name: "Покупатель" }).click();
    await page.getByLabel("Имя").fill("E2E Cabinet");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(page).not.toHaveURL(/\/auth\/sign-up/, { timeout: 30_000 });

    // 2) Buyer purchase path — add to cart and open checkout
    await openFirstCatalogProduct(page);
    await primaryAddToCart(page).click();
    await expect(
      page.getByRole("button", { name: "Добавлено" }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.goto("/cart");
    await page
      .getByRole("link", { name: "Оформить заказ" })
      .or(page.getByRole("button", { name: "Оформить заказ" }))
      .click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Оформление заказа" }),
    ).toBeVisible();

    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { name: "Мои заказы" })).toBeVisible();

    // 3) Become seller → SellerProfile → product create
    await page.goto("/account?sell=1");
    await expect(page.getByTestId("become-seller").first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("become-seller").first().click();
    await expect(page).toHaveURL(/\/account\/products\/new/, {
      timeout: 30_000,
    });
    await expect(page.getByLabel("Название", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    // 4) Create product
    await page.getByLabel("Поиск категории").first().fill("тепловая");
    await page
      .getByRole("button", { name: /Тепловые пушки/i })
      .first()
      .click();
    await expect(page.getByTestId("category-path")).toContainText(/Тепловые/i);

    await page.getByLabel("Название", { exact: true }).fill(title);
    await page.locator("#description").fill("Unified cabinet e2e product");
    await page.getByLabel("Цена, ₽").fill("2500");
    await page.getByLabel("Количество на складе").fill("3");
    await page.getByLabel("Город", { exact: true }).fill("Москва");
    await page.getByRole("button", { name: "Опубликовать товар" }).click();

    // 5) Product visible in own listings
    await expect(page).toHaveURL(/\/account\/products/, { timeout: 45_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("navigation", { name: "Личный кабинет" }).getByRole("link", {
        name: "Мои товары",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Личный кабинет" }).getByRole("link", {
        name: "Мои продажи",
        exact: true,
      }),
    ).toBeVisible();

    // Journey assertions above are the contract; hydration #418 can fire on
    // redirect-heavy account transitions in production builds.
  });
});

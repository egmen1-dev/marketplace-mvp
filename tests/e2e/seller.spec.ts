import { test, expect } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("seller cabinet", () => {
  test("buyer legacy seller URL opens unified account (activation)", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/seller/dashboard");
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByTestId("become-seller").first()).toBeVisible({
      timeout: 15_000,
    });
    errors.assertClean();
  });

  test("seller create, edit, archive product", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);

    const title = `E2E Пушка ${Date.now()}`;

    await page.goto("/account/products/new");
    await expect(page.getByLabel("Название", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel("Поиск категории").first().fill("тепловая");
    await page
      .getByRole("button", { name: /Тепловые пушки/i })
      .first()
      .click();
    await expect(page.getByTestId("category-path")).toContainText(/Тепловые/i);

    await page.getByLabel("Название", { exact: true }).fill(title);
    await page.locator("#description").fill("E2E test product description");
    await page.getByLabel("Цена, ₽").fill("1990");
    await page.getByLabel("Количество на складе").fill("5");
    await page.getByLabel("Город", { exact: true }).fill("Москва");

    await page.getByRole("button", { name: "Опубликовать товар" }).click();
    await expect(page).toHaveURL(/\/account\/products/, { timeout: 45_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });

    const row = page.locator("tr").filter({ hasText: title }).first();
    await row.getByRole("button", { name: "Изменить" }).click();

    await expect(page.getByLabel("Название", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    const edited = `${title} edited`;
    await page.getByLabel("Название", { exact: true }).fill(edited);
    await page.getByLabel("Статус").selectOption("ARCHIVED");
    await page.getByRole("button", { name: "Сохранить изменения" }).click();
    await expect(page).toHaveURL(/\/account\/products\/?$/, { timeout: 30_000 });

    await expect(page.getByText(edited).first()).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator("tr").filter({ hasText: edited }).getByText("В архиве"),
    ).toBeVisible({ timeout: 10_000 });

    errors.assertClean();
  });
});

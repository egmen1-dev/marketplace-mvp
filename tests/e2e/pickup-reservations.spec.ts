import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("pickup points & reservations", () => {
  test("seller creates pickup point and enables on product", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);

    const pointName = `Склад E2E ${Date.now()}`;
    await page.goto("/account/pickup-points/new");
    await page.getByLabel("Название").fill(pointName);
    await page.getByLabel("Город").fill("Екатеринбург");
    await page.getByLabel("Адрес").fill("ул. Ленина 10");
    await page.getByLabel("График работы").fill("Пн-Пт 09:00-18:00");
    await page.getByRole("button", { name: "Добавить точку" }).click();
    await expect(page).toHaveURL(/\/account\/pickup-points\/?$/, {
      timeout: 30_000,
    });
    await expect(page.getByText(pointName)).toBeVisible();

    const title = `E2E Pickup ${Date.now()}`;
    await page.goto("/account/products/new");
    await page.getByLabel("Поиск категории").first().fill("тепловая");
    await page
      .getByRole("button", { name: /Тепловые пушки/i })
      .first()
      .click();
    await page.getByLabel("Название", { exact: true }).fill(title);
    await page.locator("#description").fill("Pickup e2e product");
    await page.getByLabel("Цена, ₽").fill("10000");
    await page.getByLabel("Количество на складе").fill("2");
    await page.getByLabel("Город", { exact: true }).fill("Екатеринбург");

    await page.getByLabel("Доступен самовывоз").check();
    await page.getByLabel(pointName).check();
    await page.getByLabel("Возможна бронь товара").check();
    await page.getByLabel("Размер предоплаты (%)").selectOption("20");

    await page.getByRole("button", { name: "Опубликовать товар" }).click();
    await expect(page).toHaveURL(/\/account\/products/, { timeout: 45_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });

    const href = await page
      .locator("tr")
      .filter({ hasText: title })
      .locator('a[href^="/product/"]')
      .first()
      .getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page.getByTestId("pdp-fulfillment")).toContainText(/Самовывоз/i);
    await expect(page.getByTestId("pdp-fulfillment")).toContainText(/20%/);

    errors.assertClean();
  });

  test("buyer sees reservations section in cabinet", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/account/reservations");
    await expect(page.getByRole("heading", { name: "Бронирования" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Мои брони" })).toBeVisible();
    errors.assertClean();
  });
});

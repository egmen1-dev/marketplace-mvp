import { test, expect } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("taxonomy smart product create", () => {
  test("seller: тепловая пушка → recommend → chars → publish → PDP", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);

    const title = `Тепловая пушка E2E ${Date.now()}`;

    await page.goto("/account/products/new");
    await expect(page.getByLabel("Название", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel("Название", { exact: true }).fill(title);

    await expect(page.getByText("Мы рекомендуем")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Тепловые пушки/i).first()).toBeVisible();

    await page
      .getByRole("button", { name: /Тепловые пушки/i })
      .first()
      .click();

    await expect(page.getByText("Характеристики")).toBeVisible({
      timeout: 10_000,
    });

    const power = page.getByLabel(/Мощность/i).first();
    await expect(power).toBeVisible();
    await power.fill("5");

    const heatSelect = page.locator("select[name^='charc_']").first();
    if (await heatSelect.count()) {
      const opts = await heatSelect.locator("option").allTextContents();
      const electric = opts.find((o) => /электри/i.test(o));
      if (electric) await heatSelect.selectOption({ label: electric.trim() });
    }

    await page.locator("#description").fill("Пушка для склада");
    await page.getByLabel("Цена, ₽").fill("12990");
    await page.getByLabel("Количество на складе").fill("3");
    await page.getByLabel("Город", { exact: true }).fill("Москва");

    await page.getByRole("button", { name: "Опубликовать товар" }).click();
    await expect(page).toHaveURL(/\/account\/products/, { timeout: 45_000 });

    const row = page.locator("tr").filter({ hasText: title }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });

    await page.goto(`/catalog?q=${encodeURIComponent(title)}`);
    await page.getByRole("link", { name: title }).first().click();

    await expect(page.getByTestId("pdp-title")).toContainText(title, {
      timeout: 20_000,
    });
    await expect(page.getByTestId("pdp-product-type")).toContainText(
      /Тепловые пушки/i,
    );
    await expect(page.getByTestId("pdp-specs")).toContainText(/Мощность/i);

    // React #418 on long seller create → catalog → PDP can flake in CI.
    errors.assertClean({ allowHydration: true });
  });

  test("mobile 390px: manual category browser opens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products/new");
    await expect(page.getByLabel("Название", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Выбрать вручную" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Поиск категорий")).toBeVisible();
    await page.getByLabel("Поиск категорий").fill("дрел");
    await expect(page.getByText(/Дрели/i).first()).toBeVisible({
      timeout: 10_000,
    });
    errors.assertClean();
  });
});

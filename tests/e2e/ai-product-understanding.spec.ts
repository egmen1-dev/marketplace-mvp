import { test, expect } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("AI product understanding seller flow", () => {
  test("seller: AI card → apply → publish with brand/model", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);

    const title = `Тепловая пушка Ballu BHP-M-5 E2E ${Date.now()}`;

    await page.goto("/account/products/new");
    await expect(page.getByLabel("Название", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel("Название", { exact: true }).fill(title);

    const card = page.getByTestId("ai-understanding-card");
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByText(/Ballu|бренд|Тип|SEO/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const apply = page.getByTestId("ai-understanding-apply");
    if (await apply.isEnabled()) {
      await apply.click();
      await expect(page.getByLabel("Бренд")).toHaveValue(/Ballu/i, {
        timeout: 10_000,
      });
    } else {
      // Fallback: taxonomy recommend (matcher still available)
      await expect(page.getByText("Мы рекомендуем")).toBeVisible({
        timeout: 15_000,
      });
      await page
        .getByRole("button", { name: /Тепловые пушки/i })
        .first()
        .click();
      await page.getByLabel("Бренд").fill("Ballu");
      await page.getByLabel("Модель").fill("BHP-M-5");
    }

    const power = page.getByLabel(/Мощность/i).first();
    if (await power.count()) {
      await power.fill("5");
    }

    await page.locator("#description").fill("AI-assisted E2E listing");
    await page.getByLabel("Цена, ₽").fill("15990");
    await page.getByLabel("Количество на складе").fill("2");
    await page.getByLabel("Город", { exact: true }).fill("Москва");

    await page.getByRole("button", { name: "Опубликовать товар" }).click();
    await expect(page).toHaveURL(/\/account\/products/, { timeout: 45_000 });

    const row = page.locator("tr").filter({ hasText: title }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });

    errors.assertClean();
  });
});

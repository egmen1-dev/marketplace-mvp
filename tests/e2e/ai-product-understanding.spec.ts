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
    await expect(card.getByText(/Ballu|Тип|SEO/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const apply = page.getByTestId("ai-understanding-apply");
    await expect(apply).toBeEnabled({ timeout: 15_000 });
    await apply.click();
    await expect(page.getByLabel("Бренд")).toHaveValue(/Ballu/i, {
      timeout: 10_000,
    });
    await expect(page.getByLabel("Модель")).not.toHaveValue("");

    const power = page.getByLabel(/Мощность/i).first();
    await expect(power).toBeVisible({ timeout: 10_000 });
    await power.fill("5");

    const heatSelect = page.locator("select[name^='charc_']").first();
    if (await heatSelect.count()) {
      const opts = await heatSelect.locator("option").allTextContents();
      const electric = opts.find((o) => /электри/i.test(o));
      if (electric) await heatSelect.selectOption({ label: electric.trim() });
    }

    await page.locator("#description").fill("AI-assisted E2E listing");
    await page.getByLabel("Цена, ₽").fill("15990");
    await page.getByLabel("Количество на складе").fill("2");
    await page.getByLabel("Город", { exact: true }).fill("Москва");

    await page.getByRole("button", { name: "Опубликовать товар" }).click();
    await expect(page).toHaveURL(/\/account\/products(\?|$)/, {
      timeout: 45_000,
    });

    const row = page.locator("tr").filter({ hasText: title }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });

    errors.assertClean();
  });
});

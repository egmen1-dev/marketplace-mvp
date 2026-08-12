import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("HOTFIX-UX-001 E2E", () => {
  test("seller changes stock inline", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products");
    await expect(page.getByRole("heading", { name: /товары/i })).toBeVisible({
      timeout: 20_000,
    });

    const stockInput = page.getByLabel("Остаток на складе").first();
    await expect(stockInput).toBeVisible({ timeout: 15_000 });
    const current = Number.parseInt(await stockInput.inputValue(), 10);
    const next = current === 7 ? 8 : 7;
    await stockInput.fill(String(next));
    await stockInput.blur();
    await expect(stockInput).toHaveValue(String(next), { timeout: 15_000 });
    errors.assertClean();
  });

  test("buyer cannot add out-of-stock product", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);

    await page.goto("/catalog?inStock=true");
    await page.goto("/catalog");

    const oosCard = page
      .locator("article")
      .filter({ has: page.getByRole("button", { name: "Нет в наличии" }) })
      .first();

    if ((await oosCard.count()) === 0) {
      test.skip(true, "No out-of-stock products in seed");
    }

    await expect(oosCard.getByRole("button", { name: "Нет в наличии" })).toBeDisabled();
    errors.assertClean();
  });

  test("admin opens chat in read-only mode", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/messages");
    await expect(page.getByRole("heading", { name: "Диалоги" })).toBeVisible({
      timeout: 20_000,
    });

    const row = page.getByTestId("conversation-row").first();
    if ((await row.count()) === 0) {
      test.skip(true, "No conversations in seed");
    }

    await row.click();
    await expect(page.getByTestId("conversation-thread")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("chat-readonly-notice")).toBeVisible();
    await expect(page.getByTestId("chat-input")).toHaveCount(0);
    errors.assertClean();
  });

  test("mobile sign-in at 390px", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill(DEMO.buyerEmail);
    await page.getByLabel("Пароль").fill(DEMO.password);
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).not.toHaveURL(/\/auth\/sign-in/, { timeout: 30_000 });
    await expect(page.getByTestId("site-header")).toBeVisible();
    errors.assertClean();
  });
});

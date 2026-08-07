import {
  attachErrorCollector,
  DEMO,
  signIn,
} from "./helpers";
import { expect, test } from "@playwright/test";

test.describe("account cabinet layout", () => {
  test("sidebar persists favorites → orders navigation", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);

    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "Избранное" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Личный кабинет" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("link", { name: "Мои заказы" }).click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole("heading", { name: "Мои заказы" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Личный кабинет" })).toBeVisible();

    errors.assertClean();
  });

  test("mobile nav select keeps cabinet context", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, DEMO.buyerEmail);

    await page.goto("/profile");
    await expect(page.getByLabel("Раздел кабинета")).toBeVisible();
    await page.getByLabel("Раздел кабинета").selectOption("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();
    await expect(page.getByLabel("Раздел кабинета")).toBeVisible();

    errors.assertClean();
  });
});

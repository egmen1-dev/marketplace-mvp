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

    await page.goto("/account/favorites");
    await expect(page.getByRole("heading", { name: "Избранное" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Личный кабинет" })).toBeVisible({
      timeout: 10_000,
    });

    await page
      .getByRole("navigation", { name: "Личный кабинет" })
      .getByRole("link", { name: "Покупки", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/orders/);
    await expect(page.getByRole("heading", { name: "Мои заказы" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Личный кабинет" })).toBeVisible();

    errors.assertClean();
  });

  test("legacy /favorites and /orders redirect into cabinet", async ({ page }) => {
    await signIn(page, DEMO.buyerEmail);

    await page.goto("/favorites");
    await expect(page).toHaveURL(/\/account\/favorites/);
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/account\/orders/);
  });

  test("mobile nav select keeps cabinet context", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, DEMO.buyerEmail);

    await page.goto("/profile");
    await expect(page.getByLabel("Раздел кабинета")).toBeVisible();
    await page.getByLabel("Раздел кабинета").selectOption("/account/settings");
    await expect(page).toHaveURL(/\/account\/settings/);
    await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();
    await expect(page.getByLabel("Раздел кабинета")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Быстрый переход" })).toBeVisible();

    errors.assertClean();
  });

  test("buyer sees start-selling CTA, seller sees sales links", async ({
    browser,
  }) => {
    const buyerCtx = await browser.newContext();
    const sellerCtx = await browser.newContext();
    const buyer = await buyerCtx.newPage();
    const seller = await sellerCtx.newPage();
    const buyerErrors = attachErrorCollector(buyer);
    const sellerErrors = attachErrorCollector(seller);

    await signIn(buyer, DEMO.buyerEmail);
    await buyer.goto("/account");
    await expect(buyer.getByTestId("become-seller").first()).toBeVisible();
    await expect(
      buyer.getByRole("navigation", { name: "Личный кабинет" }).getByRole("link", {
        name: "Мои товары",
        exact: true,
      }),
    ).toHaveCount(0);
    buyerErrors.assertClean();

    await signIn(seller, DEMO.sellerEmail);
    await seller.goto("/account");
    await expect(
      seller.getByRole("navigation", { name: "Личный кабинет" }).getByRole("link", {
        name: "Мои товары",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      seller.getByRole("navigation", { name: "Личный кабинет" }).getByRole("link", {
        name: "Продажи",
        exact: true,
      }),
    ).toBeVisible();
    sellerErrors.assertClean();

    await buyerCtx.close();
    await sellerCtx.close();
  });
});

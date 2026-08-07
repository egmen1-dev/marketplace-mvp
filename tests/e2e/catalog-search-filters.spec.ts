import { test, expect } from "@playwright/test";

import { attachErrorCollector } from "./helpers";

test.describe("catalog search filters sort mobile", () => {
  test("search тепловая finds heat-related products with count", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(
      "/catalog?q=%D1%82%D0%B5%D0%BF%D0%BB%D0%BE%D0%B2%D0%B0%D1%8F",
    );

    await expect(page.getByTestId("catalog-result-count")).toContainText(
      /Найдено \d+ товар/i,
    );
    await expect(
      page.getByRole("main").getByText(/тепловая|Тепловые|пушк|обогрев/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    errors.assertClean();
  });

  test("search дрель finds drills", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog?q=%D0%B4%D1%80%D0%B5%D0%BB%D1%8C");

    await expect(page.getByTestId("catalog-result-count")).toContainText(
      /Найдено \d+ товар/i,
    );
    await expect(
      page.getByRole("main").getByText(/дрел/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    errors.assertClean();
  });

  test("price filter persists in URL and reloads", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog?priceMin=1000&priceMax=20000&sort=price_asc");

    await expect(page).toHaveURL(/priceMin=1000/);
    await expect(page).toHaveURL(/priceMax=20000/);
    await expect(page.getByTestId("catalog-sort").first()).toHaveValue("price_asc");

    await page.reload();
    await expect(page).toHaveURL(/priceMin=1000/);
    await expect(page.getByTestId("catalog-sort").first()).toHaveValue("price_asc");
    await expect(page.getByRole("main")).toBeVisible();

    errors.assertClean();
  });

  test("sort price ASC updates URL", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog");

    await page.getByTestId("catalog-sort").first().selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page.getByTestId("catalog-sort").first()).toHaveValue("price_asc");

    errors.assertClean();
  });

  test("mobile filter drawer opens and applies", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/catalog");

    await page.getByTestId("catalog-filters-mobile").click();
    await expect(page.getByTestId("catalog-filters-drawer")).toBeVisible();

    await page.locator("#mob-priceMin").fill("500");
    await page.locator("#mob-priceMax").fill("50000");
    await page.getByTestId("catalog-filters-apply").click();

    await expect(page).toHaveURL(/priceMin=500/);
    await expect(page).toHaveURL(/priceMax=50000/);

    errors.assertClean();
  });
});

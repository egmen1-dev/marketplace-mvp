import { test, expect } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  openFirstCatalogProduct,
  signIn,
} from "./helpers";

test.describe("conversion intelligence A-007", () => {
  test("buyer PDP shows why-buy, specs, empty reviews", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await openFirstCatalogProduct(page);

    await expect(page.getByTestId("pdp-why-buy")).toBeVisible();
    await expect(page.getByTestId("pdp-specs")).toBeVisible();
    await expect(page.getByTestId("pdp-seller")).toBeVisible();
    await expect(page.getByTestId("pdp-reviews-placeholder")).toContainText(
      "Будьте первым",
    );
    await expect(page.getByTestId("pdp-rating-empty")).toContainText(
      "Рейтинг появится",
    );

    const expand = page.getByTestId("pdp-specs-expand");
    if (await expand.isVisible().catch(() => false)) {
      await expand.click();
      await expect(expand).toHaveAttribute("aria-expanded", "true");
    }

    errors.assertClean();
  });

  test("seller products show quality score", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products");
    await expect(page.getByRole("heading", { name: "Товары" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("product-quality-score").first()).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin conversion dashboard opens", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/conversion");
    await expect(page.getByTestId("admin-conversion")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("heading", { name: "Conversion" }),
    ).toBeVisible();
    await expect(page.getByText("PDP views")).toBeVisible();
    errors.assertClean();
  });
});

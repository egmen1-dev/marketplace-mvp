import { test, expect } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("SEO growth landings", () => {
  test("category page has H1 and metadata-friendly structure", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/categories");
    const first = page.locator('a[href^="/category/"]').first();
    await expect(first).toBeVisible({ timeout: 20_000 });
    await first.click();
    await expect(page.locator("h1")).toBeVisible({ timeout: 20_000 });
    errors.assertClean();
  });

  test("brands index loads", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/brands");
    await expect(
      page.getByRole("heading", { name: "Бренды" }),
    ).toBeVisible({ timeout: 20_000 });
    errors.assertClean();
  });

  test("admin SEO center opens", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/seo");
    await expect(
      page.getByRole("heading", { name: /SEO Growth Center/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("admin-seo-panel")).toBeVisible();
    errors.assertClean();
  });
});

import { expect, test } from "@playwright/test";

import { DEMO, signIn } from "./helpers";

/**
 * AGENT-020 Search Intelligence E2E: synonym + spell-corrected search find real
 * products; admin explainability; security.
 */

test.describe("intelligent catalog search", () => {
  test("synonym «ноут» finds the laptop", async ({ page }) => {
    await page.goto(`/catalog?q=${encodeURIComponent("ноут")}`);
    await expect(page.getByTestId("catalog-result-count")).toContainText(
      /Найдено \d+/i,
      { timeout: 20_000 },
    );
    await expect(
      page.getByRole("main").getByText(/Ноутбук/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("misspelled «перфораторр» finds the rotary hammer", async ({ page }) => {
    await page.goto(`/catalog?q=${encodeURIComponent("перфораторр")}`);
    await expect(
      page.getByRole("main").getByText(/Перфоратор/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("admin search explainability", () => {
  test("mixed query parses brand + model + intent MIXED", async ({ page }) => {
    await signIn(page, DEMO.adminEmail);
    await page.goto(`/admin/search?q=${encodeURIComponent("makita hr2470")}`);
    const explain = page.getByTestId("search-explain");
    await expect(explain).toBeVisible({ timeout: 20_000 });
    await expect(explain).toContainText("MIXED");
    await expect(explain).toContainText(/makita/i);
    await expect(explain).toContainText(/HR2470/i);
  });

  test("buyer cannot access /admin/search", async ({ page }) => {
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/admin/search");
    await expect(page).not.toHaveURL(/\/admin\/search/, { timeout: 15_000 });
  });
});

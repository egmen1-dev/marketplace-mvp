import { test, expect } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("admin taxonomy import center", () => {
  test("admin can open import center and run dry-run", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);

    await page.goto("/admin/taxonomy/import");
    await expect(
      page.getByRole("heading", { name: /Taxonomy Import Center/i }),
    ).toBeVisible({ timeout: 20_000 });

    await expect(page.getByTestId("taxonomy-import-panel")).toBeVisible();
    await page.getByTestId("taxonomy-import-dry-run").click();

    // Batches table should list at least one row after dry-run
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 60_000,
    });

    errors.assertClean();
  });
});

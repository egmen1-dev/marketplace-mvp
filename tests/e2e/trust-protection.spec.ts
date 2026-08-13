import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("EPIC-TRUST-001 buyer protection", () => {
  test("admin disputes dashboard loads", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/disputes");
    await expect(page.getByTestId("admin-disputes-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

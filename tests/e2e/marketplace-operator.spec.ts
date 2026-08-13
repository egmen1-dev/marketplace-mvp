import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-OPERATOR-001 marketplace operator", () => {
  test.skip(
    process.env.MARKETPLACE_OPERATOR_ENABLED !== "true",
    "Requires MARKETPLACE_OPERATOR_ENABLED=true",
  );

  test("admin opens operator dashboard with plans and actions", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/operator");
    await expect(
      page.getByTestId("admin-marketplace-operator-panel"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("operator-marketplace-status")).toBeVisible();
    await expect(page.getByTestId("operator-growth-plans")).toBeVisible();
    await expect(page.getByTestId("operator-recommended-actions")).toBeVisible();
    errors.assertClean();
  });
});

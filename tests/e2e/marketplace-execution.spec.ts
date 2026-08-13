import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("MARKETPLACE-EXECUTION-001 growth execution engine", () => {
  test.skip(
    process.env.MARKETPLACE_EXECUTION_ENABLED !== "true",
    "Requires MARKETPLACE_EXECUTION_ENABLED=true",
  );

  test("admin opens execution dashboard with task workflow", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/execution");
    await expect(
      page.getByTestId("admin-marketplace-execution-panel"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("execution-active-plans")).toBeVisible();
    await expect(page.getByTestId("execution-todays-priorities")).toBeVisible();
    await expect(page.getByTestId("execution-task-pipeline")).toBeVisible();
    errors.assertClean();
  });
});

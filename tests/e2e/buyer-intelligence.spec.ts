import { expect, test } from "@playwright/test";

import { attachErrorCollector, DEMO, signIn } from "./helpers";

test.describe("BUYER-INTELLIGENCE-001 buyer intelligence engine", () => {
  test.skip(
    process.env.BUYER_INTELLIGENCE_ENABLED !== "true",
    "Requires BUYER_INTELLIGENCE_ENABLED=true",
  );

  test("catalog search shows AI recommendations block", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/catalog?q=дрель%20для%20дома");
    await expect(page.getByTestId("buyer-recommendations-section")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin sees buyer intelligence overview", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/buyers");
    await expect(page.getByTestId("admin-buyer-intelligence-panel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

async function resetBuyerFixture(request: import("@playwright/test").APIRequestContext) {
  const secret = process.env.E2E_FIXTURE_SECRET?.trim();
  if (!secret) return false;
  const res = await request.post("/api/e2e/first-entry-fixture", {
    headers: { "x-e2e-secret": secret },
  });
  return res.ok();
}

test.describe("SELLER-OPERATING-DESK-001 business workspace", () => {
  test.skip(
    process.env.SELLER_OPERATING_DESK_ENABLED !== "true",
    "Requires SELLER_OPERATING_DESK_ENABLED=true",
  );

  test("seller lands on operating desk from nav", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-operating-desk")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("operating-desk-now-headline")).toBeVisible();
    await expect(page.getByTestId("operating-desk-today-actions")).toBeVisible();
    errors.assertClean();
  });

  test("experienced seller sees business desk", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-operating-desk")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("seller account redirects to business desk", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account\/business/, { timeout: 15_000 });
    errors.assertClean();
  });
});

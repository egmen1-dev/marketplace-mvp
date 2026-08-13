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

test.describe("SELLER-BUSINESS-INTELLIGENCE-001 AI business assistant", () => {
  test.skip(
    process.env.SELLER_BUSINESS_INTELLIGENCE_ENABLED !== "true",
    "Requires SELLER_BUSINESS_INTELLIGENCE_ENABLED=true",
  );

  test("experienced seller sees business intelligence dashboard", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-business-intelligence")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("bi-summary")).toBeVisible();
    await expect(page.getByTestId("bi-next-action")).toBeVisible();
    await expect(page.getByTestId("bi-assistant")).toBeVisible();
    errors.assertClean();
  });

  test("seller can click next action CTA", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    const cta = page.getByTestId("bi-next-action-cta");
    await expect(cta).toBeVisible({ timeout: 20_000 });
    await expect(cta).toHaveAttribute("href", /\/account\//);
    errors.assertClean();
  });

  test("seller sees balance money education", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/balance");
    await expect(page.getByTestId("seller-balance-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("seller-money-education")).toBeVisible();
    errors.assertClean();
  });

  test("seller sees business notifications", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-list")).toBeVisible();
    await expect(page.locator("[data-testid^='notification-']").first()).toBeVisible({
      timeout: 15_000,
    });
    errors.assertClean();
  });

  test("new seller first entry shows business assistant", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await page.goto("/account/seller-start");
    await expect(page.getByTestId("seller-start-panel")).toBeVisible({
      timeout: 20_000,
    });
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-business-intelligence")).toBeVisible({
      timeout: 20_000,
    });
    const emptyOrJourney = page
      .getByTestId("bi-empty-state")
      .or(page.getByTestId("bi-first-journey"));
    await expect(emptyOrJourney.first()).toBeVisible();
    errors.assertClean();
  });

  test("admin sees activation intelligence", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/sellers");
    await expect(page.getByTestId("admin-seller-activation-intelligence")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

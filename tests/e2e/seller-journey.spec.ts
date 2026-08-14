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

test.describe("SELLER-JOURNEY-UX-002 unified seller journey", () => {
  test.skip(
    process.env.SELLER_JOURNEY_ENABLED !== "true",
    "Requires SELLER_JOURNEY_ENABLED=true",
  );

  test("new seller sees journey on growth page", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET for buyer reset");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await page.goto("/account/growth");
    await expect(page.getByTestId("seller-journey-card")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("seller-journey-coach")).toBeVisible();
    await expect(page.getByTestId("seller-journey-progress-bar")).toBeVisible();
    errors.assertClean();
  });

  test("seller start shows journey card", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET for buyer reset");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await expect(page.getByTestId("seller-journey-card")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("products empty state uses journey copy", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET for buyer reset");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await page.goto("/account/products");
    await expect(page.getByTestId("seller-journey-empty-state")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("experienced seller sees journey without empty onboarding redirect", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/growth");
    await expect(page.getByTestId("seller-journey-card")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("admin sees seller journey funnel", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/sellers");
    await expect(page.getByTestId("admin-seller-journey-funnel")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });

  test("journey coach CTA is clickable", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET for buyer reset");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await page.goto("/account/growth");
    const cta = page.getByTestId("seller-journey-coach-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /\/account\//);
    errors.assertClean();
  });
});

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

test.describe("SELLER-FIRST-ENTRY-001 first seller experience", () => {
  test.skip(
    process.env.SELLER_FIRST_ENTRY_ENABLED !== "true",
    "Requires SELLER_FIRST_ENTRY_ENABLED=true",
  );

  test("buyer becomes seller and sees seller start", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET for buyer reset");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await expect(page).toHaveURL(/\/account\/seller-start/, { timeout: 30_000 });
    await expect(page.getByTestId("seller-start-panel")).toBeVisible();
    await expect(page.getByTestId("seller-start-progress")).toContainText("0 / 5");
    errors.assertClean();
  });

  test("new seller redirect from products to seller-start", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET for buyer reset");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await expect(page).toHaveURL(/\/account\/seller-start/, { timeout: 30_000 });

    await page.goto("/account/products");
    await expect(page).toHaveURL(/\/account\/seller-start/, { timeout: 15_000 });
    errors.assertClean();
  });

  test("experienced seller does not see seller start redirect", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products");
    await expect(page).not.toHaveURL(/\/account\/seller-start/);
    await expect(page.getByTestId("seller-next-step-banner")).toHaveCount(0);
    errors.assertClean();
  });

  test("seller start primary CTA links to product create", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET for buyer reset");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await expect(page.getByTestId("seller-start-primary-cta")).toHaveAttribute(
      "href",
      "/account/products/new",
    );
    errors.assertClean();
  });

  test("admin sees seller activation block", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/sellers");
    await expect(page.getByTestId("admin-seller-activation")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

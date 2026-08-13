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

test.describe("SELLER-OPERATIONS-WORKSPACE-001 daily operations", () => {
  test.skip(
    process.env.SELLER_OPERATIONS_ENABLED !== "true",
    "Requires SELLER_OPERATIONS_ENABLED=true",
  );

  test("experienced seller sees today workspace", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-operations-today")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("operations-today-summary")).toBeVisible();
    await expect(page.getByTestId("operations-daily-priorities")).toBeVisible();
    await expect(page.getByTestId("operations-order-block")).toBeVisible();
    await expect(page.getByTestId("operations-money-block")).toBeVisible();
    await expect(page.getByTestId("operations-ai-advice")).toBeVisible();
    errors.assertClean();
  });

  test("seller can open order and product actions from priorities", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page.getByTestId("operations-daily-priorities")).toBeVisible({
      timeout: 20_000,
    });

    const priorityLink = page
      .locator("[data-testid^='operations-priority-'] a")
      .first();
    await expect(priorityLink).toBeVisible();
    const href = await priorityLink.getAttribute("href");
    expect(href).toMatch(/\/account\//);

    await page.goto("/account/sales");
    await expect(page).toHaveURL(/\/account\/sales/);

    await page.goto("/account/products");
    await expect(page).toHaveURL(/\/account\/products/);
    errors.assertClean();
  });

  test("seller sees AI recommendation CTA", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    const aiCta = page.getByTestId("operations-ai-advice").locator("a").first();
    await expect(aiCta).toBeVisible({ timeout: 20_000 });
    await expect(aiCta).toHaveAttribute("href", /\/account\//);
    errors.assertClean();
  });

  test("seller sees balance block and operations notifications", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/business");
    await expect(page.getByTestId("operations-money-block")).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-list")).toBeVisible();
    const notification = page.locator("[data-testid^='notification-']").first();
    await expect(notification).toBeVisible({ timeout: 15_000 });
    errors.assertClean();
  });

  test("new seller sees empty state or checklist", async ({ page, request }) => {
    const errors = attachErrorCollector(page);
    const fixtureOk = await resetBuyerFixture(request);
    test.skip(!fixtureOk, "Requires E2E_FIXTURE_SECRET");

    await signIn(page, DEMO.buyerEmail);
    await page.goto("/sell");
    await page.getByTestId("become-seller").click();
    await page.goto("/account/business");
    await expect(page.getByTestId("seller-operations-today")).toBeVisible({
      timeout: 20_000,
    });
    const emptyOrChecklist = page
      .getByTestId("operations-empty-state")
      .or(page.getByTestId("operations-checklist"));
    await expect(emptyOrChecklist.first()).toBeVisible();
    errors.assertClean();
  });

  test("admin sees seller operations health", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/sellers");
    await expect(page.getByTestId("admin-seller-operations-health")).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

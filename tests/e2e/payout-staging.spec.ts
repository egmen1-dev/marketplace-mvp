import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

const E2E_SECRET = process.env.E2E_FIXTURE_SECRET ?? "";
const STAGING =
  process.env.PLAYWRIGHT_BASE_URL?.includes("railway.app") ?? false;

test.describe("FINANCIAL-E2E payout staging", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !STAGING ||
      !E2E_SECRET ||
      process.env.SELLER_PAYOUT_ENABLED !== "true",
    "Requires staging + E2E_FIXTURE_SECRET + SELLER_PAYOUT_ENABLED=true",
  );

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/e2e/payout-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
      data: { availableAmount: 42000 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete("/api/e2e/payout-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });
  });

  test("seller can open wallet withdraw tab with available funds", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/wallet?tab=withdraw");
    await expect(page.getByText(/вывести|доступно/i).first()).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

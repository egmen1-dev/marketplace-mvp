import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

const E2E_SECRET = process.env.E2E_FIXTURE_SECRET ?? "";
const STAGING =
  process.env.PLAYWRIGHT_BASE_URL?.includes("railway.app") ?? false;

test.describe("FINANCIAL-E2E promotion wallet staging", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!STAGING, "Set PLAYWRIGHT_BASE_URL to Railway staging");
  test.skip(!E2E_SECRET, "Requires E2E_FIXTURE_SECRET on staging");

  test.beforeAll(async ({ request }) => {
    await request.post("/api/e2e/wallet-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
      data: { email: DEMO.sellerEmail, topupAmount: 5000 },
    });
  });

  test("promotion center shows wallet payment path", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/promotion-center");
    await expect(page.getByRole("heading", { name: /продвижен/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/кошел/i).first()).toBeVisible();
    errors.assertClean();
  });
});

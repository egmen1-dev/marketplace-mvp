import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

const E2E_SECRET = process.env.E2E_FIXTURE_SECRET ?? "";
const STAGING =
  process.env.PLAYWRIGHT_BASE_URL?.includes("railway.app") ?? false;

test.describe("FINANCIAL-E2E wallet checkout staging", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!STAGING, "Set PLAYWRIGHT_BASE_URL to Railway staging");
  test.skip(!E2E_SECRET, "Requires E2E_FIXTURE_SECRET on staging");

  test.beforeAll(async ({ request }) => {
    await request.delete("/api/e2e/wallet-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
      data: { email: DEMO.sellerEmail },
    });
    const res = await request.post("/api/e2e/wallet-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
      data: { email: DEMO.sellerEmail, topupAmount: 5000 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete("/api/e2e/wallet-fixture", {
      headers: { "x-e2e-secret": E2E_SECRET },
      data: { email: DEMO.sellerEmail },
    });
  });

  test("checkout shows LOT wallet payment option with seeded balance", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/wallet");
    await expect(page.getByText(/5[\s\u00a0]?000/)).toBeVisible({
      timeout: 20_000,
    });
    errors.assertClean();
  });
});

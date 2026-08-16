import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

const E2E_SECRET = process.env.E2E_FIXTURE_SECRET ?? "";
const STAGING =
  process.env.PLAYWRIGHT_BASE_URL?.includes("railway.app") ?? false;

test.describe("FINANCIAL-E2E wallet top-up staging", () => {
  test.skip(!STAGING, "Set PLAYWRIGHT_BASE_URL to Railway staging");
  test.skip(!E2E_SECRET, "Requires E2E_FIXTURE_SECRET on staging");

  test("Stripe health must be configured before top-up E2E", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    const json = (await health.json()) as {
      checks: { stripe?: { configured?: boolean } };
    };
    test.skip(!json.checks.stripe?.configured, "Stripe not configured on staging");
  });

  test("wallet top-up tab loads without server error", async ({ page, request }) => {
    const health = await request.get("/api/health");
    const json = (await health.json()) as {
      checks: { stripe?: { configured?: boolean } };
    };
    test.skip(!json.checks.stripe?.configured, "Stripe not configured on staging");

    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/wallet?tab=topup");
    await expect(page.getByRole("heading", { name: "Кошелёк ЛОТ" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByTestId("wallet-topup-form").getByRole("button", { name: "Пополнить" }),
    ).toBeVisible();
    errors.assertClean();
  });
});

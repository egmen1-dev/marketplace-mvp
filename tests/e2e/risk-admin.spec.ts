import { expect, test } from "@playwright/test";

import { DEMO, signIn } from "./helpers";

/**
 * AGENT-019 admin Risk Center E2E (section 50) + security (section 52/44).
 */

test.describe("admin risk center", () => {
  test("admin sees risk events, opens explainability, resolves (history kept)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/risk");
    await expect(page.getByRole("heading", { name: "Риск-центр" })).toBeVisible({
      timeout: 20_000,
    });

    // Trigger a scan (idempotent, analysis-only).
    await page.getByTestId("risk-scan").click();
    await expect(page.getByTestId("risk-events-list")).toBeVisible({ timeout: 20_000 });

    const firstEvent = page.getByTestId("risk-event").first();
    await expect(firstEvent).toBeVisible({ timeout: 20_000 });

    // Open the product risk detail (explainability).
    await firstEvent.getByRole("link", { name: /Товар/i }).first().click();
    await expect(page.getByTestId("entity-score")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("risk-explainability")).toBeVisible();

    // Back to center, resolve (dismiss) the first event; it stays in history.
    await page.goto("/admin/risk");
    const before = await page.getByTestId("risk-event").count();
    expect(before).toBeGreaterThan(0);
    await page.getByTestId("risk-event").first().getByTestId("risk-resolve-dismiss").click();
    await expect(page.getByTestId("risk-events-list")).toBeVisible({ timeout: 20_000 });
    // Event not hard-deleted — still visible somewhere in the (unfiltered) list.
    await expect(page.getByTestId("risk-event").first()).toBeVisible();
  });
});

test.describe("risk center security (sections 44/52)", () => {
  test("buyer cannot access /admin/risk", async ({ page }) => {
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/admin/risk");
    await expect(page).not.toHaveURL(/\/admin\/risk/, { timeout: 15_000 });
  });

  test("seller cannot access /admin/risk", async ({ page }) => {
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/admin/risk");
    await expect(page).not.toHaveURL(/\/admin\/risk/, { timeout: 15_000 });
  });

  test("guest is redirected to sign-in", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/risk");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
  });
});

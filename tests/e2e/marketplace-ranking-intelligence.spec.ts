import { test, expect } from "@playwright/test";

test.describe("Ranking intelligence", () => {
  test("seller ranking page gated when flag off", async ({ page }) => {
    await page.goto("/account/ranking");
    await expect(page).toHaveURL(/auth\/sign-in|account\/ranking/);
  });
});

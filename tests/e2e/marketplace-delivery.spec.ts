import { test, expect } from "@playwright/test";

test.describe("marketplace delivery", () => {
  test("admin delivery dashboard loads", async ({ page }) => {
    test.skip(
      process.env.MARKETPLACE_DELIVERY_ENABLED !== "true",
      "delivery flag off",
    );
    await page.goto("/admin/delivery");
    await expect(page.getByTestId("admin-delivery-dashboard")).toBeVisible({
      timeout: 15000,
    });
  });

  test("seller ship queue page loads", async ({ page }) => {
    test.skip(
      process.env.MARKETPLACE_DELIVERY_ENABLED !== "true",
      "delivery flag off",
    );
    await page.goto("/account/orders/ship");
    await expect(page.getByRole("heading", { name: "Нужно отправить" })).toBeVisible({
      timeout: 15000,
    });
  });
});

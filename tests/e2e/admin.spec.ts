import { test, expect } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  signIn,
  signOut,
} from "./helpers";

test.describe("admin panel access", () => {
  test("ADMIN opens /admin dashboard", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Админ-панель").first()).toBeVisible();
    errors.assertClean();
  });

  test("BUYER is denied /admin", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toHaveCount(0);
    errors.assertClean();
  });

  test("SELLER is denied /admin", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toHaveCount(0);
    errors.assertClean();
  });

  test("ADMIN can open products moderation", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/products");
    await expect(
      page.getByRole("heading", { name: "Товары" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("ACTIVE").first()).toBeVisible();
    errors.assertClean();
  });

  test("unauthenticated /admin redirects to sign-in", async ({ page }) => {
    await signOut(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 20_000 });
  });
});

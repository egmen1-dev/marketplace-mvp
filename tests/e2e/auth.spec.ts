import { test, expect } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  signIn,
  signOut,
  uniqueEmail,
} from "./helpers";

test.describe("auth", () => {
  test("register, login, logout", async ({ page }) => {
    const errors = attachErrorCollector(page);
    const email = uniqueEmail("buyer");

    await page.goto("/auth/sign-up");
    await page.getByRole("button", { name: "Покупатель" }).click();
    await page.getByLabel("Имя").fill("E2E Buyer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill("demo1234x");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(page).not.toHaveURL(/\/auth\/sign-up/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /Application error/i }),
    ).toHaveCount(0);

    await page.goto("/profile");
    await expect(page.getByText(email).first()).toBeVisible({ timeout: 15_000 });

    await signOut(page);

    await signIn(page, email, "demo1234x");
    await page.goto("/profile");
    await expect(page.getByText(email).first()).toBeVisible({ timeout: 15_000 });

    await signOut(page);
    errors.assertClean();
  });

  test("demo seller can sign in", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/profile");
    await expect(page.getByText(DEMO.sellerEmail).first()).toBeVisible({
      timeout: 15_000,
    });
    errors.assertClean();
  });
});

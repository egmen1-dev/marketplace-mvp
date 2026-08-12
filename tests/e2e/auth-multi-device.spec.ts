import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  expectSessionEmail,
  signIn,
  uniqueEmail,
} from "./helpers";

const MOBILE = { width: 390, height: 844 };

test.describe("auth multi-device (HOTFIX-UX-001.3)", () => {
  test("register on device A, login on device B (Android UA)", async ({
    browser,
  }) => {
    const email = uniqueEmail("multidevice");
    const password = "demo1234x";

    const deviceA = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
    });
    const pageA = await deviceA.newPage();
    const errorsA = attachErrorCollector(pageA);

    await pageA.goto("/auth/sign-up");
    await pageA.getByRole("button", { name: "Покупатель" }).click();
    await pageA.getByLabel("Имя").fill("Device A");
    await pageA.getByLabel("Email").fill(email);
    await pageA.getByLabel("Пароль").fill(password);
    await pageA.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(pageA).not.toHaveURL(/\/auth\/sign-up/, { timeout: 30_000 });
    await expectSessionEmail(pageA, email);

    const deviceB = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
      viewport: MOBILE,
      isMobile: true,
      hasTouch: true,
    });
    const pageB = await deviceB.newPage();
    const errorsB = attachErrorCollector(pageB);

    await pageB.goto("/auth/sign-in");
    await pageB.getByLabel("Email").fill(email);
    await pageB.getByLabel("Пароль").fill(password);
    await pageB.getByRole("button", { name: "Войти" }).click();
    await expect(pageB).not.toHaveURL(/\/auth\/sign-in/, { timeout: 30_000 });
    await expectSessionEmail(pageB, email);

    await pageB.reload();
    await expectSessionEmail(pageB, email);

    await deviceA.close();
    await deviceB.close();
    errorsA.assertClean();
    errorsB.assertClean();
  });

  test("demo buyer session persists after reload at 390px", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize(MOBILE);
    await signIn(page, DEMO.buyerEmail);
    await page.reload();
    await expectSessionEmail(page, DEMO.buyerEmail);
    errors.assertClean();
  });

  test("case-insensitive login for uppercase email input", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill(DEMO.buyerEmail.toUpperCase());
    await page.getByLabel("Пароль").fill(DEMO.password);
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).not.toHaveURL(/\/auth\/sign-in/, { timeout: 30_000 });
    await expectSessionEmail(page, DEMO.buyerEmail);
    errors.assertClean();
  });
});

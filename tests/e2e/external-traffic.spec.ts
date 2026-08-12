import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector } from "./helpers";

const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

const TELEGRAM_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36 Telegram/10.0";

test.describe("HOTFIX-UX-002 external traffic / WebView", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("VK WebView UA — homepage paints without white screen", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent: VK_UA,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);

    const t0 = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 500,
    });
    const elapsed = Date.now() - t0;

    await expect
      .poll(async () =>
        page.locator("html").evaluate((el) => el.classList.contains("webview-compat")),
      )
      .toBe(true);
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.locator("#boot-splash")).toHaveCount(0, {
      timeout: 10_000,
    });

    expect(elapsed).toBeLessThan(5000);
    errors.assertClean();
    await ctx.close();
  });

  test("Telegram WebView UA — catalog and PDP load", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: TELEGRAM_UA,
      isMobile: true,
    });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Каталог" })).toBeVisible({
      timeout: 15_000,
    });

    const productLink = page.locator('main a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 15_000 });
    await expect(page.locator("main h1").first()).toBeVisible({
      timeout: 15_000,
    });

    errors.assertClean();
    await ctx.close();
  });

  test("VK WebView — login flow", async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: VK_UA, isMobile: true });
    const page = await ctx.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill(DEMO.buyerEmail);
    await page.getByLabel("Пароль").fill(DEMO.password);
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).not.toHaveURL(/\/auth\/sign-in/, { timeout: 30_000 });
    await expect(page.getByTestId("site-header")).toBeVisible();

    errors.assertClean();
    await ctx.close();
  });

  test("desktop homepage load", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 500,
    });
    await expect(page.locator("#boot-splash")).toHaveCount(0, {
      timeout: 10_000,
    });
    errors.assertClean();
  });

  test("route loading skeleton on navigation", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-splash").waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Каталог" })).toBeVisible({
      timeout: 20_000,
    });
  });
});

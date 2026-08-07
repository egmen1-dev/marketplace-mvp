import { test, expect } from "@playwright/test";

import { attachErrorCollector } from "./helpers";

test.describe("catalog search & theme & responsive", () => {
  test("search тепловая finds heat-related results", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog?q=%D1%82%D0%B5%D0%BF%D0%BB%D0%BE%D0%B2%D0%B0%D1%8F");

    await expect(page).toHaveURL(/q=/);
    await expect(
      page.getByRole("main").getByText(/тепловая|Тепловые|пушк/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    errors.assertClean();
  });

  test("theme toggle persists across reload", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto("/");

    const html = page.locator("html");
    const before = await html.getAttribute("class");
    const toggle = page.getByRole("button", {
      name: /Тёмная тема|Светлая тема/,
    });
    await expect(toggle).toBeEnabled({ timeout: 10_000 });
    await toggle.click();

    await expect
      .poll(async () => html.getAttribute("class"), { timeout: 5_000 })
      .not.toBe(before);

    const after = await html.getAttribute("class");
    await page.reload();
    await expect
      .poll(async () => html.getAttribute("class"), { timeout: 10_000 })
      .toBe(after);

    errors.assertClean();
  });

  for (const vp of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
  ] as const) {
    test(`responsive smoke ${vp.name}`, async ({ page }) => {
      const errors = attachErrorCollector(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      const header = page.getByTestId("site-header");
      await expect(header).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Лот" }).first(),
      ).toBeVisible();
      await expect(page.getByTestId("brand-wordmark").first()).toBeVisible();

      // Mobile: catalog is in the header; tablet/desktop: same control.
      await page.getByTestId("header-catalog").click();

      await expect(page).toHaveURL(/\/catalog/);
      await expect(page.getByRole("main")).toBeVisible();
      errors.assertClean();
    });
  }
});

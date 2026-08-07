import { test, expect } from "@playwright/test";

import { attachErrorCollector } from "./helpers";

test.describe("default theme", () => {
  test("clean browser context opens homepage in light theme", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/");

    const html = page.locator("html");
    await expect
      .poll(async () => {
        const cls = (await html.getAttribute("class")) ?? "";
        return cls.includes("dark") ? "dark" : "light";
      }, { timeout: 10_000 })
      .toBe("light");

    // First paint tokens must also be light (not dark-first :root).
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );
    // white / near-white
    expect(bg).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)|#fff|#ffffff/i);

    errors.assertClean();
    await context.close();
  });

  test("saved dark theme remains dark on revisit", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    const page = await context.newPage();
    const errors = attachErrorCollector(page);

    await page.goto("/");

    const html = page.locator("html");
    await expect
      .poll(async () => {
        const cls = (await html.getAttribute("class")) ?? "";
        return cls.includes("dark") ? "dark" : "light";
      }, { timeout: 10_000 })
      .toBe("dark");

    errors.assertClean();
    await context.close();
  });
});

import { expect, test } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

test.describe("admin messages moderation (HOTFIX-UX-001.3)", () => {
  test("admin inbox lists conversations without server error", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);
    const res = await page.goto("/admin/messages");
    expect(res?.status()).toBeLessThan(400);

    await expect(page.getByRole("heading", { name: "Диалоги" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Что-то пошло не так")).toHaveCount(0);

    const row = page.getByTestId("conversation-row").first();
    if ((await row.count()) === 0) {
      await expect(page.getByTestId("messages-empty")).toBeVisible();
      errors.assertClean();
      return;
    }

    await row.click();
    await expect(page.getByTestId("conversation-thread")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("chat-readonly-notice")).toBeVisible();
    await expect(page.getByTestId("chat-input")).toHaveCount(0);
    errors.assertClean();
  });

  test("admin can open all moderation sections", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.adminEmail);

    const routes: { path: string; heading: RegExp }[] = [
      { path: "/admin/users", heading: /пользовател/i },
      { path: "/admin/products", heading: /товар/i },
      { path: "/admin/orders", heading: /заказ/i },
      { path: "/admin/reservations", heading: /брон/i },
      { path: "/admin/messages", heading: /диалог/i },
    ];

    for (const { path, heading } of routes) {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("Что-то пошло не так")).toHaveCount(0);
    }

    errors.assertClean();
  });
});

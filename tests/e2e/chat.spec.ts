import { expect, test } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  openFirstCatalogProduct,
  signIn,
  signOut,
} from "./helpers";

test.describe("marketplace chat", () => {
  test("buyer opens dialog, seller replies, both see messages", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    const buyerText = `Привет от покупателя ${Date.now()}`;
    const sellerText = `Ответ продавца ${Date.now()}`;

    await signIn(page, DEMO.buyerEmail);
    await openFirstCatalogProduct(page);

    await expect(page.getByTestId("pdp-write-seller")).toBeVisible();
    await page.getByTestId("pdp-write-seller").click();
    await expect(page).toHaveURL(/\/account\/messages\/[\w-]+/, {
      timeout: 30_000,
    });
    await expect(page.getByTestId("conversation-thread")).toBeVisible();
    await expect(page.getByTestId("chat-system-message").first()).toContainText(
      "Диалог создан",
    );

    const conversationUrl = page.url();

    await page.getByTestId("chat-input").fill(buyerText);
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("chat-message").filter({ hasText: buyerText })).toBeVisible({
      timeout: 15_000,
    });

    // Re-open same dialog from list
    await page.goto("/account/messages");
    await expect(page.getByTestId("messages-list")).toBeVisible();
    await page.getByTestId("conversation-row").first().click();
    await expect(page).toHaveURL(conversationUrl);
    await expect(
      page.getByTestId("chat-message").filter({ hasText: buyerText }),
    ).toBeVisible();

    await signOut(page);
    await signIn(page, DEMO.sellerEmail);

    await page.goto("/account/messages");
    await expect(page.getByTestId("messages-list")).toBeVisible({
      timeout: 20_000,
    });
    const unread = page.getByTestId("conversation-unread").first();
    await expect(unread).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("conversation-row").first().click();
    await expect(
      page.getByTestId("chat-message").filter({ hasText: buyerText }),
    ).toBeVisible();

    await page.getByTestId("chat-input").fill(sellerText);
    await page.getByTestId("chat-send").click();
    await expect(
      page.getByTestId("chat-message").filter({ hasText: sellerText }),
    ).toBeVisible({ timeout: 15_000 });

    await signOut(page);
    await signIn(page, DEMO.buyerEmail);
    await page.goto(conversationUrl);
    await expect(
      page.getByTestId("chat-message").filter({ hasText: sellerText }),
    ).toBeVisible({ timeout: 20_000 });

    errors.assertClean();
  });

  test("guest write-seller redirects to sign-in", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await openFirstCatalogProduct(page);
    const btn = page.getByTestId("pdp-write-seller");
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
    errors.assertClean();
  });

  test("seller does not see write button on own product", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/account/products");
    const href = await page
      .locator('a[href^="/product/"]')
      .first()
      .getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page.getByTestId("pdp-buy")).toBeVisible();
    await expect(page.getByTestId("pdp-write-seller")).toHaveCount(0);
    errors.assertClean();
  });

  test("messages empty state and mobile layout", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, DEMO.adminEmail);
    // Admin may have no chats — if list exists, still OK; empty is preferred for admin
    await page.goto("/account/messages");
    const empty = page.getByTestId("messages-empty");
    const list = page.getByTestId("messages-list");
    await expect(empty.or(list)).toBeVisible({ timeout: 20_000 });
    if (await empty.isVisible()) {
      await expect(empty).toContainText("У вас пока нет сообщений");
      await expect(empty.getByText("Перейти в каталог")).toBeVisible();
    }
    errors.assertClean();
  });
});

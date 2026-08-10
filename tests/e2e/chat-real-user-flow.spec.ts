import { test, expect, type Page, type BrowserContext } from "@playwright/test";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

const STAGING =
  process.env.STAGING_BASE_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://127.0.0.1:3000";

async function openRaizzProductAsBuyer(page: Page): Promise<void> {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: /Каталог/i })).toBeVisible({
    timeout: 20_000,
  });
  // seller@demo.lot owns RAIZZ — buyer must message that store
  await page.getByRole("link", { name: /Дрель ударная Drill Pro 750/i }).first().click();
  await expect(page.getByTestId("pdp-title")).toBeVisible({ timeout: 20_000 });
}

test.describe("chat real user flow (discoverability)", () => {
  test("buyer finds Write Seller without knowing /account/messages", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);

    await page.goto("/");
    await expect(page.getByTestId("header-messages")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("header-catalog").click();
    await openRaizzProductAsBuyer(page);

    await expect(page.getByTestId("pdp-write-seller")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("pdp-write-seller")).toContainText(
      /Написать продавцу/i,
    );

    // Navigate to messages ONLY via visible header icon (no direct URL)
    await page.getByTestId("header-messages").click();
    await expect(page).toHaveURL(/\/account\/messages/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Сообщения/i }).first(),
    ).toBeVisible();

    errors.assertClean();
  });

  test("buyer ↔ seller real messaging with unread badge", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const buyerMsg = `E2E buyer message ${stamp}`;
    const sellerMsg = `E2E seller reply ${stamp}`;

    const buyerCtx: BrowserContext = await browser.newContext();
    const sellerCtx: BrowserContext = await browser.newContext();
    const buyer = await buyerCtx.newPage();
    const seller = await sellerCtx.newPage();
    const buyerErrors = attachErrorCollector(buyer);
    const sellerErrors = attachErrorCollector(seller);

    await signIn(buyer, DEMO.buyerEmail);
    await buyer.goto("/");
    await buyer.getByTestId("header-catalog").click();
    await openRaizzProductAsBuyer(buyer);

    await expect(buyer.getByTestId("pdp-write-seller")).toBeVisible({
      timeout: 20_000,
    });
    await buyer.getByTestId("pdp-write-seller").click();
    await expect(buyer.getByTestId("conversation-thread")).toBeVisible({
      timeout: 30_000,
    });
    await buyer.getByTestId("chat-input").fill(buyerMsg);
    await buyer.getByTestId("chat-send").click();
    await expect(buyer.getByTestId("chat-message").filter({ hasText: buyerMsg })).toBeVisible({
      timeout: 20_000,
    });
    await buyer.reload();
    await expect(buyer.getByTestId("chat-message").filter({ hasText: buyerMsg })).toBeVisible({
      timeout: 20_000,
    });

    await signIn(seller, DEMO.sellerEmail);
    await seller.goto("/");
    // Must discover via UI — header messages (may have badge)
    await expect(seller.getByTestId("header-messages")).toBeVisible({
      timeout: 15_000,
    });
    // Unread badge expected after buyer message
    await expect(seller.getByTestId("header-messages-badge")).toBeVisible({
      timeout: 15_000,
    });
    await seller.getByTestId("header-messages").click();
    await expect(seller).toHaveURL(/\/account\/messages/);
    await expect(seller.getByText(buyerMsg).first()).toBeVisible({
      timeout: 20_000,
    });
    await seller.getByText(buyerMsg).first().click();
    await expect(seller.getByTestId("conversation-thread")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      seller.getByTestId("chat-message").filter({ hasText: buyerMsg }),
    ).toBeVisible();
    await seller.getByTestId("chat-input").fill(sellerMsg);
    await seller.getByTestId("chat-send").click();
    await expect(
      seller.getByTestId("chat-message").filter({ hasText: sellerMsg }),
    ).toBeVisible({ timeout: 20_000 });

    // Buyer discovers reply via header (no direct URL)
    await buyer.goto("/");
    await buyer.getByTestId("header-messages").click();
    await expect(buyer.getByText(sellerMsg).first()).toBeVisible({
      timeout: 20_000,
    });
    await buyer.getByText(sellerMsg).first().click();
    await expect(
      buyer.getByTestId("chat-message").filter({ hasText: sellerMsg }),
    ).toBeVisible({ timeout: 15_000 });
    await buyer.reload();
    await expect(
      buyer.getByTestId("chat-message").filter({ hasText: sellerMsg }),
    ).toBeVisible({ timeout: 15_000 });

    // Staging may emit React #418 hydration noise unrelated to chat persistence
    const filterHydration = (errs: string[]) =>
      errs.filter((e) => !/Minified React error #418/i.test(e));
    expect(filterHydration(buyerErrors.pageErrors)).toEqual([]);
    expect(filterHydration(sellerErrors.pageErrors)).toEqual([]);
    await buyerCtx.close();
    await sellerCtx.close();
  });
});

// Ensure this file documents staging target for operators
void STAGING;

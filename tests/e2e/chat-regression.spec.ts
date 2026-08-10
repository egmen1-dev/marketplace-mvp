import { expect, test, type BrowserContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

const SHOT_DIR = path.join(process.cwd(), "tmp/chat-056-final");

function ensureShotDir() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

async function openRaizzProductAsBuyer(page: import("@playwright/test").Page) {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: /Каталог/i })).toBeVisible({
    timeout: 20_000,
  });
  await page
    .getByRole("link", { name: /Дрель ударная Drill Pro 750/i })
    .first()
    .click();
  await expect(page.getByTestId("pdp-title")).toBeVisible({ timeout: 20_000 });
}

test.describe("chat regression (navigation, badge, persistence)", () => {
  test.beforeAll(() => {
    ensureShotDir();
  });

  test("header exposes messages on desktop and mobile", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("header-messages")).toBeVisible();
    await expect(page.getByTestId("header-catalog")).toBeVisible();
    await expect(page.locator("header a[href='/']").first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("header-messages")).toBeVisible();

    errors.assertClean();
  });

  test("buyer ↔ seller communication with screenshots", async ({ browser }) => {
    test.setTimeout(150_000);
    ensureShotDir();
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
    await buyer.setViewportSize({ width: 1280, height: 800 });
    await buyer.goto("/");
    await buyer.getByTestId("header-catalog").click();
    await openRaizzProductAsBuyer(buyer);
    await expect(buyer.getByTestId("pdp-write-seller")).toBeVisible();
    await buyer
      .getByTestId("pdp-write-seller")
      .screenshot({ path: path.join(SHOT_DIR, "desktop-pdp-chat.png") });

    await buyer.setViewportSize({ width: 390, height: 844 });
    await buyer.reload();
    await expect(buyer.getByTestId("pdp-write-seller")).toBeVisible();
    await buyer
      .getByTestId("pdp-write-seller")
      .screenshot({ path: path.join(SHOT_DIR, "mobile-pdp-chat.png") });

    await buyer.setViewportSize({ width: 1280, height: 800 });
    await buyer.getByTestId("pdp-write-seller").click();
    await expect(buyer.getByTestId("conversation-thread")).toBeVisible({
      timeout: 30_000,
    });
    await buyer.getByTestId("chat-input").fill(buyerMsg);
    await buyer.getByTestId("chat-send").click();
    await expect(
      buyer.getByTestId("chat-message").filter({ hasText: buyerMsg }),
    ).toBeVisible({ timeout: 20_000 });
    await buyer
      .getByTestId("conversation-thread")
      .screenshot({ path: path.join(SHOT_DIR, "desktop-thread.png") });

    await buyer.setViewportSize({ width: 390, height: 844 });
    await buyer
      .getByTestId("conversation-thread")
      .screenshot({ path: path.join(SHOT_DIR, "mobile-thread.png") });

    await buyer.reload();
    await expect(
      buyer.getByTestId("chat-message").filter({ hasText: buyerMsg }),
    ).toBeVisible({ timeout: 20_000 });

    await signIn(seller, DEMO.sellerEmail);
    await seller.setViewportSize({ width: 1280, height: 800 });
    await seller.goto("/");
    await expect(seller.getByTestId("header-messages-badge")).toBeVisible({
      timeout: 20_000,
    });
    await seller
      .getByTestId("header-messages")
      .screenshot({ path: path.join(SHOT_DIR, "seller-unread.png") });
    await seller.getByTestId("header-messages").click();
    await expect(seller.getByText(buyerMsg).first()).toBeVisible({
      timeout: 20_000,
    });
    await seller.getByText(buyerMsg).first().click();
    await expect(seller.getByTestId("conversation-thread")).toBeVisible();
    await seller.getByTestId("chat-input").fill(sellerMsg);
    await seller.getByTestId("chat-send").click();
    await expect(
      seller.getByTestId("chat-message").filter({ hasText: sellerMsg }),
    ).toBeVisible({ timeout: 20_000 });

    await buyer.goto("/");
    await buyer.getByTestId("header-messages").click();
    await expect(buyer.getByText(sellerMsg).first()).toBeVisible({
      timeout: 20_000,
    });
    await buyer.getByText(sellerMsg).first().click();
    await expect(
      buyer.getByTestId("chat-message").filter({ hasText: sellerMsg }),
    ).toBeVisible();
    await buyer
      .getByTestId("conversation-thread")
      .screenshot({ path: path.join(SHOT_DIR, "buyer-reply.png") });

    // Empty send blocked
    await buyer.getByTestId("chat-input").fill("   ");
    await buyer.getByTestId("chat-send").click();
    await expect(buyer.getByTestId("chat-input")).toHaveValue(/\s*/);

    buyerErrors.assertClean();
    sellerErrors.assertClean();
    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("security-blocked screenshot", async ({ browser }) => {
    ensureShotDir();
    const buyerCtx = await browser.newContext();
    const otherCtx = await browser.newContext();
    const buyer = await buyerCtx.newPage();
    const other = await otherCtx.newPage();

    await signIn(buyer, DEMO.buyerEmail);
    await openRaizzProductAsBuyer(buyer);
    await buyer.getByTestId("pdp-write-seller").click();
    await expect(buyer.getByTestId("conversation-thread")).toBeVisible({
      timeout: 30_000,
    });
    const id = buyer.url().match(/\/account\/messages\/([\w-]+)/)?.[1];
    expect(id).toBeTruthy();

    await signIn(other, DEMO.sellerBEmail);
    await other.goto(`/account/messages/${id}`);
    await expect(other).toHaveURL(/\/account\/messages\/?$/);
    await other.screenshot({
      path: path.join(SHOT_DIR, "security-blocked.png"),
      fullPage: true,
    });

    await buyerCtx.close();
    await otherCtx.close();
  });
});

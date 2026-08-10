import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  DEMO,
  attachErrorCollector,
  openFirstCatalogProduct,
  signIn,
  uniqueEmail,
} from "./helpers";

async function registerBuyer(page: Page, email: string, password = "demo1234x") {
  await page.goto("/auth/sign-up");
  await page.getByRole("button", { name: "Покупатель" }).click();
  await page.getByLabel("Имя").fill("Buyer B Isolation");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).not.toHaveURL(/\/auth\/sign-up/, { timeout: 30_000 });
}

async function createBuyerConversation(page: Page): Promise<string> {
  await openFirstCatalogProduct(page);
  await expect(page.getByTestId("pdp-write-seller")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("pdp-write-seller").click();
  await expect(page).toHaveURL(/\/account\/messages\/[\w-]+/, {
    timeout: 30_000,
  });
  await expect(page.getByTestId("conversation-thread")).toBeVisible();
  const match = page.url().match(/\/account\/messages\/([\w-]+)/);
  expect(match?.[1]).toBeTruthy();
  return match![1];
}

test.describe("chat security / IDOR", () => {
  test("guest cannot access messages list or thread", async ({ page }) => {
    const errors = attachErrorCollector(page);

    await page.goto("/account/messages");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
    await expect(page.url()).toMatch(/callbackUrl=/);

    await page.goto("/account/messages/clxxxxxxxxxxxxxxxxxxxxxxxx");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });

    errors.assertClean();
  });

  test("buyer_B cannot open / read / reply to buyer_A conversation", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const buyerACtx: BrowserContext = await browser.newContext();
    const buyerBCtx: BrowserContext = await browser.newContext();
    const buyerA = await buyerACtx.newPage();
    const buyerB = await buyerBCtx.newPage();
    const aErrors = attachErrorCollector(buyerA);
    const bErrors = attachErrorCollector(buyerB);

    await signIn(buyerA, DEMO.buyerEmail);
    const conversationId = await createBuyerConversation(buyerA);
    const secret = `IDOR secret ${Date.now()}`;
    await buyerA.getByTestId("chat-input").fill(secret);
    await buyerA.getByTestId("chat-send").click();
    await expect(
      buyerA.getByTestId("chat-message").filter({ hasText: secret }),
    ).toBeVisible({ timeout: 15_000 });

    const buyerBEmail = uniqueEmail("buyer-b");
    await registerBuyer(buyerB, buyerBEmail);

    // Direct URL IDOR — must redirect to list (no thread, no secret text)
    await buyerB.goto(`/account/messages/${conversationId}`);
    await expect(buyerB).toHaveURL(/\/account\/messages\/?$/, {
      timeout: 20_000,
    });
    await expect(buyerB.getByTestId("conversation-thread")).toHaveCount(0);
    await expect(buyerB.getByText(secret)).toHaveCount(0);

    // List must not include foreign conversation
    await buyerB.goto("/account/messages");
    await expect(
      buyerB.getByTestId("messages-empty").or(buyerB.getByTestId("messages-list")),
    ).toBeVisible({ timeout: 15_000 });
    await expect(buyerB.getByText(secret)).toHaveCount(0);

    // Attempt send via server action POST surface (form) — navigate + inject
    // is blocked by redirect before composer exists.
    await buyerB.goto(`/account/messages/${conversationId}`);
    await expect(buyerB.getByTestId("chat-input")).toHaveCount(0);

    aErrors.assertClean();
    bErrors.assertClean();
    await buyerACtx.close();
    await buyerBCtx.close();
  });

  test("seller_B cannot open seller_A conversation", async ({ browser }) => {
    test.setTimeout(120_000);
    const buyerCtx = await browser.newContext();
    const sellerBCtx = await browser.newContext();
    const buyer = await buyerCtx.newPage();
    const sellerB = await sellerBCtx.newPage();
    const buyerErrors = attachErrorCollector(buyer);
    const sellerBErrors = attachErrorCollector(sellerB);

    await signIn(buyer, DEMO.buyerEmail);
    const conversationId = await createBuyerConversation(buyer);
    const secret = `Seller IDOR ${Date.now()}`;
    await buyer.getByTestId("chat-input").fill(secret);
    await buyer.getByTestId("chat-send").click();
    await expect(
      buyer.getByTestId("chat-message").filter({ hasText: secret }),
    ).toBeVisible({ timeout: 15_000 });

    await signIn(sellerB, DEMO.sellerBEmail);
    await sellerB.goto(`/account/messages/${conversationId}`);
    await expect(sellerB).toHaveURL(/\/account\/messages\/?$/, {
      timeout: 20_000,
    });
    await expect(sellerB.getByTestId("conversation-thread")).toHaveCount(0);
    await expect(sellerB.getByText(secret)).toHaveCount(0);

    await sellerB.goto("/account/messages");
    await expect(sellerB.getByText(secret)).toHaveCount(0);

    buyerErrors.assertClean();
    sellerBErrors.assertClean();
    await buyerCtx.close();
    await sellerBCtx.close();
  });

  test("duplicate Write Seller reuses same conversation", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.buyerEmail);
    const firstId = await createBuyerConversation(page);
    await page.goto("/catalog");
    await openFirstCatalogProduct(page);
    await page.getByTestId("pdp-write-seller").click();
    await expect(page).toHaveURL(new RegExp(`/account/messages/${firstId}`), {
      timeout: 30_000,
    });
    errors.assertClean();
  });

  test("guest Write Seller returns to product and opens chat", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = attachErrorCollector(page);
    await openFirstCatalogProduct(page);
    const productUrl = page.url();
    const productId = productUrl.match(/\/product\/([\w-]+)/)?.[1];
    expect(productId).toBeTruthy();

    await page.getByTestId("pdp-write-seller").click();
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
    expect(decodeURIComponent(page.url())).toMatch(/writeSeller=1/);

    await page.getByLabel("Email").fill(DEMO.buyerEmail);
    await page.getByLabel("Пароль").fill(DEMO.password);
    await page.getByRole("button", { name: "Войти" }).click();

    // Continues to product then auto-opens conversation (not home)
    await expect(page).not.toHaveURL(/\/auth\/sign-in/, { timeout: 30_000 });
    await expect(page).toHaveURL(
      new RegExp(`(/product/${productId}|/account/messages/)`),
      { timeout: 30_000 },
    );
    await expect(page.getByTestId("conversation-thread")).toBeVisible({
      timeout: 45_000,
    });
    errors.assertClean();
  });
});

import { expect, type Page } from "@playwright/test";

/** Complete Stripe Checkout hosted page with test card 4242… */
export async function completeStripeTestCheckout(
  page: Page,
  returnUrlPattern: RegExp,
): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });

  const cardNumber = page.getByPlaceholder("1234 1234 1234 1234");
  await expect(cardNumber).toBeVisible({ timeout: 30_000 });
  await cardNumber.fill("4242424242424242");

  await page.getByPlaceholder("ММ / ГГ").fill("12 / 34");
  await page.getByPlaceholder("CVC").fill("123");

  const cardholder = page.getByPlaceholder("Имя, фамилия");
  if (await cardholder.isVisible().catch(() => false)) {
    await cardholder.fill("Financial E2E Buyer");
  }

  const country = page.getByRole("combobox", { name: /страна|country/i });
  if (await country.isVisible().catch(() => false)) {
    await country.selectOption({ label: "Россия" }).catch(async () => {
      await country.selectOption("RU").catch(() => undefined);
    });
  }

  const zip = page.getByRole("textbox", { name: /почтов|postal|zip/i });
  if (await zip.isVisible().catch(() => false)) {
    await zip.fill("101000");
  }

  const payButton = page.getByRole("button", { name: /^Оплатить$/ });
  await expect(payButton).toBeEnabled({ timeout: 20_000 });
  await payButton.click();

  await page.waitForURL(returnUrlPattern, { timeout: 120_000 });
}

export async function parseWalletTopupFromFixture(json: {
  topupSpendableAmount?: number;
}): Promise<number> {
  return Number(json.topupSpendableAmount ?? 0);
}

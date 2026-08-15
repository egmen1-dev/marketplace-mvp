import { PAYMENTS_NOT_CONFIGURED } from "@/features/payments/errors";
import { toStripeAmount, toStripeCurrency } from "@/features/payments/lib/amounts";
import { ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

import { isLotWalletEnabled } from "./flags";

export type CreateWalletTopUpResult =
  | { ok: true; checkoutUrl: string; sessionId: string }
  | { ok: false; error: string };

export async function createWalletTopUpCheckoutSession(input: {
  userId: string;
  email: string | null;
  amountRub: number;
}): Promise<CreateWalletTopUpResult> {
  if (!isLotWalletEnabled()) {
    return { ok: false, error: "Кошелёк ЛОТ временно недоступен" };
  }
  if (input.amountRub < 100 || input.amountRub > 500_000) {
    return { ok: false, error: "Сумма пополнения от 100 до 500 000 ₽" };
  }
  if (!isStripeConfigured()) {
    return { ok: false, error: PAYMENTS_NOT_CONFIGURED };
  }

  const stripe = getStripe();
  const appUrl = getCanonicalAppUrl();
  const currency = toStripeCurrency("RUB");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toStripeAmount(input.amountRub),
          product_data: {
            name: "Пополнение Кошелька ЛОТ",
            description: "Средства доступны для покупок и продвижения",
          },
        },
      },
    ],
    success_url: `${appUrl}${ROUTES.ACCOUNT_WALLET}?tab=topup&topup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}${ROUTES.ACCOUNT_WALLET}?tab=topup&topup=canceled`,
    metadata: {
      purpose: "wallet_top_up",
      userId: input.userId,
      amountRub: String(input.amountRub),
    },
    payment_intent_data: {
      metadata: {
        purpose: "wallet_top_up",
        userId: input.userId,
        amountRub: String(input.amountRub),
      },
    },
  });

  if (!session.url) {
    return { ok: false, error: "Stripe не вернул ссылку на оплату" };
  }

  return { ok: true, checkoutUrl: session.url, sessionId: session.id };
}

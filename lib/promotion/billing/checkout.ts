import { PromotionOrderStatus } from "@prisma/client";
import type Stripe from "stripe";

import { PAYMENTS_NOT_CONFIGURED, PaymentServiceError } from "@/features/payments/errors";
import {
  toStripeAmount,
  toStripeCurrency,
} from "@/features/payments/lib/amounts";
import { ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { log } from "@/lib/logger";
import type { CreateCheckoutSessionResult } from "@/features/payments/create-checkout-session";
import {
  formatPromotionPeriodLabel,
  getPromotionPlanById,
} from "@/lib/promotion/billing/plans";
import { getPromotionOrderForSeller } from "@/lib/promotion/billing/orders";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const PROMOTION_PAYMENT_TYPE = "promotion";

export function isPromotionCheckoutMetadata(
  metadata: Stripe.Metadata | null | undefined,
): boolean {
  return metadata?.paymentType === PROMOTION_PAYMENT_TYPE;
}

export async function createCheckoutSessionForPromotionOrder(
  sellerProfileId: string,
  promotionOrderId: string,
): Promise<CreateCheckoutSessionResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: PAYMENTS_NOT_CONFIGURED };
  }

  const order = await getPromotionOrderForSeller(
    sellerProfileId,
    promotionOrderId,
  );
  if (!order?.plan) {
    return { ok: false, error: "Заказ на продвижение не найден" };
  }

  if (
    order.status !== PromotionOrderStatus.CREATED &&
    order.status !== PromotionOrderStatus.PAYMENT_PENDING
  ) {
    return { ok: false, error: "Заказ уже оплачен или недоступен для оплаты" };
  }

  const product = await prisma.product.findUnique({
    where: { id: order.productId },
    select: { name: true, currency: true },
  });
  if (!product) {
    return { ok: false, error: "Товар не найден" };
  }

  const amount = order.amount;
  if (amount <= 0) {
    return { ok: false, error: "Сумма продвижения должна быть больше нуля" };
  }

  const currency = toStripeCurrency(product.currency);
  const appUrl = getCanonicalAppUrl();
  const periodLabel = formatPromotionPeriodLabel(order.plan.durationDays);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: toStripeAmount(amount),
            product_data: {
              name: `Продвижение · ${order.plan.name}`,
              description: `${product.name} · ${periodLabel}`,
            },
          },
        },
      ],
      success_url: `${appUrl}${ROUTES.ACCOUNT_PROMOTIONS}?promotion_payment=success&promotion_order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${ROUTES.ACCOUNT_PROMOTIONS}?promotion_payment=canceled`,
      client_reference_id: order.id,
      metadata: {
        paymentType: PROMOTION_PAYMENT_TYPE,
        promotionOrderId: order.id,
        sellerId: sellerProfileId,
        productId: order.productId,
        planId: order.planId,
      },
      payment_intent_data: {
        metadata: {
          paymentType: PROMOTION_PAYMENT_TYPE,
          promotionOrderId: order.id,
          sellerId: sellerProfileId,
          productId: order.productId,
        },
      },
    });

    if (!session.url) {
      return { ok: false, error: "Stripe не вернул ссылку на оплату" };
    }

    await prisma.promotionOrder.update({
      where: { id: order.id },
      data: {
        status: PromotionOrderStatus.PAYMENT_PENDING,
        stripeSessionId: session.id,
      },
    });

    return { ok: true, checkoutUrl: session.url, sessionId: session.id };
  } catch (err) {
    if (err instanceof PaymentServiceError) {
      return { ok: false, error: err.message };
    }
    log.error("promotion_checkout_session_failed", {
      promotionOrderId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "Не удалось создать сессию оплаты" };
  }
}

export async function markPromotionPaidFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ promotionOrderId: string | null; alreadyPaid: boolean }> {
  const promotionOrderId =
    session.metadata?.promotionOrderId ??
    session.client_reference_id ??
    null;

  if (!promotionOrderId) {
    log.error("promotion_payment_missing_order_id", {
      sessionId: session.id,
    });
    return { promotionOrderId: null, alreadyPaid: false };
  }

  const { finalizePaidPromotionOrder } = await import(
    "@/lib/promotion/billing/finalize"
  );
  return finalizePaidPromotionOrder({
    promotionOrderId,
    stripeSessionId: session.id,
    paidAmount:
      session.amount_total != null ? session.amount_total / 100 : undefined,
    currency: session.currency ?? undefined,
  });
}

export async function startPromotionCheckout(
  sellerProfileId: string,
  productId: string,
  planId: string,
): Promise<
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string }
> {
  const { createPromotionOrder } = await import(
    "@/lib/promotion/billing/orders"
  );
  const order = await createPromotionOrder(sellerProfileId, productId, planId);
  const checkout = await createCheckoutSessionForPromotionOrder(
    sellerProfileId,
    order.id,
  );
  if (!checkout.ok) {
    return { ok: false, error: checkout.error };
  }
  return { ok: true, checkoutUrl: checkout.checkoutUrl };
}

export async function renewPromotionCheckout(
  sellerProfileId: string,
  productId: string,
  planId: string,
): Promise<
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string }
> {
  const plan = await getPromotionPlanById(planId);
  if (!plan) {
    return { ok: false, error: "Тариф не найден" };
  }
  return startPromotionCheckout(sellerProfileId, productId, planId);
}

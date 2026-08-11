import {
  OrderFulfillmentType,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import type Stripe from "stripe";

import {
  finalizeInputFromCheckoutSession,
  finalizeInputFromPaymentIntent,
  finalizePaidOrder,
} from "@/features/orders/lib/finalize-paid-order";
import {
  PAYMENTS_NOT_CONFIGURED,
  PaymentServiceError,
} from "@/features/payments/errors";
import {
  toStripeAmount,
  toStripeCurrency,
} from "@/features/payments/lib/amounts";
import { toPriceNumber } from "@/features/products/mappers";
import { orderPath, ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export type CreateCheckoutSessionResult =
  | { ok: true; checkoutUrl: string; sessionId: string }
  | { ok: false; error: string };

/**
 * Create a Stripe Checkout Session for an unpaid order owned by `userId`.
 * Upserts a PENDING Payment row and stores `stripeSessionId`.
 * Does **not** decrement stock — that happens in `finalizePaidOrder` on webhook.
 */
export async function createCheckoutSessionForOrder(
  userId: string,
  orderId: string,
): Promise<CreateCheckoutSessionResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: PAYMENTS_NOT_CONFIGURED };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        orderBy: { productName: "asc" },
      },
      payment: true,
      user: { select: { email: true } },
      reservations: {
        select: {
          prepaymentAmount: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  if (!order) {
    return { ok: false, error: "Заказ не найден" };
  }

  if (order.status === OrderStatus.PAID || order.payment?.status === PaymentStatus.SUCCEEDED) {
    return { ok: false, error: "Заказ уже оплачен" };
  }

  if (order.status === OrderStatus.CANCELLED) {
    return { ok: false, error: "Заказ отменён" };
  }

  if (order.items.length === 0) {
    return { ok: false, error: "В заказе нет товаров" };
  }

  const total = toPriceNumber(order.total);
  if (total <= 0) {
    return { ok: false, error: "Сумма заказа должна быть больше нуля" };
  }

  const currency = toStripeCurrency(order.currency);
  const appUrl = getCanonicalAppUrl();

  try {
    const stripe = getStripe();

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (order.fulfillmentType === OrderFulfillmentType.SELLER_PICKUP) {
      // Charge prepayment total only (order.total), not full unit prices.
      const names =
        order.reservations.length > 0
          ? order.reservations.map((r) => r.product.name).join(", ")
          : order.items.map((i) => i.productName).join(", ");
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: toStripeAmount(total),
            product_data: {
              name: `Предоплата · заказ ${order.orderNumber}`,
              description: names.slice(0, 200) || undefined,
            },
          },
        },
      ];
    } else {
      lineItems = order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency,
          unit_amount: toStripeAmount(toPriceNumber(item.unitPrice)),
          product_data: {
            name: item.productName,
            ...(item.productSku
              ? { metadata: { sku: item.productSku } }
              : {}),
          },
        },
      }));

      const shipping = toPriceNumber(order.shippingCost);
      if (shipping > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency,
            unit_amount: toStripeAmount(shipping),
            product_data: { name: "Доставка" },
          },
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.user.email || undefined,
      line_items: lineItems,
      success_url: `${appUrl}${orderPath(order.id)}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${ROUTES.CHECKOUT}?canceled=1`,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
        },
      },
    });

    if (!session.url) {
      return { ok: false, error: "Stripe не вернул ссылку на оплату" };
    }

    const amount = order.total;
    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        userId: order.userId,
        amount,
        currency: order.currency,
        status: PaymentStatus.PENDING,
        stripeSessionId: session.id,
      },
      update: {
        amount,
        currency: order.currency,
        status: PaymentStatus.PENDING,
        stripeSessionId: session.id,
        stripePaymentIntentId: null,
        stripeClientSecret: null,
        paidAt: null,
      },
    });

    return {
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  } catch (err) {
    if (err instanceof PaymentServiceError) {
      return { ok: false, error: err.message };
    }
    log.error("checkout_session_create_failed", {
      orderId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "Не удалось создать сессию оплаты" };
  }
}

/**
 * Mark order + payment as paid from a completed Checkout Session.
 * Delegates to `finalizePaidOrder` (idempotent stock + PAID).
 */
export async function markOrderPaidFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ orderId: string | null; alreadyPaid: boolean }> {
  const orderId =
    session.metadata?.orderId ??
    session.client_reference_id ??
    null;

  if (!orderId) {
    log.error("payment_missing_order_id", {
      source: "checkout.session",
      sessionId: session.id,
    });
    return { orderId: null, alreadyPaid: false };
  }

  const result = await finalizePaidOrder(
    finalizeInputFromCheckoutSession(session, orderId),
  );
  return result;
}

/**
 * Optional handler for payment_intent.succeeded.
 */
export async function markOrderPaidFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
): Promise<{ orderId: string | null; alreadyPaid: boolean }> {
  const orderId = paymentIntent.metadata?.orderId ?? null;

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { stripePaymentIntentId: paymentIntent.id },
        ...(orderId ? [{ orderId }] : []),
      ],
    },
    select: { orderId: true },
  });

  if (!payment && !orderId) {
    log.warn("payment_intent_no_order", {
      paymentIntentId: paymentIntent.id,
    });
    return { orderId: null, alreadyPaid: false };
  }

  const resolvedOrderId = payment?.orderId ?? orderId!;

  return finalizePaidOrder(
    finalizeInputFromPaymentIntent(paymentIntent, resolvedOrderId),
  );
}

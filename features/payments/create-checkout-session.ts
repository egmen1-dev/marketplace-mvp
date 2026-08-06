import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import type Stripe from "stripe";

import {
  commitInventory,
  InventoryError,
} from "@/features/orders/lib/inventory";
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
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export type CreateCheckoutSessionResult =
  | { ok: true; checkoutUrl: string; sessionId: string }
  | { ok: false; error: string };

/**
 * Create a Stripe Checkout Session for an unpaid order owned by `userId`.
 * Upserts a PENDING Payment row and stores `stripeSessionId`.
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
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  try {
    const stripe = getStripe();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      order.items.map((item) => ({
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

    // Include shipping as a separate line if present.
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
    console.error("[createCheckoutSessionForOrder]", err);
    return { ok: false, error: "Не удалось создать сессию оплаты" };
  }
}

/**
 * Assert Stripe charged amount matches the order total in smallest currency unit.
 */
function assertStripeAmountMatchesOrder(
  stripeAmountSmallestUnit: number | null | undefined,
  orderTotal: Prisma.Decimal,
  context: string,
): void {
  if (stripeAmountSmallestUnit == null) {
    throw new PaymentServiceError(
      "AMOUNT_MISSING",
      `Stripe amount missing while marking paid (${context})`,
      400,
    );
  }
  const expected = toStripeAmount(toPriceNumber(orderTotal));
  if (stripeAmountSmallestUnit !== expected) {
    console.error(
      `[assertStripeAmountMatchesOrder] mismatch ${context}: stripe=${stripeAmountSmallestUnit} expected=${expected}`,
    );
    throw new PaymentServiceError(
      "AMOUNT_MISMATCH",
      `Stripe amount ${stripeAmountSmallestUnit} does not match order total ${expected}`,
      400,
    );
  }
}

/**
 * Mark order + payment as paid from a completed Checkout Session.
 * Idempotent when the order is already PAID.
 * Commits inventory (stock decrement) only when transitioning to PAID.
 */
export async function markOrderPaidFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ orderId: string | null; alreadyPaid: boolean }> {
  const orderId =
    session.metadata?.orderId ??
    session.client_reference_id ??
    null;

  if (!orderId) {
    console.error(
      "[markOrderPaidFromCheckoutSession] missing orderId on session",
      session.id,
    );
    return { orderId: null, alreadyPaid: false };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });

      if (!order) {
        throw new PaymentServiceError(
          "ORDER_NOT_FOUND",
          `Order ${orderId} not found for session ${session.id}`,
          404,
        );
      }

      if (order.status === OrderStatus.PAID) {
        // Still sync Stripe ids if missing.
        if (order.payment && (paymentIntentId || session.id)) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              ...(session.id ? { stripeSessionId: session.id } : {}),
              ...(paymentIntentId
                ? { stripePaymentIntentId: paymentIntentId }
                : {}),
              status: PaymentStatus.SUCCEEDED,
              paidAt: order.payment.paidAt ?? new Date(),
            },
          });
        }
        return { orderId, alreadyPaid: true };
      }

      assertStripeAmountMatchesOrder(
        session.amount_total,
        order.total,
        `session ${session.id}`,
      );

      await commitInventory(orderId, tx);

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });

      const amount = new Prisma.Decimal(session.amount_total!).div(100);
      const currency =
        session.currency?.toUpperCase() ?? order.currency;

      await tx.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          userId: order.userId,
          amount,
          currency,
          status: PaymentStatus.SUCCEEDED,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          paidAt: new Date(),
        },
        update: {
          status: PaymentStatus.SUCCEEDED,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          paidAt: new Date(),
          amount,
          currency,
        },
      });

      return { orderId, alreadyPaid: false };
    });

    return result;
  } catch (err) {
    if (err instanceof InventoryError) {
      console.error(
        "[markOrderPaidFromCheckoutSession] inventory commit failed",
        orderId,
        err.message,
      );
      throw new PaymentServiceError(err.code, err.message, err.status);
    }
    throw err;
  }
}

/**
 * Optional handler for payment_intent.succeeded — mark PAID if we can resolve the order.
 * Commits inventory only on first transition to PAID.
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
    console.warn(
      "[markOrderPaidFromPaymentIntent] no order for PI",
      paymentIntent.id,
    );
    return { orderId: null, alreadyPaid: false };
  }

  const resolvedOrderId = payment?.orderId ?? orderId!;

  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: resolvedOrderId },
        include: { payment: true },
      });

      if (!order) {
        return { orderId: null, alreadyPaid: false };
      }

      if (order.status === OrderStatus.PAID) {
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              stripePaymentIntentId: paymentIntent.id,
              status: PaymentStatus.SUCCEEDED,
              paidAt: order.payment.paidAt ?? new Date(),
            },
          });
        }
        return { orderId: order.id, alreadyPaid: true };
      }

      const stripeAmount =
        paymentIntent.amount_received > 0
          ? paymentIntent.amount_received
          : paymentIntent.amount;

      assertStripeAmountMatchesOrder(
        stripeAmount,
        order.total,
        `payment_intent ${paymentIntent.id}`,
      );

      await commitInventory(order.id, tx);

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });

      const amount = new Prisma.Decimal(stripeAmount).div(100);

      await tx.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          userId: order.userId,
          amount,
          currency: paymentIntent.currency.toUpperCase(),
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntent.id,
          paidAt: new Date(),
        },
        update: {
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntent.id,
          paidAt: new Date(),
          amount,
        },
      });

      return { orderId: order.id, alreadyPaid: false };
    });
  } catch (err) {
    if (err instanceof InventoryError) {
      console.error(
        "[markOrderPaidFromPaymentIntent] inventory commit failed",
        resolvedOrderId,
        err.message,
      );
      throw new PaymentServiceError(err.code, err.message, err.status);
    }
    throw err;
  }
}

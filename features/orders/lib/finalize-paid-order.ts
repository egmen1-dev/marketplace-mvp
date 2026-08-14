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
import { PaymentServiceError } from "@/features/payments/errors";
import {
  toStripeAmount,
  toStripeCurrency,
} from "@/features/payments/lib/amounts";
import { toPriceNumber } from "@/features/products/mappers";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type FinalizePaidOrderInput = {
  orderId: string;
  /** Stripe amount in minor units (kopecks / cents). */
  amountTotal: number | null | undefined;
  /** Stripe currency (lowercase or upper). */
  currency: string | null | undefined;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  source: "checkout.session" | "payment_intent";
};

export type FinalizePaidOrderResult = {
  orderId: string;
  alreadyPaid: boolean;
};

/**
 * Domain service: confirm Stripe payment → decrement stock → mark PAID.
 *
 * - Transactional
 * - Idempotent (already PAID → no second stock decrement)
 * - Amount + currency verified in integer minor units
 * - Never trusts client; webhook / Stripe objects only
 */
export async function finalizePaidOrder(
  input: FinalizePaidOrderInput,
): Promise<FinalizePaidOrderResult> {
  const { orderId, source } = input;

  try {
    const result = await prisma.$transaction(async (tx) => {
      return finalizePaidOrderInTx(tx, input);
    });
    if (!result.alreadyPaid) {
      void trackServerEvent({
        event: ANALYTICS_EVENTS.PURCHASE_COMPLETE,
        route: `/orders/${result.orderId}`,
        entityId: result.orderId,
      });
      const { trackFinanceTransactionCreated } = await import("@/lib/finance");
      void trackFinanceTransactionCreated(result.orderId);
    }
    return result;
  } catch (err) {
    if (err instanceof InventoryError) {
      log.error("stock_finalize_failed", {
        orderId,
        source,
        code: err.code,
        message: err.message,
      });
      throw new PaymentServiceError(err.code, err.message, err.status);
    }
    throw err;
  }
}

export async function finalizePaidOrderInTx(
  tx: Tx,
  input: FinalizePaidOrderInput,
): Promise<FinalizePaidOrderResult> {
  const {
    orderId,
    amountTotal,
    currency,
    stripeSessionId,
    stripePaymentIntentId,
    source,
  } = input;

  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) {
    log.error("payment_order_not_found", { orderId, source });
    throw new PaymentServiceError(
      "ORDER_NOT_FOUND",
      `Order ${orderId} not found`,
      404,
    );
  }

  if (
    order.status !== OrderStatus.NEW ||
    order.payment?.status === PaymentStatus.SUCCEEDED
  ) {
    if (order.status === OrderStatus.CANCELLED) {
      throw new PaymentServiceError(
        "ORDER_CANCELLED",
        `Order ${orderId} is cancelled`,
        400,
      );
    }
    if (order.payment && (stripePaymentIntentId || stripeSessionId)) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          ...(stripeSessionId ? { stripeSessionId } : {}),
          ...(stripePaymentIntentId
            ? { stripePaymentIntentId }
            : {}),
          status: PaymentStatus.SUCCEEDED,
          paidAt: order.payment.paidAt ?? new Date(),
        },
      });
    }
    log.info("payment_webhook_duplicate", {
      orderId,
      source,
      alreadyPaid: true,
    });
    return { orderId, alreadyPaid: true };
  }

  assertStripeMatchesOrder(amountTotal, currency, order, source);

  await commitInventory(orderId, tx);

  const { transitionOrderInTx } = await import(
    "@/features/order-lifecycle/lib/transition"
  );
  const { OrderActorRole } = await import("@prisma/client");

  await transitionOrderInTx(tx, {
    orderId,
    toStatus: OrderStatus.AWAITING_SELLER_CONFIRMATION,
    actorRole: OrderActorRole.PAYMENT,
    reason: "Оплата подтверждена",
    silent: true,
  });

  const amount = new Prisma.Decimal(amountTotal!).div(100);
  const paidCurrency =
    currency?.trim().toUpperCase() || order.currency;

  await tx.payment.upsert({
    where: { orderId },
    create: {
      orderId,
      userId: order.userId,
      amount,
      currency: paidCurrency,
      status: PaymentStatus.SUCCEEDED,
      stripeSessionId: stripeSessionId ?? null,
      stripePaymentIntentId: stripePaymentIntentId ?? null,
      paidAt: new Date(),
    },
    update: {
      status: PaymentStatus.SUCCEEDED,
      stripeSessionId: stripeSessionId ?? undefined,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      paidAt: new Date(),
      amount,
      currency: paidCurrency,
    },
  });

  log.info("payment_finalized", {
    orderId,
    source,
    amountMinor: amountTotal ?? undefined,
    currency: paidCurrency,
  });

  const { syncFinanceOnPaymentInTx } = await import("@/lib/finance");
  await syncFinanceOnPaymentInTx(tx, orderId);

  return { orderId, alreadyPaid: false };
}

function assertStripeMatchesOrder(
  stripeAmountMinor: number | null | undefined,
  stripeCurrency: string | null | undefined,
  order: {
    id: string;
    total: Prisma.Decimal;
    currency: string;
  },
  source: string,
): void {
  if (stripeAmountMinor == null || !Number.isInteger(stripeAmountMinor)) {
    log.error("payment_amount_missing", {
      orderId: order.id,
      source,
    });
    throw new PaymentServiceError(
      "AMOUNT_MISSING",
      `Stripe amount missing while marking paid (${source})`,
      400,
    );
  }

  const expectedMinor = toStripeAmount(toPriceNumber(order.total));
  if (stripeAmountMinor !== expectedMinor) {
    log.error("payment_amount_mismatch", {
      orderId: order.id,
      source,
      stripeAmountMinor,
      expectedMinor,
    });
    throw new PaymentServiceError(
      "AMOUNT_MISMATCH",
      `Stripe amount ${stripeAmountMinor} does not match order total ${expectedMinor}`,
      400,
    );
  }

  if (stripeCurrency) {
    const got = toStripeCurrency(stripeCurrency);
    const expected = toStripeCurrency(order.currency);
    if (got !== expected) {
      log.error("payment_currency_mismatch", {
        orderId: order.id,
        source,
        stripeCurrency: got,
        expectedCurrency: expected,
      });
      throw new PaymentServiceError(
        "CURRENCY_MISMATCH",
        `Stripe currency ${got} does not match order currency ${expected}`,
        400,
      );
    }
  }
}

/** Build finalize input from a Checkout Session. */
export function finalizeInputFromCheckoutSession(
  session: Stripe.Checkout.Session,
  orderId: string,
): FinalizePaidOrderInput {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  return {
    orderId,
    amountTotal: session.amount_total,
    currency: session.currency,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    source: "checkout.session",
  };
}

/** Build finalize input from a PaymentIntent. */
export function finalizeInputFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  orderId: string,
): FinalizePaidOrderInput {
  const amount =
    paymentIntent.amount_received > 0
      ? paymentIntent.amount_received
      : paymentIntent.amount;

  return {
    orderId,
    amountTotal: amount,
    currency: paymentIntent.currency,
    stripePaymentIntentId: paymentIntent.id,
    source: "payment_intent",
  };
}

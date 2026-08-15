import { StripeWebhookStatus } from "@prisma/client";
import type Stripe from "stripe";

import {
  markOrderPaidFromCheckoutSession,
  markOrderPaidFromPaymentIntent,
} from "@/features/payments/create-checkout-session";
import { PaymentServiceError } from "@/features/payments/errors";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export type StripeWebhookResult = {
  handled: boolean;
  type: string;
  orderId?: string | null;
  alreadyPaid?: boolean;
  /** Business rejection that must not corrupt data on Stripe retries. */
  rejected?: boolean;
  reason?: string;
  /** Duplicate Stripe event already PROCESSED. */
  duplicate?: boolean;
};

/**
 * Verify Stripe webhook signature and process supported events.
 * Idempotency: Stripe event id stored in StripeWebhookEvent — PROCESSED events skip work.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
): Promise<StripeWebhookResult> {
  const webhookSecret = getEnv().STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  if (!signature) {
    throw new Error("Missing Stripe-Signature header");
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    throw new Error(`Webhook signature verification failed: ${message}`);
  }

  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing?.status === StripeWebhookStatus.PROCESSED) {
    log.info("payment_webhook_duplicate_event", {
      type: event.type,
      eventId: event.id,
    });
    return {
      handled: true,
      type: event.type,
      duplicate: true,
      orderId: existing.orderId,
    };
  }

  const row =
    existing ??
    (await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        status: StripeWebhookStatus.RECEIVED,
      },
    }));

  log.info("payment_webhook_received", {
    type: event.type,
    eventId: event.id,
  });

  try {
    let result: StripeWebhookResult;
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid" && session.mode === "payment") {
          if (session.payment_status !== "no_payment_required") {
            result = { handled: false, type: event.type };
            break;
          }
        }
        result = await settleCheckout(session, event.type);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        result = await settlePaymentIntent(paymentIntent, event.type);
        break;
      }
      default:
        result = { handled: false, type: event.type };
    }

    await prisma.stripeWebhookEvent.update({
      where: { id: row.id },
      data: {
        status: result.rejected
          ? StripeWebhookStatus.FAILED
          : StripeWebhookStatus.PROCESSED,
        orderId: result.orderId ?? undefined,
        error: result.reason ?? null,
        processedAt: new Date(),
      },
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "webhook_failed";
    await prisma.stripeWebhookEvent.update({
      where: { id: row.id },
      data: {
        status: StripeWebhookStatus.FAILED,
        error: message.slice(0, 500),
        processedAt: new Date(),
      },
    });
    throw err;
  }
}

async function settleCheckout(
  session: Stripe.Checkout.Session,
  type: string,
): Promise<StripeWebhookResult> {
  if (session.metadata?.purpose === "wallet_top_up") {
    const { creditWalletTopUpFromCheckoutSession } = await import(
      "@/lib/lot-wallet/credit-topup"
    );
    const credit = await creditWalletTopUpFromCheckoutSession(session);
    if (!credit.ok) {
      return {
        handled: credit.reason === "not_wallet_top_up",
        type,
        rejected: credit.reason !== "not_wallet_top_up",
        reason: credit.reason,
      };
    }
    return { handled: true, type, orderId: null };
  }

  try {
    const result = await markOrderPaidFromCheckoutSession(session);
    return {
      handled: true,
      type,
      orderId: result.orderId,
      alreadyPaid: result.alreadyPaid,
    };
  } catch (err) {
    return rejectBusinessError(err, type, session.metadata?.orderId ?? null);
  }
}

async function settlePaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  type: string,
): Promise<StripeWebhookResult> {
  try {
    const result = await markOrderPaidFromPaymentIntent(paymentIntent);
    return {
      handled: true,
      type,
      orderId: result.orderId,
      alreadyPaid: result.alreadyPaid,
    };
  } catch (err) {
    return rejectBusinessError(
      err,
      type,
      paymentIntent.metadata?.orderId ?? null,
    );
  }
}

function rejectBusinessError(
  err: unknown,
  type: string,
  orderId: string | null,
): StripeWebhookResult {
  if (err instanceof PaymentServiceError) {
    const safeCodes = new Set([
      "AMOUNT_MISMATCH",
      "CURRENCY_MISMATCH",
      "AMOUNT_MISSING",
      "OUT_OF_STOCK",
      "ORDER_NOT_FOUND",
    ]);
    if (safeCodes.has(err.code)) {
      log.error("payment_webhook_rejected", {
        type,
        orderId: orderId ?? undefined,
        code: err.code,
      });
      return {
        handled: true,
        type,
        orderId,
        rejected: true,
        reason: err.code,
      };
    }
  }
  throw err;
}

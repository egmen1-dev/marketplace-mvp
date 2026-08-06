import type Stripe from "stripe";

import {
  markOrderPaidFromCheckoutSession,
  markOrderPaidFromPaymentIntent,
} from "@/features/payments/create-checkout-session";
import { PaymentServiceError } from "@/features/payments/errors";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";

export type StripeWebhookResult = {
  handled: boolean;
  type: string;
  orderId?: string | null;
  alreadyPaid?: boolean;
  /** Business rejection that must not corrupt data on Stripe retries. */
  rejected?: boolean;
  reason?: string;
};

/**
 * Verify Stripe webhook signature and process supported events.
 * Source of truth for marking orders PAID via `finalizePaidOrder`.
 *
 * Amount / currency / stock failures return `rejected: true` without throwing,
 * so the route can respond 200 and avoid infinite retries that re-mutate state.
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

  log.info("payment_webhook_received", {
    type: event.type,
    eventId: event.id,
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid" && session.mode === "payment") {
        if (session.payment_status !== "no_payment_required") {
          return { handled: false, type: event.type };
        }
      }
      return settleCheckout(session, event.type);
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return settlePaymentIntent(paymentIntent, event.type);
    }
    default:
      return { handled: false, type: event.type };
  }
}

async function settleCheckout(
  session: Stripe.Checkout.Session,
  type: string,
): Promise<StripeWebhookResult> {
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

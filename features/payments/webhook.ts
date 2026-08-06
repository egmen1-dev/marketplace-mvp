import type Stripe from "stripe";

import {
  markOrderPaidFromCheckoutSession,
  markOrderPaidFromPaymentIntent,
} from "@/features/payments/create-checkout-session";
import { getEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export type StripeWebhookResult = {
  handled: boolean;
  type: string;
  orderId?: string | null;
  alreadyPaid?: boolean;
};

/**
 * Verify Stripe webhook signature and process supported events.
 * Source of truth for marking orders PAID.
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid" && session.mode === "payment") {
        // Unpaid / async methods — ignore until paid.
        if (session.payment_status !== "no_payment_required") {
          return { handled: false, type: event.type };
        }
      }
      const result = await markOrderPaidFromCheckoutSession(session);
      return {
        handled: true,
        type: event.type,
        orderId: result.orderId,
        alreadyPaid: result.alreadyPaid,
      };
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const result = await markOrderPaidFromPaymentIntent(paymentIntent);
      return {
        handled: true,
        type: event.type,
        orderId: result.orderId,
        alreadyPaid: result.alreadyPaid,
      };
    }
    default:
      return { handled: false, type: event.type };
  }
}

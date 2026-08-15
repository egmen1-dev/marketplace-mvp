import { Prisma, StripeWebhookStatus } from "@prisma/client";
import type Stripe from "stripe";

import {
  markOrderPaidFromCheckoutSession,
  markOrderPaidFromPaymentIntent,
} from "@/features/payments/create-checkout-session";
import { PaymentServiceError } from "@/features/payments/errors";
import { writeFinancialAuditLog } from "@/lib/financial-transaction-engine/audit";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export type StripeWebhookResult = {
  handled: boolean;
  type: string;
  orderId?: string | null;
  alreadyPaid?: boolean;
  rejected?: boolean;
  reason?: string;
  duplicate?: boolean;
  ignored?: boolean;
};

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function auditWebhook(input: {
  eventId: string;
  type: string;
  phase: string;
  outcome: "ok" | "fail" | "skip";
  detail?: Record<string, unknown>;
}) {
  await writeFinancialAuditLog({
    context: {
      operationType: "STRIPE_ORDER_PAY",
      idempotencyKey: `stripe:event:${input.eventId}`,
      referenceType: "STRIPE_WEBHOOK",
      referenceId: input.eventId,
      metadata: { type: input.type },
    },
    phase: input.phase as "validate" | "audit",
    outcome: input.outcome,
    detail: input.detail,
  });
}

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
    await auditWebhook({
      eventId: "unknown",
      type: "unknown",
      phase: "validate",
      outcome: "fail",
      detail: { reason: "missing_signature" },
    });
    throw new Error("Missing Stripe-Signature header");
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    await auditWebhook({
      eventId: "unknown",
      type: "unknown",
      phase: "validate",
      outcome: "fail",
      detail: { reason: message },
    });
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
    await auditWebhook({
      eventId: event.id,
      type: event.type,
      phase: "audit",
      outcome: "skip",
      detail: { duplicate: true },
    });
    return {
      handled: true,
      type: event.type,
      duplicate: true,
      ignored: true,
      orderId: existing.orderId,
    };
  }

  let row = existing;
  if (!row) {
    try {
      row = await prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          status: StripeWebhookStatus.RECEIVED,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const raced = await prisma.stripeWebhookEvent.findUnique({
          where: { stripeEventId: event.id },
        });
        if (raced?.status === StripeWebhookStatus.PROCESSED) {
          return {
            handled: true,
            type: event.type,
            duplicate: true,
            ignored: true,
            orderId: raced.orderId,
          };
        }
        row = raced ?? undefined;
      }
      if (!row) throw err;
    }
  }

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
            result = { handled: false, type: event.type, ignored: true };
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
        result = { handled: false, type: event.type, ignored: true };
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

    await auditWebhook({
      eventId: event.id,
      type: event.type,
      phase: "audit",
      outcome: "ok",
      detail: {
        handled: result.handled,
        duplicate: result.duplicate,
        ignored: result.ignored,
        rejected: result.rejected,
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
    await auditWebhook({
      eventId: event.id,
      type: event.type,
      phase: "audit",
      outcome: "fail",
      detail: { message },
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
        ignored: credit.reason === "not_wallet_top_up",
      };
    }
    return {
      handled: true,
      type,
      orderId: null,
      duplicate: credit.duplicate,
      ignored: credit.duplicate,
    };
  }

  try {
    const result = await markOrderPaidFromCheckoutSession(session);
    return {
      handled: true,
      type,
      orderId: result.orderId,
      alreadyPaid: result.alreadyPaid,
      ignored: result.alreadyPaid,
      duplicate: result.alreadyPaid,
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
      ignored: result.alreadyPaid,
      duplicate: result.alreadyPaid,
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
        ignored: true,
      };
    }
  }
  throw err;
}

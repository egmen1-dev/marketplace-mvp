#!/usr/bin/env tsx
/**
 * TEMPORARY — STRIPE-CHECKOUT-DIAGNOSTICS-001
 * Diagnose Checkout Session payment-method availability. Do not import in app code.
 */
import Stripe from "stripe";

import { toStripeAmount, toStripeCurrency } from "@/features/payments/lib/amounts";
import { ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

function maskKey(key: string | undefined): string {
  if (!key) return "MISSING";
  const mode = key.startsWith("sk_test_")
    ? "sk_test_"
    : key.startsWith("sk_live_")
      ? "sk_live_"
      : key.startsWith("pk_test_")
        ? "pk_test_"
        : key.startsWith("pk_live_")
          ? "pk_live_"
          : "unknown_";
  return `${mode}…${key.slice(-6)} (len=${key.length})`;
}

function stripeErrorFields(err: unknown): Record<string, unknown> {
  if (!(err instanceof Stripe.errors.StripeError)) {
    return { raw: err instanceof Error ? err.message : String(err) };
  }
  return {
    type: err.type,
    code: err.code ?? null,
    message: err.message,
    decline_code:
      "decline_code" in err
        ? (err as Stripe.errors.StripeCardError).decline_code ?? null
        : null,
    payment_method:
      "payment_method" in err
        ? (err as Stripe.errors.StripeCardError).payment_method ?? null
        : null,
    statusCode: err.statusCode ?? null,
    requestId: err.requestId ?? null,
  };
}

function buildWalletTopUpPayload(input: {
  userId: string;
  email: string;
  amountRub: number;
}): Stripe.Checkout.SessionCreateParams {
  const appUrl = getCanonicalAppUrl();
  const currency = toStripeCurrency("RUB");
  return {
    mode: "payment",
    customer_email: input.email,
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
  };
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

  console.log("=== STRIPE KEY VERIFICATION ===");
  console.log(
    JSON.stringify(
      {
        STRIPE_SECRET_KEY: maskKey(secret),
        secretIsTest: Boolean(secret?.startsWith("sk_test_")),
        secretIsLive: Boolean(secret?.startsWith("sk_live_")),
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: maskKey(publishable),
        publishableIsTest: Boolean(publishable?.startsWith("pk_test_")),
        publishableIsLive: Boolean(publishable?.startsWith("pk_live_")),
        keysSameAccount:
          secret && publishable
            ? secret.slice(8, 16) === publishable.slice(8, 16)
            : null,
        isStripeConfigured: isStripeConfigured(),
        canonicalAppUrl: getCanonicalAppUrl(),
      },
      null,
      2,
    ),
  );

  if (!secret) {
    console.error("STRIPE_SECRET_KEY missing — cannot continue");
    process.exit(1);
  }

  const stripe = getStripe();
  console.log("\n=== STRIPE SDK CONFIG ===");
  console.log(
    JSON.stringify(
      {
        apiVersion: (stripe as unknown as { _api?: { version?: string } }).getApiField?.(
          "version",
        ) ?? "2026-07-29.dahlia (from lib/stripe.ts)",
        stripePackageVersion: "stripe@^22.4.0",
      },
      null,
      2,
    ),
  );

  const payload = buildWalletTopUpPayload({
    userId: "diag-user",
    email: "stripe-diagnostics@demo.lot",
    amountRub: 500,
  });

  console.log("\n=== CHECKOUT SESSION CREATE PAYLOAD (FULL) ===");
  console.log(
    JSON.stringify(
      {
        payment_method_types: payload.payment_method_types ?? null,
        automatic_payment_methods: payload.automatic_payment_methods ?? null,
        currency: payload.line_items?.[0]?.price_data?.currency ?? null,
        mode: payload.mode,
        success_url: payload.success_url,
        cancel_url: payload.cancel_url,
        customer_email: payload.customer_email,
        line_items: payload.line_items,
        metadata: payload.metadata,
        payment_intent_data: payload.payment_intent_data,
        fullPayload: payload,
      },
      null,
      2,
    ),
  );

  const unsupported =
    payload.payment_method_types?.filter((t) => t !== "card") ?? [];
  if (unsupported.length > 0) {
    console.log("\n⚠ payment_method_types contains non-card methods:", unsupported);
  } else if (payload.payment_method_types) {
    console.log("\n✓ payment_method_types is card-only:", payload.payment_method_types);
  } else {
    console.log(
      "\n⚠ payment_method_types NOT SET — Stripe account defaults / automatic methods apply",
    );
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(payload);
    console.log("\n=== STRIPE CHECKOUT SESSION RESPONSE ===");
    console.log(
      JSON.stringify(
        {
          id: session.id,
          url: session.url,
          mode: session.mode,
          currency: session.currency,
          payment_method_types: session.payment_method_types,
          payment_method_options: session.payment_method_options,
          payment_method_collection: session.payment_method_collection,
          automatic_tax: session.automatic_tax,
          status: session.status,
          payment_status: session.payment_status,
          success_url: session.success_url,
          cancel_url: session.cancel_url,
          amount_total: session.amount_total,
          customer_email: session.customer_email,
          metadata: session.metadata,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.log("\n=== STRIPE ERROR (session.create) ===");
    console.log(JSON.stringify(stripeErrorFields(err), null, 2));
    process.exit(1);
  }

  const expanded = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["payment_intent", "payment_intent.payment_method"],
  });

  console.log("\n=== EXPANDED SESSION (payment_intent) ===");
  const pi = expanded.payment_intent;
  console.log(
    JSON.stringify(
      {
        payment_intent:
          typeof pi === "object" && pi
            ? {
                id: pi.id,
                status: pi.status,
                currency: pi.currency,
                amount: pi.amount,
                payment_method_types: pi.payment_method_types,
                automatic_payment_methods: pi.automatic_payment_methods,
                last_payment_error: pi.last_payment_error
                  ? {
                      type: pi.last_payment_error.type,
                      code: pi.last_payment_error.code,
                      message: pi.last_payment_error.message,
                      decline_code: pi.last_payment_error.decline_code,
                      payment_method: pi.last_payment_error.payment_method,
                    }
                  : null,
              }
            : pi,
      },
      null,
      2,
    ),
  );

  console.log("\n=== STRIPE ACCOUNT CAPABILITIES ===");
  try {
    const account = await stripe.accounts.retrieve();
    console.log(
      JSON.stringify(
        {
          id: account.id,
          country: account.country,
          default_currency: account.default_currency,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          capabilities: account.capabilities,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.log("accounts.retrieve failed (standard key — expected):");
    console.log(JSON.stringify(stripeErrorFields(err), null, 2));
  }

  console.log("\n=== PAYMENT METHOD CONFIGURATION (test mode) ===");
  try {
    const configs = await stripe.paymentMethodConfigurations.list({ limit: 5 });
    console.log(
      JSON.stringify(
        configs.data.map((c) => ({
          id: c.id,
          active: c.active,
          application: c.application,
          card: c.card,
          link: (c as Stripe.PaymentMethodConfiguration & { link?: unknown }).link,
          apple_pay: (c as Stripe.PaymentMethodConfiguration & { apple_pay?: unknown })
            .apple_pay,
        })),
        null,
        2,
      ),
    );
  } catch (err) {
    console.log("paymentMethodConfigurations.list error:");
    console.log(JSON.stringify(stripeErrorFields(err), null, 2));
  }

  console.log("\n=== SIMULATED CARD PAYMENT (confirm PI — expect test decline or success) ===");
  if (typeof expanded.payment_intent === "object" && expanded.payment_intent?.id) {
    try {
      const pm = await stripe.paymentMethods.create({
        type: "card",
        card: { token: "tok_visa" },
      });
      const confirmed = await stripe.paymentIntents.confirm(
        expanded.payment_intent.id,
        { payment_method: pm.id },
      );
      console.log(
        JSON.stringify(
          {
            paymentIntentId: confirmed.id,
            status: confirmed.status,
            last_payment_error: confirmed.last_payment_error,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      console.log(JSON.stringify(stripeErrorFields(err), null, 2));
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

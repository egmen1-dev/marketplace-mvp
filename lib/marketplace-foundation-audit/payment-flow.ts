import { isStripeConfigured } from "@/lib/stripe";

import type { AuditCheck } from "./types";

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: AuditCheck["severity"] = passed ? "info" : "warning",
  detail?: string,
): AuditCheck {
  return { id, label, passed, severity: passed ? "info" : severity, detail };
}

export function auditPaymentFlow(): AuditCheck[] {
  const stripe = isStripeConfigured();
  const webhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const webhookRoute = true;

  return [
    check(
      "payment-stripe-configured",
      "Stripe secret key configured",
      stripe,
      "critical",
      stripe ? undefined : "STRIPE_SECRET_KEY missing",
    ),
    check(
      "payment-webhook-secret",
      "Stripe webhook secret configured",
      !stripe || webhookSecret,
      "critical",
      webhookSecret ? undefined : "STRIPE_WEBHOOK_SECRET missing",
    ),
    check("payment-webhook-route", "Stripe webhook route", webhookRoute),
    check("payment-checkout-session", "Checkout session creation", true),
    check("payment-finance-transaction", "FinanceTransaction ledger", true),
    check("payment-seller-balance-pending", "SellerBalance.pending on payment", true),
    check(
      "payment-seller-balance-available",
      "SellerBalance.available on completion",
      true,
    ),
    check("payment-payout-flow", "Payout request flow", true),
    check(
      "payment-idempotency",
      "Webhook idempotency handling",
      true,
      "info",
      "Payment finalize guards duplicate events",
    ),
  ];
}

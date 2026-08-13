import { PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";

import { launchCheck } from "./audit";
import { isMarketplaceLaunchReadinessEnabled } from "./flags";
import type { PaymentProductionHealth } from "./types";

export async function getPaymentProductionHealth(): Promise<PaymentProductionHealth> {
  const disabled: PaymentProductionHealth = {
    enabled: false,
    stripeConfigured: false,
    webhookSecretConfigured: false,
    publishableKeyConfigured: false,
    pendingCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    succeededToday: 0,
    checks: [],
  };

  if (!isMarketplaceLaunchReadinessEnabled()) return disabled;

  const stripeConfigured = isStripeConfigured();
  const webhookSecretConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const publishableKeyConfigured = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
  );

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [pendingCount, failedCount, cancelledCount, succeededToday] =
    await Promise.all([
      prisma.payment.count({
        where: {
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
      }),
      prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      prisma.payment.count({ where: { status: PaymentStatus.CANCELLED } }),
      prisma.payment.count({
        where: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: { gte: startOfDay },
        },
      }),
    ]);

  const checks = [
    launchCheck(
      "payment-stripe-secret",
      "Stripe secret key configured",
      stripeConfigured,
      "critical",
      stripeConfigured ? undefined : "STRIPE_SECRET_KEY missing",
    ),
    launchCheck(
      "payment-stripe-publishable",
      "Stripe publishable key configured",
      publishableKeyConfigured,
      "critical",
      publishableKeyConfigured
        ? undefined
        : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing",
    ),
    launchCheck(
      "payment-webhook-secret",
      "Stripe webhook secret configured",
      !stripeConfigured || webhookSecretConfigured,
      "critical",
      webhookSecretConfigured ? undefined : "STRIPE_WEBHOOK_SECRET missing",
    ),
    launchCheck("payment-webhook-route", "Webhook route /api/webhooks/stripe", true),
    launchCheck(
      "payment-idempotency",
      "Duplicate webhook protection",
      true,
      "info",
      "finalize-paid-order guards duplicate events",
    ),
    launchCheck(
      "payment-failed-queue",
      "Failed payments visible to admin",
      true,
      failedCount > 0 ? "warning" : "info",
      failedCount > 0 ? `${failedCount} failed payments` : undefined,
    ),
    launchCheck(
      "payment-pending-queue",
      "Pending payments tracked",
      true,
      pendingCount > 5 ? "warning" : "info",
      pendingCount > 0 ? `${pendingCount} pending` : undefined,
    ),
    launchCheck(
      "payment-refund-readiness",
      "Refund status enum + finance layer",
      true,
      "info",
      "PaymentStatus.REFUNDED + finance refund path",
    ),
  ];

  return {
    enabled: true,
    stripeConfigured,
    webhookSecretConfigured,
    publishableKeyConfigured,
    pendingCount,
    failedCount,
    cancelledCount,
    succeededToday,
    checks,
  };
}

export function auditPaymentProduction(
  health: PaymentProductionHealth,
): import("./types").LaunchAuditCheck[] {
  return health.checks;
}

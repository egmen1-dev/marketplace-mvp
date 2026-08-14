import { ModerationStatus, OrderStatus, PaymentStatus, ProductStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isCdekConfigured } from "@/lib/delivery";
import { isStripeConfigured } from "@/lib/stripe";
import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery/flags";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";

import { auditAdminOperations } from "./admin-checks";
import { auditBuyerJourney } from "./buyer-checks";
import {
  computeLaunchLabel,
  launchHeadline,
  scoreFromLaunchChecks,
} from "./audit";
import { getDeliveryProductionHealth } from "./delivery-checks";
import { isMarketplaceLaunchReadinessEnabled } from "./flags";
import {
  auditModerationLaunch,
  auditModerationLive,
} from "./moderation-checks";
import { getPaymentProductionHealth } from "./payment-checks";
import { auditSecurityLaunch } from "./security-checks";
import { auditSellerJourney } from "./seller-checks";
import type {
  LaunchChecklistItem,
  LaunchChecklistReport,
  LaunchReadinessReport,
  MarketplaceHealthDashboard,
} from "./types";
import { getUxHealthReport } from "./ux-checks";

const disabledReport: LaunchReadinessReport = {
  enabled: false,
  score: 0,
  label: "blocked",
  headline: "MARKETPLACE_LAUNCH_READINESS_ENABLED=false",
  sections: [],
  failedCritical: [],
};

export async function getLaunchReadinessReport(): Promise<LaunchReadinessReport> {
  if (!isMarketplaceLaunchReadinessEnabled()) return disabledReport;

  const [paymentHealth, deliveryHealth, moderationLive] = await Promise.all([
    getPaymentProductionHealth(),
    getDeliveryProductionHealth(),
    auditModerationLive(),
  ]);

  const sections = [
    { id: "buyer", title: "Buyer journey", checks: auditBuyerJourney() },
    { id: "seller", title: "Seller journey", checks: auditSellerJourney() },
    {
      id: "payment",
      title: "Payments",
      checks: paymentHealth.checks,
    },
    {
      id: "delivery",
      title: "Delivery",
      checks: deliveryHealth.checks,
    },
    {
      id: "security",
      title: "Security",
      checks: auditSecurityLaunch(),
    },
    {
      id: "moderation",
      title: "Moderation",
      checks: [...auditModerationLaunch(), ...moderationLive],
    },
    { id: "admin", title: "Admin ops", checks: auditAdminOperations() },
  ].map((section) => ({
    ...section,
    score: scoreFromLaunchChecks(section.checks),
  }));

  const allChecks = sections.flatMap((s) => s.checks);
  const score = scoreFromLaunchChecks(allChecks);
  const label = computeLaunchLabel(score);
  const failedCritical = allChecks.filter((c) => !c.passed && c.severity === "critical");

  return {
    enabled: true,
    score,
    label,
    headline: launchHeadline(label),
    sections,
    failedCritical,
  };
}

export async function getMarketplaceHealthDashboard(): Promise<MarketplaceHealthDashboard> {
  const disabled: MarketplaceHealthDashboard = {
    enabled: false,
    ordersToday: 0,
    ordersFailed: 0,
    ordersPending: 0,
    paymentSuccessRate: 0,
    paymentFailures: 0,
    deliveryDelays: 0,
    sellersActive: 0,
    sellersBlocked: 0,
    reviewsCount: 0,
    moderationPending: 0,
  };

  if (!isMarketplaceLaunchReadinessEnabled()) return disabled;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    ordersToday,
    ordersFailed,
    ordersPending,
    paymentsSucceeded,
    paymentsFailed,
    deliveryDelays,
    sellersActive,
    sellersBlocked,
    reviewsCount,
    moderationPending,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count({
      where: {
        status: { in: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
        updatedAt: { gte: startOfDay },
      },
    }),
    prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.NEW, OrderStatus.AWAITING_SELLER_CONFIRMATION],
        },
      },
    }),
    prisma.payment.count({ where: { status: PaymentStatus.SUCCEEDED } }),
    prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
    prisma.order.count({
      where: { isOverdue: true, fulfillmentType: "DELIVERY" },
    }),
    prisma.sellerProfile.count({
      where: {
        isBlocked: false,
        products: { some: { status: ProductStatus.ACTIVE } },
      },
    }),
    prisma.sellerProfile.count({ where: { isBlocked: true } }),
    isMarketplaceTrustLoopEnabled()
      ? prisma.review.count({ where: { status: ReviewStatus.APPROVED } })
      : Promise.resolve(0),
    isMarketplaceTrustLoopEnabled()
      ? prisma.moderationQueueItem.count({
          where: { status: ModerationStatus.PENDING_REVIEW },
        })
      : Promise.resolve(0),
  ]);

  const paymentTotal = paymentsSucceeded + paymentsFailed;
  const paymentSuccessRate =
    paymentTotal > 0 ? Math.round((paymentsSucceeded / paymentTotal) * 100) : 100;

  return {
    enabled: true,
    ordersToday,
    ordersFailed,
    ordersPending,
    paymentSuccessRate,
    paymentFailures: paymentsFailed,
    deliveryDelays,
    sellersActive,
    sellersBlocked,
    reviewsCount,
    moderationPending,
  };
}

export async function getLaunchChecklistReport(): Promise<LaunchChecklistReport> {
  const disabled: LaunchChecklistReport = {
    enabled: false,
    items: [],
    readyCount: 0,
    totalCount: 0,
  };

  if (!isMarketplaceLaunchReadinessEnabled()) return disabled;

  const [
    hasSeller,
    hasApprovedProduct,
    hasCompletedOrder,
    hasDeliveredOrder,
    hasPayout,
  ] = await Promise.all([
    prisma.sellerProfile.count().then((n) => n > 0),
    isMarketplaceTrustLoopEnabled()
      ? prisma.productModeration
          .count({ where: { status: ModerationStatus.APPROVED } })
          .then((n) => n > 0)
      : prisma.product
          .count({ where: { status: ProductStatus.ACTIVE } })
          .then((n) => n > 0),
    prisma.order.count({ where: { status: OrderStatus.COMPLETED } }).then((n) => n > 0),
    prisma.order
      .count({
        where: {
          status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
        },
      })
      .then((n) => n > 0),
    prisma.payoutRequest.count().then((n) => n > 0),
  ]);

  const storageConfigured = Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.R2_ACCESS_KEY_ID?.trim() ||
      process.env.S3_BUCKET?.trim(),
  );

  const items: LaunchChecklistItem[] = [
    {
      id: "tech-db",
      section: "technical",
      label: "Database backup process documented",
      ready: true,
      detail: "Run pg_dump / provider backup before launch",
    },
    {
      id: "tech-stripe",
      section: "technical",
      label: "Stripe configured",
      ready: isStripeConfigured(),
    },
    {
      id: "tech-cdek",
      section: "technical",
      label: "CDEK configured",
      ready: isCdekConfigured(),
      detail: isCdekConfigured() ? "Live CDEK" : "Mock OK for staging",
    },
    {
      id: "tech-storage",
      section: "technical",
      label: "Storage configured",
      ready: storageConfigured,
    },
    {
      id: "mp-seller",
      section: "marketplace",
      label: "First seller created",
      ready: hasSeller,
    },
    {
      id: "mp-product",
      section: "marketplace",
      label: "First product approved",
      ready: hasApprovedProduct,
    },
    {
      id: "mp-order",
      section: "marketplace",
      label: "Test order completed",
      ready: hasCompletedOrder,
    },
    {
      id: "mp-delivery",
      section: "marketplace",
      label: "Test delivery completed",
      ready: hasDeliveredOrder,
    },
    {
      id: "mp-payout",
      section: "marketplace",
      label: "Test payout completed",
      ready: hasPayout,
      detail: hasPayout ? undefined : "Create a test payout request",
    },
    {
      id: "trust-reviews",
      section: "trust",
      label: "Reviews enabled",
      ready: isMarketplaceTrustLoopEnabled(),
    },
    {
      id: "trust-moderation",
      section: "trust",
      label: "Moderation enabled",
      ready: isMarketplaceTrustLoopEnabled(),
    },
    {
      id: "trust-delivery",
      section: "trust",
      label: "Delivery layer enabled",
      ready: isMarketplaceDeliveryEnabled(),
    },
  ];

  const readyCount = items.filter((i) => i.ready).length;

  return {
    enabled: true,
    items,
    readyCount,
    totalCount: items.length,
  };
}

export {
  getPaymentProductionHealth,
  getDeliveryProductionHealth,
  getUxHealthReport,
};

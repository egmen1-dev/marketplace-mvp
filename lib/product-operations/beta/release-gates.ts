import { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { countCrashesSince } from "./crash-observatory";
import { isEligibleReleaseMetric } from "./evidence-eligibility";
import { validateAllJourneys } from "./journey-validation";
import type { ReleaseGateRow } from "./types";

export async function evaluateReleaseQualityGates(): Promise<{
  verdict: "PASS" | "FAIL";
  rows: ReleaseGateRow[];
}> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    sessions24h,
    crashes24h,
    startupFailures,
    checkoutFailures,
    sellerPublishFailures,
    productCreates,
    productCreateSuccess,
    orders30d,
    completedOrders,
    walletInconsistencies,
    inventoryCorruption,
    journeys,
  ] = await Promise.all([
    prisma.productTelemetryEvent.count({
      where: { createdAt: { gte: dayAgo }, eventType: { in: ["session_start", "screen_view"] } },
    }),
    countCrashesSince(24),
    prisma.productTelemetryEvent.count({
      where: { createdAt: { gte: dayAgo }, eventType: "slow_startup" },
    }),
    prisma.productTelemetryEvent.count({
      where: { createdAt: { gte: dayAgo }, screen: "checkout", eventType: { in: ["error", "api_failure"] } },
    }),
    prisma.productTelemetryEvent.count({
      where: {
        createdAt: { gte: dayAgo },
        screen: { in: ["product_editor", "seller_products"] },
        eventType: { in: ["error", "upload_failure"] },
      },
    }),
    prisma.product.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.productTelemetryEvent.count({
      where: { createdAt: { gte: weekAgo }, eventType: "product_publish_success" },
    }),
    prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.order.count({
      where: {
        createdAt: { gte: weekAgo },
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.COMPLETED,
          ],
        },
      },
    }),
    prisma.productTelemetryEvent.count({
      where: { createdAt: { gte: dayAgo }, screen: "wallet", eventType: "wallet_inconsistency" },
    }),
    prisma.productTelemetryEvent.count({
      where: { createdAt: { gte: dayAgo }, eventType: "inventory_corruption" },
    }),
    validateAllJourneys(7),
  ]);

  const totalSessions = sessions24h || 1;
  const crashFreeSessions = Math.round((1 - crashes24h / totalSessions) * 1000) / 10;
  const productCreateRate =
    productCreates > 0 ? Math.round((productCreateSuccess / productCreates) * 1000) / 10 : 100;
  const orderCompletionRate =
    orders30d > 0 ? Math.round((completedOrders / orders30d) * 1000) / 10 : 100;
  const criticalBugRows = await prisma.productFeedbackItem.findMany({
    where: { createdAt: { gte: dayAgo }, classification: { in: ["crash", "error"] } },
    select: { classification: true, content: true, screen: true, metadata: true, createdAt: true },
  });
  const criticalBugs = criticalBugRows.filter((row) =>
    isEligibleReleaseMetric({
      createdAt: row.createdAt,
      screen: row.screen,
      content: row.content,
      metadata: row.metadata,
    }),
  ).length;

  const rows: ReleaseGateRow[] = [
    {
      id: "crash_free_sessions",
      label: "Crash-free sessions",
      threshold: ">= 99%",
      actual: `${crashFreeSessions}%`,
      ok: crashFreeSessions >= 99,
    },
    {
      id: "critical_bugs",
      label: "Critical bugs",
      threshold: "0",
      actual: String(criticalBugs),
      ok: criticalBugs === 0,
    },
    {
      id: "startup_failures",
      label: "Startup failures",
      threshold: "0",
      actual: String(startupFailures),
      ok: startupFailures === 0,
    },
    {
      id: "checkout_failures",
      label: "Checkout failures",
      threshold: "0",
      actual: String(checkoutFailures),
      ok: checkoutFailures === 0,
    },
    {
      id: "seller_publish_failures",
      label: "Seller publish failures",
      threshold: "0",
      actual: String(sellerPublishFailures),
      ok: sellerPublishFailures === 0,
    },
    {
      id: "inventory_corruption",
      label: "Inventory corruption",
      threshold: "0",
      actual: String(inventoryCorruption),
      ok: inventoryCorruption === 0,
    },
    {
      id: "wallet_inconsistency",
      label: "Wallet inconsistency",
      threshold: "0",
      actual: String(walletInconsistencies),
      ok: walletInconsistencies === 0,
    },
    {
      id: "product_creation_success",
      label: "Product creation success",
      threshold: ">= 98%",
      actual: `${productCreateRate}%`,
      ok: productCreateRate >= 98,
    },
    {
      id: "order_completion",
      label: "Order completion",
      threshold: ">= 98%",
      actual: `${orderCompletionRate}%`,
      ok: orderCompletionRate >= 98,
    },
    {
      id: "buyer_journey",
      label: "Buyer journey validation",
      threshold: "PASS",
      actual: journeys.buyer.status,
      ok: journeys.buyer.status === "PASS" || journeys.buyer.status === "INSUFFICIENT_DATA",
    },
    {
      id: "seller_journey",
      label: "Seller journey validation",
      threshold: "PASS",
      actual: journeys.seller.status,
      ok: journeys.seller.status === "PASS" || journeys.seller.status === "INSUFFICIENT_DATA",
    },
  ];

  const verdict = rows.every((r) => r.ok) ? "PASS" : "FAIL";
  return { verdict, rows };
}

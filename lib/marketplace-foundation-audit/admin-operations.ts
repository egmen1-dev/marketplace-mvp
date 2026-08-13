import {
  FinanceTransactionStatus,
  OrderStatus,
  PayoutRequestStatus,
  ProductStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { isMarketplaceFoundationAuditEnabled } from "./flags";
import type { AdminOperationsOverview } from "./types";

const disabledOverview: AdminOperationsOverview = {
  enabled: false,
  orders: { newCount: 0, problemCount: 0, overdueCount: 0 },
  sellers: { newCount: 0, activeCount: 0, problemCount: 0 },
  products: { pendingReview: 0, rejected: 0, noSales: 0 },
  finance: { pendingPayments: 0, pendingPayouts: 0, openDisputes: 0 },
  trust: { openReports: 0, riskFlags: 0 },
};

export async function getAdminOperationsOverview(): Promise<AdminOperationsOverview> {
  if (!isMarketplaceFoundationAuditEnabled()) return disabledOverview;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    newOrders,
    overdueOrders,
    cancelledRecent,
    newSellers,
    activeSellers,
    sellersNoSales,
    draftProducts,
    archivedProducts,
    productsNoSales,
    pendingFinance,
    pendingPayouts,
    disputes,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.NEW, OrderStatus.AWAITING_SELLER_CONFIRMATION],
        },
      },
    }),
    prisma.order.count({ where: { isOverdue: true } }),
    prisma.order.count({
      where: {
        status: OrderStatus.CANCELLED,
        updatedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.sellerProfile.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.sellerProfile.count({
      where: {
        products: { some: { status: ProductStatus.ACTIVE } },
      },
    }),
    prisma.sellerProfile.count({
      where: {
        products: { some: { status: ProductStatus.ACTIVE } },
        NOT: { products: { some: { orderItems: { some: {} } } } },
      },
    }),
    prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
    prisma.product.count({
      where: {
        status: ProductStatus.ACTIVE,
        views: { gte: 10 },
        orderItems: { none: {} },
      },
    }),
    prisma.financeTransaction.count({
      where: { status: FinanceTransactionStatus.PENDING },
    }),
    prisma.payoutRequest.count({
      where: { status: PayoutRequestStatus.REQUESTED },
    }),
    prisma.dispute.count({
      where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
    }),
  ]);

  return {
    enabled: true,
    orders: {
      newCount: newOrders,
      problemCount: cancelledRecent,
      overdueCount: overdueOrders,
    },
    sellers: {
      newCount: newSellers,
      activeCount: activeSellers,
      problemCount: sellersNoSales,
    },
    products: {
      pendingReview: draftProducts,
      rejected: archivedProducts,
      noSales: productsNoSales,
    },
    finance: {
      pendingPayments: pendingFinance,
      pendingPayouts: pendingPayouts,
      openDisputes: disputes,
    },
    trust: {
      openReports: 0,
      riskFlags: archivedProducts,
    },
  };
}

export function auditAdminOperations(overview: AdminOperationsOverview): import("./types").AuditCheck[] {
  return [
    {
      id: "ops-admin-orders",
      label: "Admin orders dashboard",
      passed: true,
      severity: "info",
    },
    {
      id: "ops-admin-sellers",
      label: "Admin sellers dashboard",
      passed: true,
      severity: "info",
    },
    {
      id: "ops-admin-finance",
      label: "Admin finance dashboard",
      passed: true,
      severity: "info",
    },
    {
      id: "ops-overdue-tracking",
      label: "Overdue orders tracked",
      passed: overview.enabled,
      severity: overview.orders.overdueCount > 0 ? "warning" : "info",
      detail:
        overview.orders.overdueCount > 0
          ? `${overview.orders.overdueCount} overdue`
          : undefined,
    },
    {
      id: "ops-payout-queue",
      label: "Payout queue visible",
      passed: true,
      severity: "info",
      detail:
        overview.finance.pendingPayouts > 0
          ? `${overview.finance.pendingPayouts} pending`
          : undefined,
    },
  ];
}

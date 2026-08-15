import { FinanceTransactionStatus, FinanceTransactionType, Prisma } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import {
  createTransaction,
  holdFunds,
  markPaid,
  releaseFunds,
} from "@/lib/finance/transaction";
import type {
  AdminFinanceDashboard,
  AdminFinanceRow,
} from "@/lib/finance/types";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

/** Called inside payment finalize transaction — idempotent. */
export async function syncFinanceOnPaymentInTx(
  tx: Tx,
  orderId: string,
): Promise<void> {
  const created = await createTransaction(orderId, tx);
  const paid = await markPaid(created.id, tx);
  await holdFunds(paid.id, tx);
}

/** Called after order reaches COMPLETED — idempotent. */
export async function syncFinanceOnOrderCompleted(
  orderId: string,
): Promise<void> {
  const row = await prisma.financeTransaction.findFirst({
    where: { orderId, type: FinanceTransactionType.SALE },
  });
  if (!row) return;

  if (row.status === FinanceTransactionStatus.RELEASED) return;

  await prisma.$transaction(async (tx) => {
    await releaseFunds(row.id, tx);
  });

  void trackServerEvent({
    event: ANALYTICS_EVENTS.PAYMENT_RELEASED,
    route: `${ROUTES.ORDERS}/${orderId}`,
    entityId: orderId,
  });
}

export async function trackFinanceTransactionCreated(orderId: string) {
  void trackServerEvent({
    event: ANALYTICS_EVENTS.TRANSACTION_CREATED,
    route: `${ROUTES.ORDERS}/${orderId}`,
    entityId: orderId,
  });
  void trackServerEvent({
    event: ANALYTICS_EVENTS.PAYMENT_HELD,
    route: `${ROUTES.ORDERS}/${orderId}`,
    entityId: orderId,
  });
}

export async function getAdminFinanceDashboard(): Promise<AdminFinanceDashboard> {
  const [transactions, disputes] = await Promise.all([
    prisma.financeTransaction.findMany({
      include: {
        order: { select: { orderNumber: true } },
        seller: { select: { storeName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.dispute.count({
      where: {
        status: { in: ["OPEN", "UNDER_REVIEW"] },
      },
    }),
  ]);

  const rows: AdminFinanceRow[] = transactions.map((t) => ({
    transactionId: t.id,
    orderId: t.orderId,
    orderNumber: t.order.orderNumber,
    sellerName: t.seller.storeName,
    grossAmount: toPriceNumber(t.grossAmount),
    commissionAmount: toPriceNumber(t.commissionAmount),
    sellerAmount: toPriceNumber(t.sellerAmount),
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  const turnover = rows.reduce((sum, r) => sum + r.grossAmount, 0);
  const commissionTotal = rows.reduce(
    (sum, r) => sum + r.commissionAmount,
    0,
  );
  const pendingCount = rows.filter(
    (r) =>
      r.status === FinanceTransactionStatus.PENDING ||
      r.status === FinanceTransactionStatus.PAID ||
      r.status === FinanceTransactionStatus.HELD,
  ).length;

  return {
    turnover,
    commissionTotal,
    pendingCount,
    disputeCount: disputes,
    rows,
  };
}

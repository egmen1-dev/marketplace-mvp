import { PayoutRequestStatus } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { getSellerBalance } from "@/lib/finance/balance";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

import { isSellerPayoutEnabled } from "./flags";
import {
  countPendingPayoutRequests,
  sumActivePayoutObligations,
  sumPaidToday,
} from "./lifecycle";
import { listSellerPaymentMethods } from "./methods";
import { listSellerPayoutRequests, mapPayoutRequestRow } from "./requests";
import type {
  AdminPayoutDashboard,
  AdminPayoutQueueRow,
  AdminPayoutRequestDetail,
  SellerPayoutDashboard,
} from "./types";
import { payoutDisplayNumber, payoutStatusLabel } from "./types";

export async function getSellerPayoutDashboard(
  sellerId: string,
): Promise<SellerPayoutDashboard> {
  if (!isSellerPayoutEnabled()) {
    return {
      enabled: false,
      balance: {
        pendingAmount: 0,
        availableAmount: 0,
        paidAmount: 0,
        reservedForPayoutAmount: 0,
      },
      methods: [],
      requests: [],
      history: [],
    };
  }

  const [balance, methods, requests] = await Promise.all([
    getSellerBalance(sellerId),
    listSellerPaymentMethods(sellerId),
    listSellerPayoutRequests(sellerId),
  ]);

  const activeStatuses: PayoutRequestStatus[] = [
    PayoutRequestStatus.REQUESTED,
    PayoutRequestStatus.UNDER_REVIEW,
    PayoutRequestStatus.APPROVED,
    PayoutRequestStatus.PROCESSING,
  ];
  const active = requests.filter((r) => activeStatuses.includes(r.status));

  return {
    enabled: true,
    balance: {
      pendingAmount: balance.pendingAmount,
      availableAmount: balance.availableAmount,
      paidAmount: balance.paidAmount,
      reservedForPayoutAmount: balance.reservedForPayoutAmount,
    },
    methods,
    requests: active,
    history: requests,
  };
}

export async function getAdminPayoutDashboard(): Promise<AdminPayoutDashboard> {
  if (!isSellerPayoutEnabled()) {
    return {
      enabled: false,
      pendingCount: 0,
      totalObligations: 0,
      activeCount: 0,
      paidToday: 0,
      queue: [],
    };
  }

  const [pendingCount, totalObligations, paidToday, rows] = await Promise.all([
    countPendingPayoutRequests(),
    sumActivePayoutObligations(),
    sumPaidToday(),
    prisma.payoutRequest.findMany({
      where: {
        status: {
          in: [
            PayoutRequestStatus.REQUESTED,
            PayoutRequestStatus.UNDER_REVIEW,
            PayoutRequestStatus.APPROVED,
            PayoutRequestStatus.PROCESSING,
          ],
        },
      },
      orderBy: { requestedAt: "asc" },
      take: 50,
      include: {
        paymentMethod: { select: { label: true, detailsReference: true } },
        seller: { select: { id: true, storeName: true } },
      },
    }),
  ]);

  const queue: AdminPayoutQueueRow[] = rows.map((row) => ({
    requestId: row.id,
    displayNumber: payoutDisplayNumber(row.id),
    sellerId: row.sellerId,
    sellerName: row.seller.storeName,
    amount: toPriceNumber(row.amount),
    requestedAt: row.requestedAt.toISOString(),
    status: row.status,
    statusLabel: payoutStatusLabel(row.status),
    paymentMethodLabel: row.paymentMethod.label,
    paymentMethodReference: row.paymentMethod.detailsReference,
  }));

  return {
    enabled: true,
    pendingCount,
    totalObligations,
    activeCount: queue.length,
    paidToday,
    queue,
  };
}

export async function getAdminPayoutRequestDetail(
  requestId: string,
): Promise<AdminPayoutRequestDetail | null> {
  if (!isSellerPayoutEnabled()) return null;

  const row = await prisma.payoutRequest.findUnique({
    where: { id: requestId },
    include: {
      paymentMethod: { select: { label: true, detailsReference: true } },
      seller: { select: { storeName: true } },
    },
  });
  if (!row) return null;

  const balance = await getSellerBalance(row.sellerId);
  const history = await listSellerPayoutRequests(row.sellerId);

  return {
    request: mapPayoutRequestRow(row),
    sellerName: row.seller.storeName,
    availableBalance: balance.availableAmount,
    payoutHistory: history.filter((h) => h.id !== row.id).slice(0, 5),
  };
}

export async function getSellerPayoutBalanceSummary(sellerId: string) {
  const balance = await getSellerBalance(sellerId);
  return {
    pendingAmount: balance.pendingAmount,
    availableAmount: balance.availableAmount,
    paidAmount: balance.paidAmount,
    reservedForPayoutAmount: balance.reservedForPayoutAmount,
    payoutHref: ROUTES.ACCOUNT_PAYOUTS,
  };
}

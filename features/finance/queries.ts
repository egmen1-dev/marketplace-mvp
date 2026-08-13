import {
  FinanceTransactionStatus,
  FinanceTransactionType,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

export type SellerBalanceView = {
  pendingAmount: number;
  availableAmount: number;
  currency: string;
  transactions: Array<{
    id: string;
    orderId: string;
    type: string;
    status: string;
    grossAmount: number;
    commissionAmount: number;
    sellerAmount: number;
    createdAt: Date;
  }>;
};

export async function getSellerBalanceView(
  sellerId: string,
): Promise<SellerBalanceView> {
  const [balance, transactions] = await Promise.all([
    prisma.sellerBalance.findUnique({ where: { sellerId } }),
    prisma.financeTransaction.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    pendingAmount: toPriceNumber(balance?.pendingAmount),
    availableAmount: toPriceNumber(balance?.availableAmount),
    currency: balance?.currency ?? "RUB",
    transactions: transactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      type: t.type,
      status: t.status,
      grossAmount: toPriceNumber(t.grossAmount),
      commissionAmount: toPriceNumber(t.commissionAmount),
      sellerAmount: toPriceNumber(t.sellerAmount),
      createdAt: t.createdAt,
    })),
  };
}

export type AdminFinanceDashboard = {
  successfulPayments: number;
  paymentsVolume: number;
  commissionRevenue: number;
  pendingSellerFunds: number;
  availableSellerFunds: number;
  recentSales: Array<{
    id: string;
    orderId: string;
    sellerId: string;
    storeName: string;
    grossAmount: number;
    commissionAmount: number;
    sellerAmount: number;
    status: string;
    createdAt: Date;
  }>;
};

export async function getAdminFinanceDashboard(): Promise<AdminFinanceDashboard> {
  const [succeededAgg, sales, balances] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED" },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.financeTransaction.findMany({
      where: { type: FinanceTransactionType.SALE },
      include: { seller: { select: { storeName: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.sellerBalance.findMany(),
  ]);

  let commissionRevenue = 0;
  for (const s of sales) {
    commissionRevenue += toPriceNumber(s.commissionAmount);
  }

  let pendingSellerFunds = 0;
  let availableSellerFunds = 0;
  for (const b of balances) {
    pendingSellerFunds += toPriceNumber(b.pendingAmount);
    availableSellerFunds += toPriceNumber(b.availableAmount);
  }

  return {
    successfulPayments: succeededAgg._count,
    paymentsVolume: toPriceNumber(succeededAgg._sum.amount),
    commissionRevenue,
    pendingSellerFunds,
    availableSellerFunds,
    recentSales: sales.map((s) => ({
      id: s.id,
      orderId: s.orderId,
      sellerId: s.sellerId,
      storeName: s.seller.storeName,
      grossAmount: toPriceNumber(s.grossAmount),
      commissionAmount: toPriceNumber(s.commissionAmount),
      sellerAmount: toPriceNumber(s.sellerAmount),
      status: s.status,
      createdAt: s.createdAt,
    })),
  };
}

export { FinanceTransactionStatus, FinanceTransactionType };

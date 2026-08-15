import type { Prisma, WalletLedgerDirection, WalletLedgerType } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { getSellerBalance } from "@/lib/finance";
import { prisma } from "@/lib/prisma";

import { computeWalletBuckets } from "./buckets";
import { isLotWalletEnabled } from "./flags";
import type {
  WalletHistoryFilter,
  WalletLedgerItem,
  WalletOverview,
} from "./types";

type Tx = Prisma.TransactionClient;

function mapEntry(row: {
  id: string;
  type: WalletLedgerType;
  direction: WalletLedgerDirection;
  amount: Prisma.Decimal;
  title: string;
  subtitle: string | null;
  createdAt: Date;
}): WalletLedgerItem {
  return {
    id: row.id,
    type: row.type,
    direction: row.direction,
    amount: toPriceNumber(row.amount),
    title: row.title,
    subtitle: row.subtitle,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrCreateUserWallet(userId: string, tx: Tx = prisma) {
  return tx.userWallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getWalletOverview(input: {
  userId: string;
  sellerProfileId: string | null;
}): Promise<WalletOverview> {
  if (!isLotWalletEnabled()) {
    return {
      enabled: false,
      buckets: computeWalletBuckets({ sellerBalance: null, userWallet: null }),
      recentEntries: [],
    };
  }

  const [userWallet, sellerBalance, recentRows] = await Promise.all([
    getOrCreateUserWallet(input.userId),
    input.sellerProfileId
      ? getSellerBalance(input.sellerProfileId)
      : Promise.resolve(null),
    prisma.walletLedgerEntry.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    enabled: true,
    buckets: computeWalletBuckets({
      sellerBalance,
      userWallet: {
        topupSpendableAmount: toPriceNumber(userWallet.topupSpendableAmount),
        bonusSpendableAmount: toPriceNumber(userWallet.bonusSpendableAmount),
      },
    }),
    recentEntries: recentRows.map(mapEntry),
  };
}

const FILTER_TYPES: Record<WalletHistoryFilter, WalletLedgerType[] | null> = {
  all: null,
  topups: ["BUYER_TOP_UP"],
  purchases: ["PRODUCT_PURCHASE", "INTERNAL_SERVICE_PURCHASE"],
  sales: ["SELLER_SALE"],
  promotion: ["PROMOTION_PURCHASE"],
  payouts: ["PAYOUT_REQUEST", "PAYOUT_COMPLETED", "PAYOUT_REVERSED"],
  bonuses: ["BONUS_CREDIT"],
};

export async function listWalletHistory(input: {
  userId: string;
  filter: WalletHistoryFilter;
  limit?: number;
}): Promise<WalletLedgerItem[]> {
  const types = FILTER_TYPES[input.filter];
  const rows = await prisma.walletLedgerEntry.findMany({
    where: {
      userId: input.userId,
      ...(types ? { type: { in: types } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 50,
  });
  return rows.map(mapEntry);
}

export async function hasWalletLedgerIdempotencyKey(
  idempotencyKey: string,
  tx: Tx = prisma,
): Promise<boolean> {
  const existing = await tx.walletLedgerEntry.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function appendWalletLedgerEntry(
  input: {
    userId: string;
    type: WalletLedgerType;
    direction: WalletLedgerDirection;
    amount: number;
    spendableDelta: number;
    withdrawableDelta: number;
    title: string;
    subtitle?: string;
    referenceType?: string;
    referenceId?: string;
    idempotencyKey?: string;
  },
  tx: Tx = prisma,
): Promise<boolean> {
  if (input.idempotencyKey) {
    const existing = await tx.walletLedgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return false;
  }

  await tx.walletLedgerEntry.create({
    data: {
      userId: input.userId,
      type: input.type,
      direction: input.direction,
      amount: input.amount,
      spendableDelta: input.spendableDelta,
      withdrawableDelta: input.withdrawableDelta,
      title: input.title,
      subtitle: input.subtitle,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
    },
  });
  return true;
}

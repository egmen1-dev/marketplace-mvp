import { Prisma } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import type { SellerBalanceDto } from "@/lib/finance/types";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

function mapBalance(row: {
  sellerId: string;
  pendingAmount: Prisma.Decimal;
  availableAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  updatedAt: Date;
}): SellerBalanceDto {
  return {
    sellerId: row.sellerId,
    pendingAmount: toPriceNumber(row.pendingAmount),
    availableAmount: toPriceNumber(row.availableAmount),
    paidAmount: toPriceNumber(row.paidAmount),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateSellerBalance(
  sellerId: string,
  tx: Tx,
): Promise<SellerBalanceDto> {
  const row = await tx.sellerBalance.upsert({
    where: { sellerId },
    create: { sellerId },
    update: {},
  });
  return mapBalance(row);
}

export async function addPendingBalance(
  sellerId: string,
  amount: number,
  tx: Tx,
): Promise<void> {
  await getOrCreateSellerBalance(sellerId, tx);
  await tx.sellerBalance.update({
    where: { sellerId },
    data: {
      pendingAmount: { increment: amount },
    },
  });
}

export async function releasePendingToAvailable(
  sellerId: string,
  amount: number,
  tx: Tx,
): Promise<void> {
  await getOrCreateSellerBalance(sellerId, tx);
  await tx.sellerBalance.update({
    where: { sellerId },
    data: {
      pendingAmount: { decrement: amount },
      availableAmount: { increment: amount },
    },
  });
}

export async function reversePendingBalance(
  sellerId: string,
  amount: number,
  tx: Tx,
): Promise<void> {
  await getOrCreateSellerBalance(sellerId, tx);
  await tx.sellerBalance.update({
    where: { sellerId },
    data: {
      pendingAmount: { decrement: amount },
    },
  });
}

export async function reverseAvailableBalance(
  sellerId: string,
  amount: number,
  tx: Tx,
): Promise<void> {
  await getOrCreateSellerBalance(sellerId, tx);
  await tx.sellerBalance.update({
    where: { sellerId },
    data: {
      availableAmount: { decrement: amount },
    },
  });
}

export async function getSellerBalance(
  sellerId: string,
): Promise<SellerBalanceDto> {
  const row = await prisma.sellerBalance.findUnique({ where: { sellerId } });
  if (!row) {
    return {
      sellerId,
      pendingAmount: 0,
      availableAmount: 0,
      paidAmount: 0,
      updatedAt: new Date().toISOString(),
    };
  }
  return mapBalance(row);
}

import {
  DisputeStatus,
  FinanceTransactionStatus,
  FinanceTransactionType,
  Prisma,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { executeFinancialTransaction } from "@/lib/financial-transaction-engine";
import { verifySellerBalanceNonNegativeInTx } from "@/lib/financial-transaction-engine/verification";
import {
  addPendingBalance,
  releasePendingToAvailable,
  reverseAvailableBalance,
  reversePendingBalance,
} from "@/lib/finance/balance";
import { calculateCommissionForOrder } from "@/lib/finance/commission";
import { FinanceError } from "@/lib/finance/errors";
import type { DisputeDto, FinanceTransactionDto } from "@/lib/finance/types";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

function mapTransaction(row: {
  id: string;
  orderId: string;
  buyerId: string | null;
  sellerId: string;
  grossAmount: Prisma.Decimal;
  commissionAmount: Prisma.Decimal;
  sellerAmount: Prisma.Decimal;
  status: FinanceTransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}): FinanceTransactionDto {
  return {
    id: row.id,
    orderId: row.orderId,
    buyerId: row.buyerId ?? "",
    sellerId: row.sellerId,
    grossAmount: toPriceNumber(row.grossAmount),
    commissionAmount: toPriceNumber(row.commissionAmount),
    sellerAmount: toPriceNumber(row.sellerAmount),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createTransaction(
  orderId: string,
  tx: Tx = prisma,
): Promise<FinanceTransactionDto> {
  const split = await calculateCommissionForOrder(orderId, tx);

  const existing = await tx.financeTransaction.findFirst({
    where: {
      orderId,
      sellerId: split.sellerId,
      type: FinanceTransactionType.SALE,
    },
  });
  if (existing) {
    return mapTransaction(existing);
  }

  const row = await tx.financeTransaction.create({
    data: {
      orderId,
      buyerId: split.buyerId,
      sellerId: split.sellerId,
      type: FinanceTransactionType.SALE,
      grossAmount: new Prisma.Decimal(split.grossAmount.toFixed(2)),
      commissionAmount: new Prisma.Decimal(split.commissionAmount.toFixed(2)),
      sellerAmount: new Prisma.Decimal(split.sellerAmount.toFixed(2)),
      currency: "RUB",
      commissionBps: Math.round(split.commissionPercent * 100),
      status: FinanceTransactionStatus.PENDING,
    },
  });

  return mapTransaction(row);
}

export async function markPaid(
  transactionId: string,
  tx: Tx = prisma,
): Promise<FinanceTransactionDto> {
  const row = await tx.financeTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!row) {
    throw new FinanceError("NOT_FOUND", "Транзакция не найдена");
  }
  if (row.status !== FinanceTransactionStatus.PENDING) {
    return mapTransaction(row);
  }

  const updated = await tx.financeTransaction.update({
    where: { id: transactionId },
    data: { status: FinanceTransactionStatus.PAID },
  });
  return mapTransaction(updated);
}

export async function holdFundsInTx(
  transactionId: string,
  tx: Tx,
): Promise<FinanceTransactionDto> {
  const row = await tx.financeTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!row) {
    throw new FinanceError("NOT_FOUND", "Транзакция не найдена");
  }
  if (
    row.status === FinanceTransactionStatus.HELD ||
    row.status === FinanceTransactionStatus.RELEASED
  ) {
    return mapTransaction(row);
  }
  if (row.status !== FinanceTransactionStatus.PAID) {
    throw new FinanceError(
      "INVALID_STATE",
      `Нельзя удержать средства из статуса ${row.status}`,
    );
  }

  const sellerAmount = toPriceNumber(row.sellerAmount);
  await addPendingBalance(row.sellerId, sellerAmount, tx);

  const updated = await tx.financeTransaction.update({
    where: { id: transactionId },
    data: { status: FinanceTransactionStatus.HELD },
  });
  return mapTransaction(updated);
}

export async function holdFunds(
  transactionId: string,
  tx: Tx = prisma,
): Promise<FinanceTransactionDto> {
  if (tx !== prisma) {
    return holdFundsInTx(transactionId, tx);
  }

  const row = await prisma.financeTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!row) {
    throw new FinanceError("NOT_FOUND", "Транзакция не найдена");
  }

  const result = await executeFinancialTransaction(
    {
      operationType: "SELLER_HOLD",
      idempotencyKey: `hold:${transactionId}`,
      sellerId: row.sellerId,
      orderId: row.orderId,
      referenceType: "FINANCE_TRANSACTION",
      referenceId: transactionId,
      amountRub: toPriceNumber(row.sellerAmount),
    },
    {
      lock: async (lockTx) => {
        await lockTx.financeTransaction.findUnique({
          where: { id: transactionId },
        });
      },
      execute: async (execTx) => holdFundsInTx(transactionId, execTx),
      verify: async (verifyTx) => {
        await verifySellerBalanceNonNegativeInTx(verifyTx, row.sellerId);
      },
    },
  );

  if (!result.ok) {
    throw new FinanceError("INVALID_STATE", result.error);
  }
  return result.value;
}

export async function releaseFundsInTx(
  transactionId: string,
  tx: Tx,
): Promise<FinanceTransactionDto> {
  const row = await tx.financeTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!row) {
    throw new FinanceError("NOT_FOUND", "Транзакция не найдена");
  }
  if (row.status === FinanceTransactionStatus.RELEASED) {
    return mapTransaction(row);
  }
  if (row.status !== FinanceTransactionStatus.HELD) {
    throw new FinanceError(
      "INVALID_STATE",
      `Нельзя выпустить средства из статуса ${row.status}`,
    );
  }

  const sellerAmount = toPriceNumber(row.sellerAmount);
  await releasePendingToAvailable(row.sellerId, sellerAmount, tx);

  const updated = await tx.financeTransaction.update({
    where: { id: transactionId },
    data: { status: FinanceTransactionStatus.RELEASED },
  });
  return mapTransaction(updated);
}

export async function releaseFunds(
  transactionId: string,
  tx: Tx = prisma,
): Promise<FinanceTransactionDto> {
  if (tx !== prisma) {
    return releaseFundsInTx(transactionId, tx);
  }

  const row = await prisma.financeTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!row) {
    throw new FinanceError("NOT_FOUND", "Транзакция не найдена");
  }

  const result = await executeFinancialTransaction(
    {
      operationType: "SELLER_RELEASE",
      idempotencyKey: `release:${transactionId}`,
      sellerId: row.sellerId,
      orderId: row.orderId,
      referenceType: "FINANCE_TRANSACTION",
      referenceId: transactionId,
      amountRub: toPriceNumber(row.sellerAmount),
    },
    {
      lock: async (lockTx) => {
        await lockTx.financeTransaction.findUnique({
          where: { id: transactionId },
        });
      },
      execute: async (execTx) => releaseFundsInTx(transactionId, execTx),
      verify: async (verifyTx) => {
        await verifySellerBalanceNonNegativeInTx(verifyTx, row.sellerId);
      },
    },
  );

  if (!result.ok) {
    throw new FinanceError("INVALID_STATE", result.error);
  }
  return result.value;
}

export async function refundTransactionInTx(
  transactionId: string,
  tx: Tx,
): Promise<FinanceTransactionDto> {
  const row = await tx.financeTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!row) {
    throw new FinanceError("NOT_FOUND", "Транзакция не найдена");
  }
  if (row.status === FinanceTransactionStatus.REFUNDED) {
    return mapTransaction(row);
  }

  const sellerAmount = toPriceNumber(row.sellerAmount);

  if (row.status === FinanceTransactionStatus.HELD) {
    await reversePendingBalance(row.sellerId, sellerAmount, tx);
  } else if (row.status === FinanceTransactionStatus.RELEASED) {
    await reverseAvailableBalance(row.sellerId, sellerAmount, tx);
  }

  const updated = await tx.financeTransaction.update({
    where: { id: transactionId },
    data: { status: FinanceTransactionStatus.REFUNDED },
  });
  return mapTransaction(updated);
}

export async function refundTransaction(
  transactionId: string,
  tx: Tx = prisma,
): Promise<FinanceTransactionDto> {
  if (tx !== prisma) {
    return refundTransactionInTx(transactionId, tx);
  }

  const row = await prisma.financeTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!row) {
    throw new FinanceError("NOT_FOUND", "Транзакция не найдена");
  }

  const result = await executeFinancialTransaction(
    {
      operationType: "REFUND",
      idempotencyKey: `refund:${transactionId}`,
      sellerId: row.sellerId,
      orderId: row.orderId,
      referenceType: "FINANCE_TRANSACTION",
      referenceId: transactionId,
      amountRub: toPriceNumber(row.sellerAmount),
    },
    {
      lock: async (lockTx) => {
        await lockTx.financeTransaction.findUnique({
          where: { id: transactionId },
        });
      },
      execute: async (execTx) => refundTransactionInTx(transactionId, execTx),
      verify: async (verifyTx) => {
        await verifySellerBalanceNonNegativeInTx(verifyTx, row.sellerId);
      },
    },
  );

  if (!result.ok) {
    throw new FinanceError("INVALID_STATE", result.error);
  }
  return result.value;
}

export async function createDispute(input: {
  orderId: string;
  openedBy: string;
  reason: string;
}): Promise<DisputeDto> {
  const row = await prisma.dispute.create({
    data: {
      orderId: input.orderId,
      openedBy: input.openedBy,
      reason: input.reason,
      status: DisputeStatus.OPEN,
    },
  });

  await prisma.financeTransaction.updateMany({
    where: {
      orderId: input.orderId,
      status: {
        in: [
          FinanceTransactionStatus.PAID,
          FinanceTransactionStatus.HELD,
          FinanceTransactionStatus.RELEASED,
        ],
      },
    },
    data: { status: FinanceTransactionStatus.DISPUTED },
  });

  const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");
  const { trackServerEvent } = await import("@/lib/analytics/track-server");
  const { ROUTES } = await import("@/lib/constants");
  void trackServerEvent({
    event: ANALYTICS_EVENTS.DISPUTE_CREATED,
    route: `${ROUTES.ORDERS}/${input.orderId}`,
    entityId: input.orderId,
  });

  return {
    id: row.id,
    orderId: row.orderId,
    openedBy: row.openedBy,
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getTransactionByOrderId(
  orderId: string,
): Promise<FinanceTransactionDto | null> {
  const row = await prisma.financeTransaction.findFirst({
    where: { orderId, type: FinanceTransactionType.SALE },
  });
  return row ? mapTransaction(row) : null;
}

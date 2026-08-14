import {
  PayoutRequestStatus,
  PayoutTransactionStatus,
  Prisma,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { getOrCreateSellerBalance } from "@/lib/finance/balance";
import { prisma } from "@/lib/prisma";

import { mapPayoutRequestRow } from "./requests";
import type { PayoutRequestDto } from "./types";

type Tx = Prisma.TransactionClient;

export class PayoutBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayoutBalanceError";
  }
}

export class PayoutLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayoutLifecycleError";
  }
}

const ACTIVE_STATUSES: PayoutRequestStatus[] = [
  PayoutRequestStatus.REQUESTED,
  PayoutRequestStatus.UNDER_REVIEW,
  PayoutRequestStatus.APPROVED,
  PayoutRequestStatus.PROCESSING,
];

export async function reserveAvailableForPayout(
  sellerId: string,
  amount: number,
  tx: Tx,
): Promise<void> {
  await getOrCreateSellerBalance(sellerId, tx);
  const row = await tx.sellerBalance.findUniqueOrThrow({ where: { sellerId } });
  const available = toPriceNumber(row.availableAmount);
  if (amount > available) {
    throw new PayoutBalanceError("Недостаточно доступных средств");
  }
  await tx.sellerBalance.update({
    where: { sellerId },
    data: {
      availableAmount: { decrement: amount },
      reservedForPayoutAmount: { increment: amount },
    },
  });
}

export async function releaseReservedToAvailable(
  sellerId: string,
  amount: number,
  tx: Tx,
): Promise<void> {
  await getOrCreateSellerBalance(sellerId, tx);
  await tx.sellerBalance.update({
    where: { sellerId },
    data: {
      reservedForPayoutAmount: { decrement: amount },
      availableAmount: { increment: amount },
    },
  });
}

export async function completeReservedPayout(
  sellerId: string,
  amount: number,
  tx: Tx,
): Promise<void> {
  await getOrCreateSellerBalance(sellerId, tx);
  await tx.sellerBalance.update({
    where: { sellerId },
    data: {
      reservedForPayoutAmount: { decrement: amount },
      paidAmount: { increment: amount },
    },
  });
}

export async function setSellerAvailableBalanceForE2E(
  sellerId: string,
  availableAmount: number,
): Promise<void> {
  await prisma.sellerBalance.upsert({
    where: { sellerId },
    create: { sellerId, availableAmount },
    update: { availableAmount },
  });
}

async function getRequestOrThrow(requestId: string) {
  const row = await prisma.payoutRequest.findUnique({
    where: { id: requestId },
    include: {
      paymentMethod: { select: { label: true, detailsReference: true } },
    },
  });
  if (!row) throw new PayoutLifecycleError("Заявка не найдена");
  return row;
}

export async function approvePayoutRequest(requestId: string): Promise<PayoutRequestDto> {
  const row = await getRequestOrThrow(requestId);
  if (
    row.status !== PayoutRequestStatus.REQUESTED &&
    row.status !== PayoutRequestStatus.UNDER_REVIEW
  ) {
    throw new PayoutLifecycleError("Заявку нельзя одобрить в текущем статусе");
  }

  const updated = await prisma.payoutRequest.update({
    where: { id: requestId },
    data: {
      status: PayoutRequestStatus.APPROVED,
      approvedAt: new Date(),
    },
    include: {
      paymentMethod: { select: { label: true, detailsReference: true } },
    },
  });
  return mapPayoutRequestRow(updated);
}

export async function rejectPayoutRequest(input: {
  requestId: string;
  adminNote?: string;
}): Promise<PayoutRequestDto> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.payoutRequest.findUnique({
      where: { id: input.requestId },
      include: {
        paymentMethod: { select: { label: true, detailsReference: true } },
      },
    });
    if (!row) throw new PayoutLifecycleError("Заявка не найдена");
    if (row.status === PayoutRequestStatus.COMPLETED) {
      throw new PayoutLifecycleError("Выплаченную заявку нельзя отклонить");
    }
    if (row.status === PayoutRequestStatus.REJECTED) {
      throw new PayoutLifecycleError("Заявка уже отклонена");
    }
    if (row.status === PayoutRequestStatus.CANCELLED) {
      throw new PayoutLifecycleError("Заявка отменена продавцом");
    }

    const amount = toPriceNumber(row.amount);
    if (ACTIVE_STATUSES.includes(row.status)) {
      await releaseReservedToAvailable(row.sellerId, amount, tx);
    }

    const updated = await tx.payoutRequest.update({
      where: { id: row.id },
      data: {
        status: PayoutRequestStatus.REJECTED,
        rejectedAt: new Date(),
        adminNote: input.adminNote?.trim() || row.adminNote,
      },
      include: {
        paymentMethod: { select: { label: true, detailsReference: true } },
      },
    });
    return mapPayoutRequestRow(updated);
  });
}

export async function markPayoutProcessing(requestId: string): Promise<PayoutRequestDto> {
  const row = await getRequestOrThrow(requestId);
  if (row.status !== PayoutRequestStatus.APPROVED) {
    throw new PayoutLifecycleError("Обработку можно начать только для одобренной заявки");
  }

  const updated = await prisma.payoutRequest.update({
    where: { id: requestId },
    data: {
      status: PayoutRequestStatus.PROCESSING,
      processingAt: new Date(),
    },
    include: {
      paymentMethod: { select: { label: true, detailsReference: true } },
    },
  });
  return mapPayoutRequestRow(updated);
}

export async function markPayoutCompleted(input: {
  requestId: string;
  externalReference?: string;
}): Promise<PayoutRequestDto> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.payoutRequest.findUnique({
      where: { id: input.requestId },
      include: {
        paymentMethod: { select: { label: true, detailsReference: true } },
      },
    });
    if (!row) throw new PayoutLifecycleError("Заявка не найдена");
    if (
      row.status !== PayoutRequestStatus.APPROVED &&
      row.status !== PayoutRequestStatus.PROCESSING
    ) {
      throw new PayoutLifecycleError("Завершить можно только одобренную или обрабатываемую заявку");
    }

    const amount = toPriceNumber(row.amount);
    await completeReservedPayout(row.sellerId, amount, tx);

    await tx.payoutTransaction.create({
      data: {
        payoutRequestId: row.id,
        sellerId: row.sellerId,
        amount: row.amount,
        status: PayoutTransactionStatus.COMPLETED,
        externalReference: input.externalReference?.trim() || null,
        completedAt: new Date(),
      },
    });

    const updated = await tx.payoutRequest.update({
      where: { id: row.id },
      data: {
        status: PayoutRequestStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        paymentMethod: { select: { label: true, detailsReference: true } },
      },
    });

    return mapPayoutRequestRow(updated);
  });
}

export async function sumActivePayoutObligations(): Promise<number> {
  const agg = await prisma.payoutRequest.aggregate({
    where: { status: { in: ACTIVE_STATUSES } },
    _sum: { amount: true },
  });
  return agg._sum.amount ? toPriceNumber(agg._sum.amount) : 0;
}

export async function countPendingPayoutRequests(): Promise<number> {
  return prisma.payoutRequest.count({
    where: {
      status: {
        in: [PayoutRequestStatus.REQUESTED, PayoutRequestStatus.UNDER_REVIEW],
      },
    },
  });
}

export async function sumPaidToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const agg = await prisma.payoutRequest.aggregate({
    where: {
      status: PayoutRequestStatus.COMPLETED,
      completedAt: { gte: start },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ? toPriceNumber(agg._sum.amount) : 0;
}

import { PayoutRequestStatus, Prisma } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

import { assertPaymentMethodOwned } from "./methods";
import {
  PayoutBalanceError,
  releaseReservedToAvailable,
  reserveAvailableForPayout,
} from "./lifecycle";
import { MIN_PAYOUT_AMOUNT } from "./types";
import type { PayoutRequestDto } from "./types";
import { payoutDisplayNumber, payoutStatusLabel } from "./types";

function mapRequest(row: {
  id: string;
  sellerId: string;
  amount: Prisma.Decimal;
  status: PayoutRequestStatus;
  paymentMethodId: string;
  requestedAt: Date;
  approvedAt: Date | null;
  processingAt: Date | null;
  completedAt: Date | null;
  rejectedAt: Date | null;
  adminNote: string | null;
  paymentMethod: {
    label: string;
    detailsReference: string;
  };
}): PayoutRequestDto {
  return {
    id: row.id,
    displayNumber: payoutDisplayNumber(row.id),
    sellerId: row.sellerId,
    amount: toPriceNumber(row.amount),
    status: row.status,
    statusLabel: payoutStatusLabel(row.status),
    paymentMethodId: row.paymentMethodId,
    paymentMethodLabel: row.paymentMethod.label,
    paymentMethodReference: row.paymentMethod.detailsReference,
    requestedAt: row.requestedAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    processingAt: row.processingAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    adminNote: row.adminNote,
  };
}

export function validatePayoutAmount(input: {
  amount: number;
  availableAmount: number;
}): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Укажите сумму больше 0";
  }
  if (input.amount < MIN_PAYOUT_AMOUNT) {
    return `Минимальная сумма вывода — ${MIN_PAYOUT_AMOUNT} ₽`;
  }
  if (input.amount > input.availableAmount) {
    return "Сумма превышает доступный баланс";
  }
  return null;
}

export async function createPayoutRequest(input: {
  sellerId: string;
  amount: number;
  paymentMethodId: string;
}): Promise<PayoutRequestDto> {
  await assertPaymentMethodOwned(input.sellerId, input.paymentMethodId);

  const balance = await prisma.sellerBalance.findUnique({
    where: { sellerId: input.sellerId },
  });
  const availableAmount = balance ? toPriceNumber(balance.availableAmount) : 0;
  const validationError = validatePayoutAmount({
    amount: input.amount,
    availableAmount,
  });
  if (validationError) {
    throw new PayoutBalanceError(validationError);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await reserveAvailableForPayout(input.sellerId, input.amount, tx);

      const row = await tx.payoutRequest.create({
        data: {
          sellerId: input.sellerId,
          amount: input.amount,
          paymentMethodId: input.paymentMethodId,
          status: PayoutRequestStatus.UNDER_REVIEW,
          requestedAt: new Date(),
        },
        include: {
          paymentMethod: {
            select: { label: true, detailsReference: true },
          },
        },
      });

      return mapRequest(row);
    });
  } catch (err) {
    if (err instanceof PayoutBalanceError) throw err;
    throw err;
  }
}

export async function cancelPayoutRequest(input: {
  sellerId: string;
  requestId: string;
}): Promise<PayoutRequestDto> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.payoutRequest.findFirst({
      where: { id: input.requestId, sellerId: input.sellerId },
      include: {
        paymentMethod: { select: { label: true, detailsReference: true } },
      },
    });
    if (!row) throw new Error("Заявка не найдена");
    if (
      row.status !== PayoutRequestStatus.REQUESTED &&
      row.status !== PayoutRequestStatus.UNDER_REVIEW
    ) {
      throw new PayoutBalanceError("Заявку нельзя отменить в текущем статусе");
    }

    const amount = toPriceNumber(row.amount);
    await releaseReservedToAvailable(input.sellerId, amount, tx);

    const updated = await tx.payoutRequest.update({
      where: { id: row.id },
      data: { status: PayoutRequestStatus.CANCELLED },
      include: {
        paymentMethod: { select: { label: true, detailsReference: true } },
      },
    });

    return mapRequest(updated);
  });
}

export async function listSellerPayoutRequests(
  sellerId: string,
): Promise<PayoutRequestDto[]> {
  const rows = await prisma.payoutRequest.findMany({
    where: { sellerId },
    orderBy: { requestedAt: "desc" },
    include: {
      paymentMethod: { select: { label: true, detailsReference: true } },
    },
  });
  return rows.map(mapRequest);
}

export { mapRequest as mapPayoutRequestRow };

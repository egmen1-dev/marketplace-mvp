import type { SellerPaymentMethodType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { assertSellerOwnsPayoutResource } from "./permissions";
import type { SellerPaymentMethodDto } from "./types";
import { paymentMethodTypeLabel } from "./types";

function mapMethod(row: {
  id: string;
  sellerId: string;
  type: SellerPaymentMethodType;
  label: string;
  detailsReference: string;
  verified: boolean;
  createdAt: Date;
}): SellerPaymentMethodDto {
  return {
    id: row.id,
    sellerId: row.sellerId,
    type: row.type,
    label: row.label,
    detailsReference: row.detailsReference,
    verified: row.verified,
    createdAt: row.createdAt.toISOString(),
  };
}

export function maskPaymentReference(input: string): string {
  const trimmed = input.replace(/\s/g, "");
  if (trimmed.length <= 4) return `****${trimmed}`;
  return `****${trimmed.slice(-4)}`;
}

export async function listSellerPaymentMethods(
  sellerId: string,
): Promise<SellerPaymentMethodDto[]> {
  const rows = await prisma.sellerPaymentMethod.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapMethod);
}

export async function getSellerPaymentMethod(
  sellerId: string,
  methodId: string,
): Promise<SellerPaymentMethodDto | null> {
  const row = await prisma.sellerPaymentMethod.findFirst({
    where: { id: methodId, sellerId },
  });
  return row ? mapMethod(row) : null;
}

export async function createSellerPaymentMethod(input: {
  sellerId: string;
  type: SellerPaymentMethodType;
  detailsReference: string;
  label?: string;
}): Promise<SellerPaymentMethodDto> {
  const reference = maskPaymentReference(input.detailsReference);
  const label =
    input.label?.trim() ||
    `${paymentMethodTypeLabel(input.type)} ${reference}`;

  const row = await prisma.sellerPaymentMethod.create({
    data: {
      sellerId: input.sellerId,
      type: input.type,
      label,
      detailsReference: reference,
      verified: false,
    },
  });
  return mapMethod(row);
}

export async function assertPaymentMethodOwned(
  sellerProfileId: string,
  paymentMethodId: string,
): Promise<SellerPaymentMethodDto> {
  const method = await prisma.sellerPaymentMethod.findUnique({
    where: { id: paymentMethodId },
  });
  if (!method) {
    throw new Error("Способ получения не найден");
  }
  assertSellerOwnsPayoutResource(sellerProfileId, method.sellerId);
  return mapMethod(method);
}

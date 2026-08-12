/**
 * Knowledge-loop foundation — store seller corrections to AI suggestions.
 * Not used for model training yet.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

export type CorrectionInput = {
  field: string;
  suggested?: string | null;
  corrected?: string | null;
  title?: string | null;
  productTypeId?: string | null;
  sellerId?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function recordUnderstandingCorrection(
  db: PrismaClient,
  input: CorrectionInput,
): Promise<void> {
  await db.productUnderstandingCorrection.create({
    data: {
      field: input.field,
      suggested: input.suggested ?? null,
      corrected: input.corrected ?? null,
      title: input.title ?? null,
      productTypeId: input.productTypeId ?? null,
      sellerId: input.sellerId ?? null,
      meta:
        input.meta != null
          ? (input.meta as Prisma.InputJsonValue)
          : undefined,
    },
  });
}

export async function listRecentCorrections(
  db: PrismaClient,
  limit = 50,
) {
  return db.productUnderstandingCorrection.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

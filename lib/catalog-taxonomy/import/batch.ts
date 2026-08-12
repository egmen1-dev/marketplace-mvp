/**
 * Persist / load import batches.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import type { ImportPlan, PlannedImportItem } from "./types";

export async function saveImportBatch(
  db: PrismaClient,
  plan: ImportPlan,
  options?: { createdBy?: string | null; persistItems?: boolean },
): Promise<{ batchId: string }> {
  const persistItems = options?.persistItems ?? true;

  const existing = await db.taxonomyImportBatch.findFirst({
    where: { hash: plan.hash, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return { batchId: existing.id };
  }

  const batch = await db.taxonomyImportBatch.create({
    data: {
      source: plan.source,
      version: plan.version,
      hash: plan.hash,
      status: "PENDING",
      statistics: plan.statistics as unknown as Prisma.InputJsonValue,
      report: {
        seoPaths: plan.seoPaths,
        itemCount: plan.items.length,
      } as unknown as Prisma.InputJsonValue,
      meta: {
        fetchedAt: plan.taxonomy.fetchedAt,
        categoryCount: plan.taxonomy.categories.length,
        productTypeCount: plan.taxonomy.productTypes.length,
        taxonomy: plan.taxonomy,
      } as unknown as Prisma.InputJsonValue,
      createdBy: options?.createdBy ?? null,
    },
  });

  if (persistItems && plan.items.length > 0) {
    // Batch insert — avoid row-by-row N+1
    const chunk = 200;
    for (let i = 0; i < plan.items.length; i += chunk) {
      await db.taxonomyImportItem.createMany({
        data: plan.items.slice(i, i + chunk).map((item) => ({
          ...toItemCreate(item),
          batchId: batch.id,
        })),
      });
    }
  }

  return { batchId: batch.id };
}

function toItemCreate(item: PlannedImportItem) {
  return {
    externalId: item.externalId,
    entityType: item.entityType,
    action: item.action,
    oldValue: (item.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
    newValue: (item.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
    confidence: item.confidence,
    status: item.status,
    reason: item.reason,
    targetId: item.targetId,
  };
}

export async function listImportBatches(db: PrismaClient, limit = 30) {
  return db.taxonomyImportBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function getImportBatch(db: PrismaClient, batchId: string) {
  return db.taxonomyImportBatch.findUnique({
    where: { id: batchId },
    include: {
      items: { orderBy: [{ action: "asc" }, { confidence: "desc" }] },
    },
  });
}

export async function setImportItemStatus(
  db: PrismaClient,
  itemId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
) {
  return db.taxonomyImportItem.update({
    where: { id: itemId },
    data: { status },
  });
}

export async function approveAllPendingSafe(
  db: PrismaClient,
  batchId: string,
) {
  const result = await db.taxonomyImportItem.updateMany({
    where: {
      batchId,
      status: "PENDING",
      action: { in: ["CREATE", "UPDATE"] },
      confidence: { gte: 0.8 },
    },
    data: { status: "APPROVED" },
  });
  return result.count;
}

export async function markBatchStatus(
  db: PrismaClient,
  batchId: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED",
) {
  return db.taxonomyImportBatch.update({
    where: { id: batchId },
    data: {
      status,
      ...(status === "APPLIED" ? { appliedAt: new Date() } : {}),
    },
  });
}

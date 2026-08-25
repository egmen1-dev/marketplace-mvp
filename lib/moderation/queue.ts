import { ModerationItemType, ModerationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { MODERATION_STUCK_THRESHOLD_HOURS } from "./config";

export async function upsertModerationQueueItem(input: {
  productId: string;
  sellerId: string;
  status: ModerationStatus;
  riskLevel: string;
  summary: string;
}): Promise<void> {
  const existing = await prisma.moderationQueueItem.findFirst({
    where: {
      type: ModerationItemType.PRODUCT,
      entityId: input.productId,
      status: {
        in: [
          ModerationStatus.PENDING_REVIEW,
          ModerationStatus.NEEDS_FIX,
          ModerationStatus.REJECTED,
          ModerationStatus.APPROVED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.moderationQueueItem.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        riskLevel: input.riskLevel,
        summary: input.summary,
      },
    });
    return;
  }

  await prisma.moderationQueueItem.create({
    data: {
      type: ModerationItemType.PRODUCT,
      entityId: input.productId,
      sellerId: input.sellerId,
      status: input.status,
      riskLevel: input.riskLevel,
      summary: input.summary,
    },
  });
}

export async function getModerationQueueCounters() {
  const threshold = new Date(Date.now() - MODERATION_STUCK_THRESHOLD_HOURS * 60 * 60 * 1000);

  const grouped = await prisma.productModeration.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: {
      status: {
        in: [
          ModerationStatus.PENDING_REVIEW,
          ModerationStatus.NEEDS_FIX,
          ModerationStatus.REJECTED,
        ],
      },
    },
  });

  const countByStatus = new Map(
    grouped.map((row) => [row.status, row._count._all]),
  );

  const pending = countByStatus.get(ModerationStatus.PENDING_REVIEW) ?? 0;
  const needsFix = countByStatus.get(ModerationStatus.NEEDS_FIX) ?? 0;
  const rejected = countByStatus.get(ModerationStatus.REJECTED) ?? 0;

  const [highRisk, overdue] = await Promise.all([
    prisma.productModeration.count({
      where: { status: ModerationStatus.PENDING_REVIEW, riskScore: { gte: 70 } },
    }),
    prisma.productModeration.count({
      where: {
        status: ModerationStatus.PENDING_REVIEW,
        submittedAt: { lt: threshold },
      },
    }),
  ]);

  return { pending, needsFix, rejected, highRisk, overdue };
}

export async function listModerationQueueItems(input?: {
  status?: ModerationStatus;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 50);
  const offset = Math.max(input?.offset ?? 0, 0);
  return prisma.moderationQueueItem.findMany({
    where: {
      type: ModerationItemType.PRODUCT,
      ...(input?.status ? { status: input.status } : {}),
    },
    orderBy: [{ riskLevel: "desc" }, { createdAt: "asc" }],
    skip: offset,
    take: limit,
    include: {
      seller: { select: { storeName: true, id: true } },
    },
  });
}

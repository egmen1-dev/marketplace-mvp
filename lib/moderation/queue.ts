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
  const [pending, needsFix, rejected, highRisk, overdue] = await Promise.all([
    prisma.productModeration.count({ where: { status: ModerationStatus.PENDING_REVIEW } }),
    prisma.productModeration.count({ where: { status: ModerationStatus.NEEDS_FIX } }),
    prisma.productModeration.count({ where: { status: ModerationStatus.REJECTED } }),
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
}) {
  const limit = input?.limit ?? 50;
  return prisma.moderationQueueItem.findMany({
    where: {
      type: ModerationItemType.PRODUCT,
      ...(input?.status ? { status: input.status } : {}),
    },
    orderBy: [{ riskLevel: "desc" }, { createdAt: "asc" }],
    take: limit,
    include: {
      seller: { select: { storeName: true, id: true } },
    },
  });
}

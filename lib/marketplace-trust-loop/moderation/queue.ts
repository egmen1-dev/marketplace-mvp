import { ModerationItemType, ModerationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { ModerationQueueSummary } from "../reviews/types";

export async function getModerationQueueSummary(): Promise<ModerationQueueSummary> {
  const [newProducts, reviews, reports, suspicious] = await Promise.all([
    prisma.moderationQueueItem.count({
      where: {
        type: ModerationItemType.PRODUCT,
        status: ModerationStatus.PENDING_REVIEW,
      },
    }),
    prisma.moderationQueueItem.count({
      where: {
        type: ModerationItemType.REVIEW,
        status: ModerationStatus.PENDING_REVIEW,
      },
    }),
    prisma.moderationQueueItem.count({
      where: { type: ModerationItemType.REPORT },
    }),
    prisma.moderationQueueItem.count({
      where: { riskLevel: "high", status: ModerationStatus.PENDING_REVIEW },
    }),
  ]);

  return { newProducts, reviews, reports, suspicious };
}

export async function listModerationQueue(limit = 20) {
  return prisma.moderationQueueItem.findMany({
    where: { status: ModerationStatus.PENDING_REVIEW },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      seller: { select: { storeName: true } },
    },
  });
}

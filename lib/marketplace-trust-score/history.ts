import type { TrustScoreEventType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { TrustScoreHistoryEntry } from "./types";

export async function recordTrustScoreHistory(input: {
  sellerId: string;
  oldScore: number;
  newScore: number;
  reason: string;
  eventType: TrustScoreEventType;
}): Promise<void> {
  if (input.oldScore === input.newScore) return;

  await prisma.trustScoreHistory.create({
    data: {
      sellerId: input.sellerId,
      oldScore: input.oldScore,
      newScore: input.newScore,
      reason: input.reason,
      eventType: input.eventType,
    },
  });
}

export async function getDailyTrustDeltaUsed(sellerId: string): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.trustScoreHistory.findMany({
    where: { sellerId, createdAt: { gte: since } },
    select: { oldScore: true, newScore: true },
  });

  return rows.reduce((sum, row) => sum + Math.abs(row.newScore - row.oldScore), 0);
}

export async function listTrustScoreHistory(
  sellerId: string,
  limit = 10,
): Promise<TrustScoreHistoryEntry[]> {
  const rows = await prisma.trustScoreHistory.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    oldScore: row.oldScore,
    newScore: row.newScore,
    reason: row.reason,
    eventType: row.eventType,
    createdAt: row.createdAt.toISOString(),
    delta: row.newScore - row.oldScore,
  }));
}

export async function getLatestTrustScoreHistoryReason(
  sellerId: string,
): Promise<string | null> {
  const row = await prisma.trustScoreHistory.findFirst({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    select: { reason: true },
  });
  return row?.reason ?? null;
}

export async function countSellerCancellations(sellerId: string): Promise<number> {
  return prisma.trustScoreHistory.count({
    where: {
      sellerId,
      eventType: "ORDER_CANCELLED",
    },
  });
}

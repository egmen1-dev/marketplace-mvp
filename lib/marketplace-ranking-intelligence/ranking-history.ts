import type { RankingHistoryEventType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { rankingEventLabel } from "./ranking-engine";
import type { RankingHistoryItem } from "./types";

export async function appendRankingHistory(input: {
  productId: string;
  oldScore: number;
  newScore: number;
  reason: string;
  algorithmVersion: string;
  versionId: string;
  eventType: RankingHistoryEventType;
}): Promise<void> {
  if (input.oldScore === input.newScore && input.eventType === "RECALCULATED") return;

  await prisma.productRankingHistory.create({
    data: {
      productId: input.productId,
      oldScore: input.oldScore,
      newScore: input.newScore,
      reason: input.reason,
      algorithmVersion: input.algorithmVersion,
      versionId: input.versionId,
      eventType: input.eventType,
    },
  });
}

export async function listRankingHistory(
  productId: string,
  limit = 10,
): Promise<RankingHistoryItem[]> {
  const rows = await prisma.productRankingHistory.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    oldScore: r.oldScore,
    newScore: r.newScore,
    reason: r.reason || rankingEventLabel(r.eventType),
    eventType: r.eventType,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function upsertRankingSnapshot(input: {
  productId: string;
  overallScore: number;
  productScore: number;
  sellerScore: number;
  behaviourScore: number;
  commercialScore: number;
  estimatedPosition: number | null;
  eligibility: "ELIGIBLE" | "NOT_ELIGIBLE";
  topBlockedReason: string | null;
  algorithmVersion: string;
  versionId: string;
}): Promise<{ oldScore: number | null; newScore: number }> {
  const existing = await prisma.productRankingSnapshot.findUnique({
    where: { productId: input.productId },
  });

  await prisma.productRankingSnapshot.upsert({
    where: { productId: input.productId },
    create: {
      productId: input.productId,
      overallScore: input.overallScore,
      productScore: input.productScore,
      sellerScore: input.sellerScore,
      behaviourScore: input.behaviourScore,
      commercialScore: input.commercialScore,
      estimatedPosition: input.estimatedPosition,
      eligibility: input.eligibility,
      topBlockedReason: input.topBlockedReason,
      algorithmVersion: input.algorithmVersion,
      versionId: input.versionId,
    },
    update: {
      overallScore: input.overallScore,
      productScore: input.productScore,
      sellerScore: input.sellerScore,
      behaviourScore: input.behaviourScore,
      commercialScore: input.commercialScore,
      estimatedPosition: input.estimatedPosition,
      eligibility: input.eligibility,
      topBlockedReason: input.topBlockedReason,
      algorithmVersion: input.algorithmVersion,
      versionId: input.versionId,
    },
  });

  return {
    oldScore: existing?.overallScore ?? null,
    newScore: input.overallScore,
  };
}

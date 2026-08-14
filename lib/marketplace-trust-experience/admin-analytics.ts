import { prisma } from "@/lib/prisma";
import { NEW_SELLER_TRUST_SCORE } from "@/lib/marketplace-trust-score/constants";

import type { AdminTrustCenterSnapshot } from "./types";

const DECLINE_REASON_PATTERNS = [
  { match: /отправ|дн|час/i, label: "Просрочки отправки" },
  { match: /фото|галере/i, label: "Отсутствие фото" },
  { match: /отмен/i, label: "Отмены заказов" },
  { match: /отзыв|звезд/i, label: "Негативные отзывы" },
];

export async function getAdminTrustCenterSnapshot(): Promise<AdminTrustCenterSnapshot> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [reputations, recentHistory, previousHistory, sellerCount] = await Promise.all([
    prisma.sellerReputation.findMany({ select: { trustScore: true } }),
    prisma.trustScoreHistory.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { reason: true, oldScore: true, newScore: true, createdAt: true },
      take: 300,
    }),
    prisma.trustScoreHistory.findMany({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      select: { oldScore: true, newScore: true },
      take: 500,
    }),
    prisma.sellerProfile.count(),
  ]);

  const scores = reputations.map((r) => (r.trustScore > 0 ? r.trustScore : NEW_SELLER_TRUST_SCORE));
  const averageTrustScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : NEW_SELLER_TRUST_SCORE;

  const highTrust = scores.filter((score) => score >= 90).length;

  const declineCounts = new Map<string, number>();
  for (const entry of recentHistory) {
    if (entry.newScore >= entry.oldScore) continue;
    const pattern = DECLINE_REASON_PATTERNS.find((p) => p.match.test(entry.reason));
    const label = pattern?.label ?? "Другие причины";
    declineCounts.set(label, (declineCounts.get(label) ?? 0) + 1);
  }

  const declineReasons = [...declineCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const recentDelta = recentHistory.reduce(
    (sum, entry) => sum + (entry.newScore - entry.oldScore),
    0,
  );
  const previousDelta = previousHistory.reduce(
    (sum, entry) => sum + (entry.newScore - entry.oldScore),
    0,
  );
  const monthlyGrowthPercent =
    sellerCount > 0
      ? Math.round(((recentDelta - previousDelta) / Math.max(sellerCount, 1)) * 10) / 10
      : 0;

  return {
    enabled: true,
    averageTrustScore,
    declineReasons:
      declineReasons.length > 0
        ? declineReasons
        : [
            { reason: "Просрочки отправки", count: 0 },
            { reason: "Отсутствие фото", count: 0 },
            { reason: "Отмены заказов", count: 0 },
          ],
    monthlyGrowthPercent,
    sellerCount,
    highTrustPercent:
      scores.length > 0 ? Math.round((highTrust / scores.length) * 100) : 0,
  };
}

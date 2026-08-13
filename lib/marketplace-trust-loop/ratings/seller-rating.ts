import { OrderStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { SellerReputationSnapshot } from "../reviews/types";

function defaultSellerReputation(
  sellerId: string,
  completedOrders: number,
): SellerReputationSnapshot {
  const trustScore = completedOrders >= 10 ? 60 : 50;
  return {
    averageRating: 0,
    reviewsCount: 0,
    trustScore,
    trustLabel: "Развивающийся продавец",
    strengths: ["✓ качество товара"],
    improvements: ["→ добавьте больше фото упаковки"],
    completedOrders,
    satisfactionPercent: 0,
  };
}

export async function getSellerReputationSnapshot(
  sellerId: string,
): Promise<SellerReputationSnapshot | null> {
  const rep = await prisma.sellerReputation.findUnique({ where: { sellerId } });
  if (!rep) {
    const completedOrders = await prisma.order.count({
      where: {
        status: OrderStatus.COMPLETED,
        items: { some: { product: { sellerId } } },
      },
    });
    return defaultSellerReputation(sellerId, completedOrders);
  }

  const recentPros = await prisma.review.findMany({
    where: { sellerId, status: ReviewStatus.APPROVED, pros: { not: null } },
    select: { pros: true },
    take: 20,
  });

  const strengths = recentPros
    .map((r) => r.pros)
    .filter(Boolean)
    .slice(0, 3) as string[];

  const improvements = await prisma.review.findMany({
    where: { sellerId, status: ReviewStatus.APPROVED, cons: { not: null } },
    select: { cons: true },
    take: 10,
  });

  const trustLabel =
    rep.trustScore >= 85
      ? "Высокий уровень доверия"
      : rep.trustScore >= 70
        ? "Хороший уровень доверия"
        : "Развивающийся продавец";

  const satisfactionPercent =
    rep.reviewsCount > 0
      ? Math.round((rep.positiveSentiment / rep.reviewsCount) * 100)
      : 0;

  return {
    averageRating: Number(rep.averageRating),
    reviewsCount: rep.reviewsCount,
    trustScore: rep.trustScore,
    trustLabel,
    strengths: strengths.length > 0 ? strengths : ["✓ качество товара"],
    improvements:
      improvements.length > 0
        ? (improvements.map((i) => i.cons).filter(Boolean).slice(0, 2) as string[])
        : ["→ добавьте больше фото упаковки"],
    completedOrders: rep.completedOrders,
    satisfactionPercent,
  };
}

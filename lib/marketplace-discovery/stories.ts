import { ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isMarketplaceDiscoveryEnabled } from "./flags";
import type { BuyerStory } from "./types";

const STORY_REASONS = [
  "Для новой квартиры",
  "Подарок близкому",
  "Для домашнего ремонта",
  "Просто понравилось",
  "Для дачи",
];

export async function listBuyerStories(limit = 5): Promise<BuyerStory[]> {
  if (!isMarketplaceDiscoveryEnabled()) return [];

  const reviews = await prisma.review.findMany({
    where: { status: ReviewStatus.APPROVED, text: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      buyer: { select: { city: true } },
      product: { select: { id: true, name: true } },
    },
  });

  return reviews.map((r, i) => ({
    id: r.id,
    city: r.buyer.city?.trim() || "Покупатель из России",
    reason: r.pros?.trim() || STORY_REASONS[i % STORY_REASONS.length]!,
    productTitle: r.product.name,
    productId: r.product.id,
  }));
}

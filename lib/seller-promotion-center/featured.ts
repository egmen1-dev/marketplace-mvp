import { prisma } from "@/lib/prisma";

import type { PromotionFeaturedRow } from "./types";

export async function listPromotionFeatured(sellerProfileId: string): Promise<PromotionFeaturedRow[]> {
  const placements = await prisma.promotionPlacement.findMany({
    where: {
      active: true,
      campaign: {
        sellerId: sellerProfileId,
        status: "STARTED",
      },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 20,
    include: {
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, endedAt: true } },
    },
  });

  return placements.map((row) => ({
    campaignId: row.campaignId,
    productId: row.product.id,
    productName: row.product.name,
    surface: row.surface,
    priority: row.priority,
    active: row.active,
    endsAt: row.campaign.endedAt?.toISOString() ?? null,
  }));
}

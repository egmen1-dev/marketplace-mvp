import { prisma } from "@/lib/prisma";

import type { PromotionPerformanceRow } from "./types";

export async function listPromotionPerformance(
  sellerProfileId: string,
  periodDays = 30,
): Promise<PromotionPerformanceRow[]> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const campaigns = await prisma.promotionCampaign.findMany({
    where: { sellerId: sellerProfileId },
    include: {
      product: { select: { id: true, name: true } },
      metrics: {
        where: { date: { gte: since } },
        select: {
          impressions: true,
          clicks: true,
          orders: true,
          revenue: true,
        },
      },
      orders: {
        where: { createdAt: { gte: since } },
        select: { amount: true },
      },
    },
    take: 30,
  });

  return campaigns
    .map((campaign) => {
      const metrics = campaign.metrics ?? [];
      const orders = campaign.orders ?? [];
      const impressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
      const clicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
      const ordersCount = metrics.reduce((sum, m) => sum + m.orders, 0);
      const revenue = metrics.reduce((sum, m) => sum + Number(m.revenue), 0);
      const spend = orders.reduce((sum, o) => sum + Number(o.amount), 0);
      if (impressions + clicks + ordersCount + revenue + spend === 0) return null;
      return {
        campaignId: campaign.id,
        productId: campaign.product.id,
        productName: campaign.product.name,
        impressions,
        clicks,
        orders: ordersCount,
        revenue,
        spend,
        periodDays,
      };
    })
    .filter((row): row is PromotionPerformanceRow => row !== null);
}

import { prisma } from "@/lib/prisma";

import { listPromotionCampaigns } from "./campaigns";
import { listPromotionDiscounts } from "./discounts";
import { loadPromotionEligibility } from "./eligibility";
import { listPromotionFeatured } from "./featured";
import { isSellerPromotionCenterEnabled } from "./flags";
import { listPromotionHistory } from "./history";
import { listPromotionPerformance } from "./performance";
import { PROMOTION_PLANS } from "./plans";
import { resolvePromotionPlan } from "./plan-resolver";
import { getPromotionCenterDashboard } from "./queries";
import type { PromotionCenterSections, PromotionSectionMeta } from "./types";

const SECTION_DEFINITIONS: PromotionSectionMeta[] = [
  { id: "discounts", title: "Скидки", supported: true },
  { id: "coupons", title: "Купоны", supported: false, hiddenReason: "NOT_SUPPORTED" },
  { id: "bundles", title: "Наборы", supported: false, hiddenReason: "NOT_SUPPORTED" },
  { id: "campaigns", title: "Кампании", supported: true },
  { id: "featured", title: "Избранное", supported: true },
  { id: "history", title: "История", supported: true },
  { id: "performance", title: "Эффективность", supported: true },
  { id: "eligibility", title: "Доступность", supported: true },
];

export async function getPromotionCenterSections(
  sellerProfileId: string,
): Promise<PromotionCenterSections> {
  if (!isSellerPromotionCenterEnabled()) {
    return {
      generatedAt: new Date().toISOString(),
      enabled: false,
      sections: [],
      campaigns: [],
      discounts: [],
      featured: [],
      history: [],
      performance: [],
      eligibility: [],
      plans: [],
      summary: {
        activeCampaigns: 0,
        spent30d: 0,
        orders30d: 0,
        revenue30d: 0,
        discountCount: 0,
      },
      cacheVersion: "promotion-v1",
      retryAfterMs: 60_000,
      advisoryOnly: true,
    };
  }

  const [dashboard, campaigns, discounts, featured, history, performance, eligibility] = await Promise.all([
    getPromotionCenterDashboard(sellerProfileId),
    listPromotionCampaigns(sellerProfileId),
    listPromotionDiscounts(sellerProfileId),
    listPromotionFeatured(sellerProfileId),
    listPromotionHistory(sellerProfileId),
    listPromotionPerformance(sellerProfileId),
    loadPromotionEligibility(sellerProfileId),
  ]);

  const activeCampaigns = await prisma.promotionCampaign.count({
    where: { sellerId: sellerProfileId, status: "STARTED" },
  });

  const plans = await Promise.all(
    PROMOTION_PLANS.map(async (plan) => {
      try {
        const resolved = await resolvePromotionPlan(plan.id);
        return {
          id: plan.id,
          name: plan.name,
          price: resolved.price,
          days: resolved.days,
          description: plan.description,
          dbPlanId: resolved.dbPlanId,
        };
      } catch {
        return {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          days: plan.days,
          description: plan.description,
          dbPlanId: null,
        };
      }
    }),
  );

  const visibleSections = SECTION_DEFINITIONS.filter((section) => {
    if (!section.supported) return false;
    if (section.id === "discounts") return discounts.length > 0;
    if (section.id === "campaigns") return campaigns.length > 0 || dashboard.products.some((p) => p.ready);
    if (section.id === "featured") return featured.length > 0;
    if (section.id === "history") return history.length > 0;
    if (section.id === "performance") return performance.length > 0;
    if (section.id === "eligibility") return eligibility.length > 0;
    return true;
  });

  return {
    generatedAt: new Date().toISOString(),
    enabled: true,
    sections: visibleSections,
    campaigns,
    discounts,
    featured,
    history,
    performance,
    eligibility,
    plans,
    summary: {
      activeCampaigns,
      spent30d: dashboard.spent30d,
      orders30d: dashboard.orders30d,
      revenue30d: dashboard.revenue30d,
      discountCount: discounts.length,
    },
    cacheVersion: "promotion-v1",
    retryAfterMs: 60_000,
    advisoryOnly: true,
  };
}

import { prisma } from "@/lib/prisma";

import { PROMOTION_PLANS, type PromotionPlan, type PromotionPlanId } from "./plans";

const PLAN_NAME_ALIASES: Record<PromotionPlanId, string[]> = {
  STARTER: ["STARTER"],
  GROWTH: ["GROWTH"],
  PRO: ["PRO", "BOOST"],
};

export async function resolvePromotionPlan(planId: PromotionPlanId): Promise<PromotionPlan & { dbPlanId: string }> {
  const fallback = PROMOTION_PLANS.find((p) => p.id === planId);
  if (!fallback) throw new Error("UNKNOWN_PLAN");

  const aliases = PLAN_NAME_ALIASES[planId];
  const dbPlan = await prisma.promotionPlan.findFirst({
    where: { name: { in: aliases }, active: true },
    orderBy: { price: "desc" },
  });

  if (dbPlan) {
    return {
      id: planId,
      name: dbPlan.name,
      price: Number(dbPlan.price),
      days: dbPlan.durationDays,
      description: fallback.description,
      dbPlanId: dbPlan.id,
    };
  }

  return {
    ...fallback,
    dbPlanId: `plan_${planId.toLowerCase()}`,
  };
}

export function surfacesForPlan(planId: PromotionPlanId): Array<
  "HOME_FEATURED" | "CATALOG_TOP" | "CATEGORY_TOP" | "SEARCH_BOOST"
> {
  if (planId === "STARTER") return ["CATALOG_TOP"];
  if (planId === "GROWTH") return ["CATALOG_TOP", "CATEGORY_TOP"];
  return ["HOME_FEATURED", "CATALOG_TOP", "CATEGORY_TOP", "SEARCH_BOOST"];
}

export function priorityForPlan(planId: PromotionPlanId): number {
  if (planId === "STARTER") return 10;
  if (planId === "GROWTH") return 20;
  return 30;
}

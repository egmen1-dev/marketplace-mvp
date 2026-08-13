import { isPromotionIntelligenceEnabled } from "@/lib/promotion/intelligence/flags";
import { generatePromotionRecommendations } from "@/lib/promotion/intelligence/recommendations";
import { isSellerGrowthEnabled } from "@/lib/seller-growth/flags";
import {
  buildStrengthsWeaknesses,
  calculateGrowthBreakdown,
  calculateSellerGrowthScore,
  growthLevelLabel,
  resolveGrowthLevel,
} from "@/lib/seller-growth/growth-score";
import {
  buildOpportunities,
  generateSellerActions,
  pickNextAction,
} from "@/lib/seller-growth/recommendations";
import { generateSellerInsights } from "@/lib/seller-growth/insights";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";
import type {
  AdminSellerGrowthOverview,
  SellerGrowthDashboard,
  SellerGrowthScore,
} from "@/lib/seller-growth/types";
import { prisma } from "@/lib/prisma";

export async function getSellerGrowthDashboard(
  sellerProfileId: string,
): Promise<SellerGrowthDashboard | null> {
  if (!isSellerGrowthEnabled()) return null;

  const health = await loadSellerHealthSnapshot(sellerProfileId);
  if (!health) return null;

  const breakdown = calculateGrowthBreakdown(health.growthInput);
  const scoreValue = calculateSellerGrowthScore(health.growthInput);
  const level = resolveGrowthLevel(scoreValue);
  const { strengths, weaknesses } = buildStrengthsWeaknesses(breakdown);

  const score: SellerGrowthScore = {
    sellerId: sellerProfileId,
    score: scoreValue,
    level,
    levelLabel: growthLevelLabel(level),
    strengths,
    weaknesses,
    breakdown,
  };

  const insights = generateSellerInsights(health.products);
  const actions = generateSellerActions(health.products);
  const opportunities = buildOpportunities(health.products);

  if (isPromotionIntelligenceEnabled()) {
    const promo = await generatePromotionRecommendations(sellerProfileId);
    opportunities.readyForPromotionCount = Math.max(
      opportunities.readyForPromotionCount,
      promo.recommendations.filter((r) => r.ready && r.score >= 50 && !r.isPromoted)
        .length,
    );
  }

  return {
    score,
    insights,
    actions,
    opportunities,
    nextAction: pickNextAction(actions),
  };
}

export async function getAdminSellerGrowthOverview(): Promise<AdminSellerGrowthOverview> {
  if (!isSellerGrowthEnabled()) {
    return {
      topSellers: [],
      atRiskSellers: [],
      inactiveSellers: [],
      headlines: ["Seller Growth Engine выключен"],
      sellersWithUnpromotedReadyProducts: 0,
      singleProductSellers: 0,
      highPotentialProducts: 0,
    };
  }

  const sellers = await prisma.sellerProfile.findMany({
    where: { isBlocked: false },
    select: {
      id: true,
      storeName: true,
      _count: { select: { products: true } },
    },
    take: 100,
  });

  const scored: Array<{
    sellerId: string;
    storeName: string;
    score: number;
    level: ReturnType<typeof resolveGrowthLevel>;
    productCount: number;
    readyUnpromoted: number;
    daysSinceLastOrder: number | null;
    recentOrders: number;
  }> = [];

  let sellersWithUnpromotedReady = 0;
  let singleProductSellers = 0;
  let highPotentialProducts = 0;

  for (const seller of sellers) {
    const health = await loadSellerHealthSnapshot(seller.id);
    if (!health) continue;

    const score = calculateSellerGrowthScore(health.growthInput);
    const level = resolveGrowthLevel(score);
    const readyUnpromoted = health.products.filter(
      (p) => p.ready && !p.isPromoted,
    ).length;

    if (readyUnpromoted > 0) sellersWithUnpromotedReady += 1;
    if (health.productCount === 1) singleProductSellers += 1;
    highPotentialProducts += health.products.filter(
      (p) => p.ready && !p.isPromoted && p.qualityScore >= 70,
    ).length;

    scored.push({
      sellerId: seller.id,
      storeName: seller.storeName,
      score,
      level,
      productCount: health.productCount,
      readyUnpromoted,
      daysSinceLastOrder: health.daysSinceLastOrder,
      recentOrders: health.recentOrderCount,
    });
  }

  const topSellers = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => ({
      sellerId: s.sellerId,
      storeName: s.storeName,
      score: s.score,
      level: s.level,
    }));

  const atRiskSellers = scored
    .filter(
      (s) =>
        s.score < 50 ||
        (s.daysSinceLastOrder != null && s.daysSinceLastOrder > 45),
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map((s) => ({
      sellerId: s.sellerId,
      storeName: s.storeName,
      score: s.score,
      reason:
        s.daysSinceLastOrder != null && s.daysSinceLastOrder > 45
          ? "Нет продаж более 45 дней"
          : "Низкий growth score",
    }));

  const inactiveSellers = scored
    .filter((s) => s.recentOrders === 0 && s.productCount > 0)
    .slice(0, 8)
    .map((s) => ({
      sellerId: s.sellerId,
      storeName: s.storeName,
      productCount: s.productCount,
      reason: "Нет заказов за 30 дней",
    }));

  const headlines: string[] = [];
  if (sellersWithUnpromotedReady > 0) {
    headlines.push(
      `${sellersWithUnpromotedReady} продавцов имеют товары, но не запускали продвижение`,
    );
  }
  if (singleProductSellers > 0) {
    headlines.push(
      `${singleProductSellers} продавцов создали только один товар`,
    );
  }
  if (highPotentialProducts > 0) {
    headlines.push(
      `${highPotentialProducts} товаров с высоким потенциалом без продвижения`,
    );
  }
  if (headlines.length === 0) {
    headlines.push("Платформа стабильна — явных рисков роста не обнаружено");
  }

  return {
    topSellers,
    atRiskSellers,
    inactiveSellers,
    headlines,
    sellersWithUnpromotedReadyProducts: sellersWithUnpromotedReady,
    singleProductSellers,
    highPotentialProducts,
  };
}

export async function assertSellerGrowthAccess(
  sellerProfileId: string,
  targetSellerId: string,
): Promise<void> {
  if (sellerProfileId !== targetSellerId) {
    const { PromotionForbiddenError } = await import(
      "@/lib/promotion/permissions"
    );
    throw new PromotionForbiddenError();
  }
}

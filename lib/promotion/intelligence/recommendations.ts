import {
  OrderStatus,
  ProductStatus,
  PromotionCampaignStatus,
  type Prisma,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { isPromotionAnalyticsEnabled } from "@/lib/promotion/analytics/flags";
import { listActivePromotionPlans } from "@/lib/promotion/billing/plans";
import { isPromotionIntelligenceEnabled } from "@/lib/promotion/intelligence/flags";
import {
  calculatePromotionOpportunityScore,
  calculatePromotionOpportunityBreakdown,
  resolveRecommendationLabel,
  resolveRecommendedPlan,
} from "@/lib/promotion/intelligence/score";
import type {
  AdminPromotionIntelligenceSummary,
  PromotionRecommendation,
  RecommendedPlanCode,
  SellerRecommendationsPayload,
} from "@/lib/promotion/intelligence/types";
import { evaluatePromotionReadiness } from "@/lib/promotion/readiness";
import { prisma } from "@/lib/prisma";

const productInclude = {
  images: { select: { id: true }, take: 1 },
  seller: {
    select: {
      isBlocked: true,
      isVerified: true,
      rating: true,
      storeName: true,
    },
  },
  productType: {
    select: {
      characteristics: {
        where: { required: true },
        select: { id: true },
      },
    },
  },
  characteristicValues: {
    select: {
      definitionId: true,
      valueText: true,
      valueNumber: true,
      valueBoolean: true,
      valueJson: true,
    },
  },
  promotionCampaign: { select: { status: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function readinessFromProduct(product: ProductRow) {
  const requiredIds = new Set(
    product.productType?.characteristics.map((c) => c.id) ?? [],
  );
  const filledRequired = product.characteristicValues.filter((cv) => {
    if (!requiredIds.has(cv.definitionId)) return false;
    if (cv.valueText?.trim()) return true;
    if (cv.valueNumber != null) return true;
    if (cv.valueBoolean != null) return true;
    if (cv.valueJson != null) return true;
    return false;
  }).length;

  return evaluatePromotionReadiness({
    status: product.status,
    stock: product.stock,
    price: toPriceNumber(product.price),
    title: product.name,
    description: product.description,
    productTypeId: product.productTypeId,
    categoryId: product.categoryId,
    imageCount: product.images.length,
    sellerId: product.sellerId,
    sellerBlocked: product.seller.isBlocked,
    sellerVerified: product.seller.isVerified,
    requiredCharacteristicCount: requiredIds.size,
    filledRequiredCharacteristicCount: filledRequired,
    characteristicCount: product.characteristicValues.length,
  });
}

async function loadCategoryMedianPrices(
  categoryIds: Array<string | null>,
): Promise<Map<string, number>> {
  const ids = [...new Set(categoryIds.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, number>();
  if (ids.length === 0) return map;

  const aggregates = await prisma.product.groupBy({
    by: ["categoryId"],
    where: {
      categoryId: { in: ids },
      status: ProductStatus.ACTIVE,
      stock: { gt: 0 },
    },
    _avg: { price: true },
  });

  for (const row of aggregates) {
    if (row.categoryId && row._avg.price) {
      map.set(row.categoryId, toPriceNumber(row._avg.price));
    }
  }
  return map;
}

async function loadOrderCounts(productIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      order: {
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.COMPLETED,
          ],
        },
      },
    },
    _sum: { quantity: true },
  });

  for (const row of rows) {
    map.set(row.productId, row._sum.quantity ?? 0);
  }
  return map;
}

async function loadMetricSignals(
  productIds: string[],
): Promise<Map<string, { productViews: number; addToCart: number }>> {
  const map = new Map<string, { productViews: number; addToCart: number }>();
  if (!isPromotionAnalyticsEnabled() || productIds.length === 0) {
    return map;
  }

  const rows = await prisma.promotionMetric.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _sum: { productViews: true, addToCart: true },
  });

  for (const row of rows) {
    map.set(row.productId, {
      productViews: row._sum.productViews ?? 0,
      addToCart: row._sum.addToCart ?? 0,
    });
  }
  return map;
}

function buildReasons(opts: {
  readiness: ReturnType<typeof readinessFromProduct>;
  productViews: number;
  addToCart: number;
  orderCount: number;
  stock: number;
  priceRatio: number | null;
  sellerVerified: boolean;
  breakdown: ReturnType<typeof calculatePromotionOpportunityBreakdown>;
}): string[] {
  const reasons: string[] = [];

  if (opts.addToCart >= 3 && opts.productViews > 0) {
    reasons.push("Высокая конверсия просмотра в корзину");
  } else if (opts.orderCount >= 2) {
    reasons.push("Есть история продаж");
  } else if (opts.productViews >= 50) {
    reasons.push(`${opts.productViews} просмотров карточки`);
  }

  if (opts.stock >= 5) {
    reasons.push("Есть остатки на складе");
  }

  if (opts.priceRatio != null && opts.priceRatio <= 0.95) {
    reasons.push("Цена конкурентная");
  } else if (opts.priceRatio != null && opts.priceRatio <= 1.05) {
    reasons.push("Цена на уровне рынка");
  }

  if (opts.readiness.qualityScore >= 70) {
    reasons.push("Высокий quality score");
  } else if (opts.readiness.qualityScore >= 50) {
    reasons.push("Карточка готова к продвижению");
  }

  if (opts.sellerVerified) {
    reasons.push("Проверенный продавец");
  }

  if (opts.addToCart >= 5) {
    reasons.push(`✓ ${opts.addToCart} добавлений в корзину`);
  }
  if (opts.productViews >= 20) {
    reasons.push(`✓ ${opts.productViews} просмотров`);
  }
  if (opts.priceRatio != null && opts.priceRatio < 1) {
    reasons.push("✓ цена ниже рынка");
  }

  if (reasons.length === 0 && opts.breakdown.conversion >= 10) {
    reasons.push("Стабильный интерес покупателей");
  }

  return reasons.slice(0, 6);
}

function buildImprovements(readiness: ReturnType<typeof readinessFromProduct>): string[] {
  if (readiness.ready) return [];
  return readiness.blockers.slice(0, 5);
}

function buildTimingReasons(opts: {
  ready: boolean;
  score: number;
  stock: number;
  productViews: number;
  isPromoted: boolean;
}): string[] {
  if (!opts.ready || opts.isPromoted) return [];
  const tips: string[] = [];
  if (opts.score >= 70 && opts.stock >= 5) {
    tips.push("Сейчас хороший момент: спрос и остатки совпадают");
  }
  if (opts.productViews >= 30 && !opts.isPromoted) {
    tips.push("Товар уже получает просмотры — продвижение усилит поток");
  }
  if (opts.stock >= 10) {
    tips.push("Достаточно остатков для роста продаж");
  }
  return tips;
}

function planLabel(
  code: RecommendedPlanCode | null,
  plans: Awaited<ReturnType<typeof listActivePromotionPlans>>,
): { label: string | null; budget: number | null } {
  if (!code) return { label: null, budget: null };
  const plan = plans.find((p) => p.name === code);
  if (!plan) return { label: code, budget: null };
  return {
    label: `${plan.name} · ${plan.durationDays} дней`,
    budget: plan.price,
  };
}

function scoreProduct(
  product: ProductRow,
  opts: {
    categoryMedians: Map<string, number>;
    orderCounts: Map<string, number>;
    metricSignals: Map<string, { productViews: number; addToCart: number }>;
    plans: Awaited<ReturnType<typeof listActivePromotionPlans>>;
  },
): PromotionRecommendation {
  const readiness = readinessFromProduct(product);
  const metric = opts.metricSignals.get(product.id);
  const productViews = metric?.productViews ?? product.views;
  const addToCart = metric?.addToCart ?? 0;
  const orderCount = opts.orderCounts.get(product.id) ?? 0;
  const price = toPriceNumber(product.price);
  const median = product.categoryId
    ? opts.categoryMedians.get(product.categoryId)
    : undefined;
  const priceRatio =
    median != null && median > 0 ? price / median : null;

  const breakdown = calculatePromotionOpportunityBreakdown({
    qualityScore: readiness.qualityScore,
    productViews,
    addToCart,
    orderCount,
    stock: product.stock,
    priceRatio,
    sellerVerified: product.seller.isVerified,
    sellerBlocked: product.seller.isBlocked,
    sellerRating: toPriceNumber(product.seller.rating),
  });

  const score = calculatePromotionOpportunityScore({
    qualityScore: readiness.qualityScore,
    productViews,
    addToCart,
    orderCount,
    stock: product.stock,
    priceRatio,
    sellerVerified: product.seller.isVerified,
    sellerBlocked: product.seller.isBlocked,
    sellerRating: toPriceNumber(product.seller.rating),
  });

  const ready = readiness.ready;
  const isPromoted =
    product.promotionCampaign?.status === PromotionCampaignStatus.STARTED;
  const recommendedPlan = resolveRecommendedPlan(score, ready);
  const { label, budget } = planLabel(recommendedPlan, opts.plans);

  return {
    productId: product.id,
    productTitle: product.name,
    score,
    recommendation: resolveRecommendationLabel(score, ready),
    reasons: buildReasons({
      readiness,
      productViews,
      addToCart,
      orderCount,
      stock: product.stock,
      priceRatio,
      sellerVerified: product.seller.isVerified,
      breakdown,
    }),
    improvements: buildImprovements(readiness),
    timingReasons: buildTimingReasons({
      ready,
      score,
      stock: product.stock,
      productViews,
      isPromoted,
    }),
    recommendedPlan,
    recommendedPlanLabel: label,
    recommendedBudget: budget,
    productViews,
    addToCart,
    orderCount,
    qualityScore: readiness.qualityScore,
    ready,
    isPromoted,
    breakdown,
  };
}

/** Advisory recommendations for seller-owned products only. */
export async function generatePromotionRecommendations(
  sellerProfileId: string,
): Promise<SellerRecommendationsPayload> {
  if (!isPromotionIntelligenceEnabled()) {
    return { recommendations: [], plans: [] };
  }

  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId },
    include: productInclude,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const productIds = products.map((p) => p.id);
  const [categoryMedians, orderCounts, metricSignals, plans] =
    await Promise.all([
      loadCategoryMedianPrices(products.map((p) => p.categoryId)),
      loadOrderCounts(productIds),
      loadMetricSignals(productIds),
      listActivePromotionPlans(),
    ]);

  const recommendations = products
    .map((product) =>
      scoreProduct(product, {
        categoryMedians,
        orderCounts,
        metricSignals,
        plans,
      }),
    )
    .sort((a, b) => b.score - a.score);

  return { recommendations, plans };
}

export async function getAdminPromotionIntelligence(): Promise<AdminPromotionIntelligenceSummary> {
  if (!isPromotionIntelligenceEnabled()) {
    return {
      highPotentialCount: 0,
      readyWithoutCampaignCount: 0,
      estimatedMissedRevenue: 0,
      topOpportunities: [],
      headline: "AI-рекомендации выключены",
    };
  }

  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    include: productInclude,
    take: 300,
  });

  const productIds = products.map((p) => p.id);
  const [categoryMedians, orderCounts, metricSignals, plans] =
    await Promise.all([
      loadCategoryMedianPrices(products.map((p) => p.categoryId)),
      loadOrderCounts(productIds),
      loadMetricSignals(productIds),
      listActivePromotionPlans(),
    ]);

  const scored = products.map((product) =>
    scoreProduct(product, {
      categoryMedians,
      orderCounts,
      metricSignals,
      plans,
    }),
  );

  const highPotential = scored.filter(
    (r) => r.score >= 80 && r.ready && !r.isPromoted,
  );
  const readyWithoutCampaign = scored.filter(
    (r) => r.ready && !r.isPromoted,
  );

  const boostPlan = plans.find((p) => p.name === "BOOST");
  const avgPlanPrice = boostPlan?.price ?? 2990;
  const estimatedMissedRevenue = Math.round(
    highPotential.length * avgPlanPrice * 0.15,
  );

  const topOpportunities = [...highPotential]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((row) => {
      const product = products.find((p) => p.id === row.productId)!;
      return {
        productId: row.productId,
        productTitle: row.productTitle,
        sellerName: product.seller.storeName,
        score: row.score,
        recommendedPlan: row.recommendedPlan,
      };
    });

  const headline =
    readyWithoutCampaign.length > 0
      ? `${readyWithoutCampaign.length} товаров готовы к продвижению, но продавцы не запускали кампанию`
      : "Нет товаров с упущенным потенциалом продвижения";

  return {
    highPotentialCount: highPotential.length,
    readyWithoutCampaignCount: readyWithoutCampaign.length,
    estimatedMissedRevenue,
    topOpportunities,
    headline,
  };
}

export async function assertSellerRecommendationsAccess(
  sellerProfileId: string,
  productId: string,
): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: sellerProfileId },
    select: { id: true },
  });
  if (!product) {
    const { PromotionForbiddenError } = await import("@/lib/promotion/permissions");
    throw new PromotionForbiddenError();
  }
}

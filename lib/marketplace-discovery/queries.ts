import { listProducts } from "@/features/products";
import { prisma } from "@/lib/prisma";
import { computeProductCompletenessScore } from "@/lib/conversion";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { getProductRatingSnapshot } from "@/lib/marketplace-trust-loop/ratings/product-rating";

import { DISCOVERY_COLLECTIONS } from "./collection-definitions";
import { buildDiscoverySection, pickDailyFindCard } from "./feeds";
import { buildGiftSections } from "./gift-engine";
import { getDailyFind } from "./daily-finds";
import { getPriceGameRound } from "./price-game";
import { listBuyerStories } from "./stories";
import { DISCOVERY_SITUATIONS } from "./situations";
import { isMarketplaceDiscoveryEnabled } from "./flags";
import type {
  AdminDiscoveryDashboard,
  DiscoveryHomeFeed,
  SellerDiscoveryTips,
} from "./types";

export { DISCOVERY_SITUATIONS } from "./situations";

export async function getDiscoveryHomeFeed(
  userId?: string | null,
): Promise<DiscoveryHomeFeed> {
  if (!isMarketplaceDiscoveryEnabled()) {
    return { enabled: false, dailyFind: null, sections: [] };
  }

  const [popular, gifts, unexpected, valueDeals, daily] = await Promise.all([
    listProducts({ status: "ACTIVE", sort: "popular", pageSize: 12, inStock: true }),
    buildGiftSections(),
    buildDiscoverySection({
      id: "unexpected",
      title: "Неожиданные товары",
      emoji: "💡",
      description: "Интересные находки с хорошим откликом покупателей",
      sort: "newest",
      pageSize: 6,
    }),
    buildDiscoverySection({
      id: "value-deals",
      title: "Выгодные находки",
      emoji: "⚡",
      description: "Сильное соотношение цены и качества — не просто дешево",
      sort: "popular",
      pageSize: 6,
    }),
    getDailyFind(userId),
  ]);

  const dailyFind =
    daily.item ??
    (await pickDailyFindCard(popular.items));

  const sections = [
    ...gifts,
    unexpected,
    valueDeals,
  ];

  return {
    enabled: true,
    dailyFind,
    sections,
  };
}

export async function getSituationProducts(
  situationId: string,
): Promise<import("./types").DiscoveryProductCard[]> {
  if (!isMarketplaceDiscoveryEnabled()) return [];
  const situation = DISCOVERY_SITUATIONS.find((s) => s.id === situationId);
  if (!situation) return [];

  const result = await listProducts({
    status: "ACTIVE",
    sort: "popular",
    pageSize: 12,
    query: situation.queryHint || undefined,
    priceMax: situation.maxPrice,
    inStock: true,
  });

  const { enrichProductsWithReasons } = await import("./recommendation-context");
  return enrichProductsWithReasons(result.items);
}

export async function getSellerDiscoveryTips(
  sellerProfileId: string,
): Promise<SellerDiscoveryTips> {
  if (!isMarketplaceDiscoveryEnabled()) {
    return { enabled: false, canAppear: false, blockers: [], strengths: [] };
  }

  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId, status: "ACTIVE" },
    take: 5,
    include: {
      images: true,
      _count: { select: { characteristicValues: true } },
    },
  });

  if (products.length === 0) {
    return {
      enabled: true,
      canAppear: false,
      blockers: ["Опубликуйте хотя бы один активный товар"],
      strengths: [],
    };
  }

  const blockers = new Set<string>();
  const strengths = new Set<string>();

  for (const p of products) {
    const score = computeProductCompletenessScore({
      photoCount: p.images.length,
      titleLength: p.name.trim().length,
      descriptionLength: (p.description ?? "").trim().length,
      characteristicCount: p._count.characteristicValues,
      hasCategory: Boolean(p.categoryId),
      hasProductType: Boolean(p.productTypeId),
      price: Number(p.price),
      hasSeller: true,
    });

    if (p.images.length < 3) blockers.add("Добавьте 2+ фотографии");
    if (p._count.characteristicValues < 3) blockers.add("Заполните характеристики");
    if (score.score >= 70) strengths.add("Хорошая заполненность карточки");

    if (isMarketplaceTrustLoopEnabled()) {
      const rating = await getProductRatingSnapshot(p.id);
      if (!rating || rating.reviewsCount === 0) {
        blockers.add("Получите первые отзывы");
      } else if (rating.averageRating >= 4.5) {
        strengths.add("Высокий рейтинг покупателей");
      }
    }
  }

  return {
    enabled: true,
    canAppear: blockers.size <= 2,
    blockers: [...blockers].slice(0, 4),
    strengths: [...strengths].slice(0, 3),
  };
}

export async function getAdminDiscoveryDashboard(): Promise<AdminDiscoveryDashboard> {
  if (!isMarketplaceDiscoveryEnabled()) {
    return {
      enabled: false,
      topCollections: [],
      topClicks: [],
      opportunities: [],
      sectionViews: [],
    };
  }

  const events = await prisma.analyticsEvent.findMany({
    where: {
      event: {
        in: [
          "discovery_section_view",
          "discovery_product_click",
          "collection_opened",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const sectionViews = new Map<string, number>();
  const clicks = new Map<string, number>();
  const collections = new Map<string, number>();

  for (const e of events) {
    if (e.event === "discovery_section_view" && e.entityId) {
      sectionViews.set(e.entityId, (sectionViews.get(e.entityId) ?? 0) + 1);
    }
    if (e.event === "discovery_product_click" && e.entityId) {
      clicks.set(e.entityId, (clicks.get(e.entityId) ?? 0) + 1);
    }
    if (e.event === "collection_opened" && e.entityId) {
      collections.set(e.entityId, (collections.get(e.entityId) ?? 0) + 1);
    }
  }

  const topCollections = DISCOVERY_COLLECTIONS.map((c) => ({
    slug: c.slug,
    title: c.title,
    views: collections.get(c.slug) ?? 0,
  }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const topClicks = [...clicks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([productId, count]) => ({
      productId,
      title: productId.slice(0, 8),
      clicks: count,
    }));

  return {
    enabled: true,
    topCollections,
    topClicks,
    sectionViews: [...sectionViews.entries()].map(([section, views]) => ({
      section,
      views,
    })),
    opportunities: [
      "Категория «товары для дома» может расти — добавьте подборки",
      "Проверьте товары без фото — они не попадают в Находки",
      "Сильные отзывы повышают шанс попасть в «Выгодные находки»",
    ],
  };
}

export {
  getDailyFind,
  getPriceGameRound,
  listBuyerStories,
};

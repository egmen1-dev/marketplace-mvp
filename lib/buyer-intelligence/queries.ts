import { ProductStatus } from "@prisma/client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

import { buildBuyerProfile } from "./buyer-profile";
import { isBuyerIntelligenceEnabled } from "./flags";
import {
  buyerIntentTypeLabel,
  parseBuyerIntent,
} from "./intent-parser";
import {
  buildSellerBuyerFitSummary,
  computeBuyerProductMatch,
  generateBuyerRecommendations,
  type ProductMatchCandidate,
} from "./recommendations";
import { understandSearchQuery } from "./search-understanding";
import type {
  AdminBuyerIntelligenceSummary,
  BuyerProductMatch,
  BuyerProductRecommendation,
  SearchUnderstanding,
  SellerBuyerFitSummary,
} from "./types";

function decimalToNumber(value: Parameters<typeof toPriceNumber>[0]): number {
  return toPriceNumber(value);
}

async function loadMatchCandidates(
  query: string,
  categoryName: string | null,
  limit = 40,
): Promise<ProductMatchCandidate[]> {
  const q = query.trim();
  const orFilters = [];
  if (q.length >= 2) {
    orFilters.push({ name: { contains: q, mode: "insensitive" as const } });
  }
  if (categoryName) {
    orFilters.push({
      category: { name: { equals: categoryName, mode: "insensitive" as const } },
    });
  }

  const rows = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      ...(orFilters.length > 0 ? { OR: orFilters } : {}),
    },
    take: limit,
    orderBy: [{ views: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      stock: true,
      category: { select: { name: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      seller: {
        select: {
          isVerified: true,
          rating: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.name,
    category: row.category?.name ?? null,
    price: decimalToNumber(row.price),
    currency: row.currency,
    stock: row.stock,
    imageUrl: row.images[0]?.url ?? null,
    seller: {
      isVerified: row.seller.isVerified,
      rating: decimalToNumber(row.seller.rating),
    },
  }));
}

async function trackBuyerIntentDetected(
  intent: SearchUnderstanding["intent"],
  route: string,
): Promise<void> {
  await trackServerEvent({
    event: ANALYTICS_EVENTS.BUYER_INTENT_DETECTED,
    route,
    entityId: `${intent.purchaseIntent}:${intent.intent}`.slice(0, 100),
  });
}

export async function getSearchBuyerRecommendations(input: {
  query: string;
  userId: string | null;
  route?: string;
}): Promise<{
  understanding: SearchUnderstanding;
  recommendations: BuyerProductRecommendation[];
} | null> {
  if (!isBuyerIntelligenceEnabled()) return null;
  const q = input.query.trim();
  if (q.length < 2) return null;

  const profile = await buildBuyerProfile(input.userId);
  const understanding = understandSearchQuery(q, profile);
  await trackBuyerIntentDetected(
    understanding.intent,
    input.route ?? "/catalog",
  );

  const candidates = await loadMatchCandidates(
    q,
    understanding.intent.category,
  );
  const recommendations = generateBuyerRecommendations(
    candidates,
    understanding.intent,
    profile,
  );

  return { understanding, recommendations };
}

export async function getProductBuyerMatch(input: {
  productId: string;
  userId: string | null;
  query?: string | null;
}): Promise<BuyerProductMatch | null> {
  if (!isBuyerIntelligenceEnabled()) return null;

  const row = await prisma.product.findFirst({
    where: { id: input.productId, status: ProductStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      stock: true,
      category: { select: { name: true } },
      seller: {
        select: {
          isVerified: true,
          rating: true,
        },
      },
    },
  });
  if (!row) return null;

  const profile = await buildBuyerProfile(input.userId);
  const intent = input.query?.trim()
    ? parseBuyerIntent(input.query)
    : parseBuyerIntent(row.name);

  const candidate: ProductMatchCandidate = {
    id: row.id,
    title: row.name,
    category: row.category?.name ?? null,
    price: decimalToNumber(row.price),
    currency: row.currency,
    stock: row.stock,
    imageUrl: null,
    seller: {
      isVerified: row.seller.isVerified,
      rating: decimalToNumber(row.seller.rating),
    },
  };

  const match = computeBuyerProductMatch(candidate, intent, profile);
  await trackServerEvent({
    event: ANALYTICS_EVENTS.BUYER_MATCH_SCORE,
    route: `/product/${input.productId}`,
    entityId: String(match.matchScore),
  });

  return match;
}

export async function getSellerBuyerFitSummary(
  productId: string,
): Promise<SellerBuyerFitSummary | null> {
  if (!isBuyerIntelligenceEnabled()) return null;

  const searches = await prisma.analyticsEvent.findMany({
    where: { event: ANALYTICS_EVENTS.SEARCH_USED },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { entityId: true },
  });

  const queryCounts = new Map<string, number>();
  for (const row of searches) {
    const q = row.entityId?.trim();
    if (!q || q.length < 2) continue;
    queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
  }

  const topQueries = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([query]) => parseBuyerIntent(query));

  return buildSellerBuyerFitSummary(productId, topQueries);
}

export async function getAdminBuyerIntelligenceSummary(): Promise<AdminBuyerIntelligenceSummary> {
  if (!isBuyerIntelligenceEnabled()) {
    return {
      popularIntents: [],
      unmetQueries: [],
      growingCategories: [],
      headlines: ["Buyer Intelligence Engine выключен (BUYER_INTELLIGENCE_ENABLED=false)"],
    };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const searches = await prisma.analyticsEvent.findMany({
    where: {
      event: ANALYTICS_EVENTS.SEARCH_USED,
      createdAt: { gte: since },
    },
    select: { entityId: true },
    take: 5000,
  });

  const queryCounts = new Map<string, number>();
  const intentCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const row of searches) {
    const q = row.entityId?.trim();
    if (!q || q.length < 2) continue;
    queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
    const intent = parseBuyerIntent(q);
    intentCounts.set(intent.intent, (intentCounts.get(intent.intent) ?? 0) + 1);
    if (intent.category) {
      categoryCounts.set(
        intent.category,
        (categoryCounts.get(intent.category) ?? 0) + 1,
      );
    }
  }

  const popularIntents = [...intentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([intent, count]) => ({
      intent: intent as AdminBuyerIntelligenceSummary["popularIntents"][0]["intent"],
      count,
      label: buyerIntentTypeLabel(
        intent as AdminBuyerIntelligenceSummary["popularIntents"][0]["intent"],
      ),
    }));

  const growingCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, searchCount]) => ({ category, searchCount }));

  const unmetQueries = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([query, count]) => {
      const intent = parseBuyerIntent(query);
      return {
        query,
        count,
        suggestedCategory: intent.category,
      };
    });

  const headlines: string[] = [];
  const repairCount = intentCounts.get("HOUSEHOLD_REPAIR") ?? 0;
  if (repairCount >= 3) {
    headlines.push(
      `${repairCount} пользователей ищут товары для ремонта — проверьте ассортимент в категории «Инструменты»`,
    );
  }
  const topUnmet = unmetQueries[0];
  if (topUnmet && topUnmet.count >= 5) {
    headlines.push(
      `Популярный запрос «${topUnmet.query}» (${topUnmet.count}×) — возможно, мало подходящих предложений`,
    );
  }
  if (headlines.length === 0) {
    headlines.push("Намерения покупателей стабильны — следите за ростом категорий");
  }

  return {
    popularIntents,
    unmetQueries,
    growingCategories,
    headlines,
  };
}

export { isBuyerIntelligenceEnabled } from "./flags";

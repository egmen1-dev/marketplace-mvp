import { ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { CategoryBenchmark } from "./types";

const GLOBAL_FALLBACK: CategoryBenchmark = {
  ctrMedian: 0.03,
  conversionMedian: 0.015,
  priceMedian: 3500,
  trustMedian: 72,
  contentQualityMedian: 68,
  sampleSize: 0,
  confidence: 0.35,
  source: "global-fallback-v1",
};

export async function loadCategoryBenchmark(
  categoryId: string | null | undefined,
): Promise<CategoryBenchmark> {
  if (!categoryId) return GLOBAL_FALLBACK;

  const products = await prisma.product.findMany({
    where: { categoryId, status: ProductStatus.ACTIVE, stock: { gt: 0 } },
    select: {
      id: true,
      price: true,
      views: true,
      favoritesCount: true,
      qualitySnapshot: { select: { overallScore: true } },
      seller: { include: { reputation: true } },
    },
    take: 200,
  });

  if (products.length < 5) {
    return {
      ...GLOBAL_FALLBACK,
      categoryId,
      sampleSize: products.length,
      confidence: 0.25,
      source: "category-sparse-fallback-v1",
    };
  }

  const ctrs: number[] = [];
  const conversions: number[] = [];
  const prices: number[] = [];
  const trusts: number[] = [];
  const qualities: number[] = [];

  for (const p of products) {
    prices.push(Number(p.price));
    if (p.views > 0) {
      ctrs.push(p.favoritesCount / p.views);
    }
    const orders = p.views > 0 ? p.favoritesCount / Math.max(p.views, 1) : 0;
    conversions.push(orders);
    const trust = p.seller.reputation?.trustScore;
    if (trust != null) trusts.push(trust);
    const q = p.qualitySnapshot?.overallScore;
    if (q != null) qualities.push(q);
  }

  const median = (values: number[]) => {
    if (values.length === 0) return undefined;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const sampleSize = products.length;
  const confidence = Math.min(0.92, 0.4 + sampleSize / 250);

  return {
    categoryId,
    ctrMedian: median(ctrs) ?? GLOBAL_FALLBACK.ctrMedian,
    conversionMedian: median(conversions) ?? GLOBAL_FALLBACK.conversionMedian,
    priceMedian: median(prices) ?? GLOBAL_FALLBACK.priceMedian,
    trustMedian: median(trusts) ?? GLOBAL_FALLBACK.trustMedian,
    contentQualityMedian: median(qualities) ?? GLOBAL_FALLBACK.contentQualityMedian,
    sampleSize,
    confidence,
    source: `category-median-v1:${categoryId}`,
  };
}

export { GLOBAL_FALLBACK };

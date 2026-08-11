import {
  OrderStatus,
  ProductStatus,
  type PrismaClient,
} from "@prisma/client";

import { riskLevel, MIN_CONFIDENCE_TO_RAISE } from "./config";
import { detectDuplicateListing } from "./detectors/duplicate-listing";
import { detectPriceOutlier } from "./detectors/price-outlier";
import { recordRiskSignal } from "./risk-event-service";
import {
  recomputeProductRiskStats,
  recomputeSellerTrustStats,
} from "./reputation";

/**
 * Batch risk scan (AGENT-019). Runs detectors over recent products, records
 * idempotent RiskEvents, and refreshes precomputed stats. Analysis-only — never
 * mutates products/orders. Safe to run repeatedly.
 */

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type ScanResult = {
  productsScanned: number;
  priceOutliers: number;
  duplicates: number;
  selfDeals: number;
};

export async function scanProductRisks(
  db: PrismaClient,
  opts?: { limit?: number },
): Promise<ScanResult> {
  const limit = Math.min(Math.max(opts?.limit ?? 300, 1), 1000);
  const products = await db.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      productTypeId: true,
      sellerId: true,
    },
  });

  // Medians per ProductType.
  const byType = new Map<string, number[]>();
  for (const p of products) {
    if (!p.productTypeId) continue;
    const list = byType.get(p.productTypeId) ?? [];
    list.push(Number(p.price));
    byType.set(p.productTypeId, list);
  }
  const medians = new Map<string, number | null>();
  for (const [k, v] of byType) medians.set(k, median(v));

  // Listings per seller (for duplicate detection).
  const bySeller = new Map<string, typeof products>();
  for (const p of products) {
    const list = bySeller.get(p.sellerId) ?? [];
    list.push(p);
    bySeller.set(p.sellerId, list);
  }

  let priceOutliers = 0;
  let duplicates = 0;
  const sellersTouched = new Set<string>();

  for (const p of products) {
    // Price outlier.
    if (p.productTypeId) {
      const peers = (byType.get(p.productTypeId) ?? []).length;
      const outlier = detectPriceOutlier({
        price: Number(p.price),
        median: medians.get(p.productTypeId) ?? null,
        sampleSize: peers,
      });
      if (outlier.score >= 40 && outlier.confidence >= MIN_CONFIDENCE_TO_RAISE) {
        await recordRiskSignal(db, {
          type: "PRICE_OUTLIER",
          source: "PRODUCTS",
          severity: riskLevel(outlier.score),
          scoreDelta: Math.round(outlier.score * 0.4),
          confidence: outlier.confidence,
          reason: outlier.reason,
          sourceEventId: `price:${p.id}`,
          productId: p.id,
          sellerId: p.sellerId,
          metadata: { detector: "price-outlier" },
        });
        priceOutliers += 1;
      }
    }

    // Duplicate listing (same seller).
    const siblings = (bySeller.get(p.sellerId) ?? []).map((s) => ({
      id: s.id,
      title: s.name,
      description: s.description,
      price: Number(s.price),
      productTypeId: s.productTypeId,
    }));
    const dup = detectDuplicateListing(
      {
        id: p.id,
        title: p.name,
        description: p.description,
        price: Number(p.price),
        productTypeId: p.productTypeId,
      },
      siblings,
    );
    if (dup.score >= 55 && dup.matchId) {
      // Stable dedupe key regardless of scan direction.
      const pair = [p.id, dup.matchId].sort().join(":");
      await recordRiskSignal(db, {
        type: "DUPLICATE_LISTING",
        source: "PRODUCTS",
        severity: riskLevel(dup.score),
        scoreDelta: Math.round(dup.score * 0.35),
        confidence: dup.confidence,
        reason: dup.reason,
        sourceEventId: `dup:${pair}`,
        productId: p.id,
        sellerId: p.sellerId,
        metadata: { detector: "duplicate-listing", matchId: dup.matchId },
      });
      duplicates += 1;
    }

    await recomputeProductRiskStats(db, p.id);
    sellersTouched.add(p.sellerId);
  }

  // Self-deal scan over paid order items (buyer == seller owner).
  const selfDeals = await scanSelfDeals(db, { limit });

  for (const sellerId of sellersTouched) {
    await recomputeSellerTrustStats(db, sellerId);
  }

  return {
    productsScanned: products.length,
    priceOutliers,
    duplicates,
    selfDeals,
  };
}

export async function scanSelfDeals(
  db: PrismaClient,
  opts?: { limit?: number },
): Promise<number> {
  const items = await db.orderItem.findMany({
    where: { order: { status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] } } },
    take: Math.min(opts?.limit ?? 500, 1000),
    select: {
      id: true,
      orderId: true,
      productId: true,
      order: { select: { userId: true } },
      product: { select: { sellerId: true, seller: { select: { userId: true } } } },
    },
  });
  let found = 0;
  for (const it of items) {
    if (it.order.userId === it.product.seller.userId) {
      await recordRiskSignal(db, {
        type: "SELF_DEAL_INDICATOR",
        source: "ORDERS",
        severity: "HIGH",
        scoreDelta: 40,
        confidence: 100,
        reason: "Покупатель и владелец товара — один аккаунт",
        sourceEventId: `selfdeal:${it.id}`,
        userId: it.order.userId,
        sellerId: it.product.sellerId,
        productId: it.productId,
        orderId: it.orderId,
        metadata: { detector: "self-deal" },
      });
      found += 1;
    }
  }
  return found;
}

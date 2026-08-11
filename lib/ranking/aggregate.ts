/**
 * Ranking aggregator — recompute ProductRankingStats + denormalized
 * Product.rankingScore from real signals. Importable from both Next server code
 * and tsx scripts (relative imports, no `@/` alias / server-only guard).
 */

import { OrderStatus, Prisma, ProductStatus, type PrismaClient } from "@prisma/client";

import { scoreProduct, type RankingProductInput } from "./engine";
import { RANKING_VERSION } from "./weights";
import { scoreContentQuality } from "../search/content-quality";

/** Order statuses that count as a real, paid sale (never NEW/CANCELLED). */
const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type SalesAgg = {
  orders: Set<string>;
  completedOrders: Set<string>;
  unitsOrdered: number;
  unitsBoughtOut: number;
  revenue: number;
};

export type RankingAggregateResult = {
  productsScored: number;
  rankingVersion: string;
  durationMs: number;
};

/**
 * Recompute ranking for all ACTIVE products from real signals. Idempotent.
 */
export async function recomputeRankingStats(
  db: PrismaClient,
): Promise<RankingAggregateResult> {
  const started = Date.now();

  const products = await db.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      views: true,
      createdAt: true,
      categoryId: true,
      productTypeId: true,
      pickupEnabled: true,
      _count: { select: { images: true, characteristicValues: true } },
      seller: { select: { isVerified: true, rating: true } },
      productType: {
        select: { characteristics: { select: { id: true, required: true } } },
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
    },
  });

  const orderItems = await db.orderItem.findMany({
    where: { order: { status: { in: PAID_STATUSES } } },
    select: {
      productId: true,
      quantity: true,
      totalPrice: true,
      orderId: true,
      order: { select: { status: true } },
    },
  });

  const salesByProduct = new Map<string, SalesAgg>();
  for (const it of orderItems) {
    const agg =
      salesByProduct.get(it.productId) ??
      {
        orders: new Set<string>(),
        completedOrders: new Set<string>(),
        unitsOrdered: 0,
        unitsBoughtOut: 0,
        revenue: 0,
      };
    agg.orders.add(it.orderId);
    agg.unitsOrdered += it.quantity;
    agg.revenue += Number(it.totalPrice);
    if (it.order.status === OrderStatus.DELIVERED) {
      agg.completedOrders.add(it.orderId);
      agg.unitsBoughtOut += it.quantity;
    }
    salesByProduct.set(it.productId, agg);
  }

  // Median price per product type (segment) for comparative price score.
  const priceByType = new Map<string, number[]>();
  for (const p of products) {
    const key = p.productTypeId ?? p.categoryId ?? "__none__";
    const list = priceByType.get(key) ?? [];
    list.push(Number(p.price));
    priceByType.set(key, list);
  }
  const medianByType = new Map<string, number | null>();
  for (const [key, list] of priceByType) medianByType.set(key, median(list));

  let scored = 0;
  for (const p of products) {
    const sales = salesByProduct.get(p.id);
    const reqDefs = p.productType?.characteristics.filter((c) => c.required) ?? [];
    const reqIds = new Set(reqDefs.map((c) => c.id));
    const filledReq = p.characteristicValues.filter(
      (v) =>
        reqIds.has(v.definitionId) &&
        (Boolean(v.valueText?.trim()) ||
          v.valueNumber != null ||
          v.valueBoolean != null ||
          v.valueJson != null),
    ).length;
    const totalDefs = p.productType?.characteristics.length ?? 0;
    const optionalDefs = totalDefs - reqDefs.length;

    const content = scoreContentQuality({
      title: p.name,
      description: p.description,
      hasCategory: Boolean(p.categoryId),
      hasProductType: Boolean(p.productTypeId),
      requiredCharacteristics: reqDefs.length,
      filledRequiredCharacteristics: filledReq,
      optionalCharacteristics: optionalDefs,
      filledOptionalCharacteristics: Math.max(
        0,
        p._count.characteristicValues - filledReq,
      ),
      imageCount: p._count.images,
      hasMainImage: p._count.images > 0,
      price: Number(p.price),
      stock: p.stock,
    });

    const medianPrice = medianByType.get(
      p.productTypeId ?? p.categoryId ?? "__none__",
    );

    const input: RankingProductInput = {
      productId: p.id,
      textRelevance: 1,
      price: Number(p.price),
      categoryMedianPrice: medianPrice ?? null,
      contentQuality: content.score,
      createdAt: p.createdAt,
      stats: {
        views: p.views,
        completedOrders: sales?.completedOrders.size ?? 0,
        unitsOrdered: sales?.unitsOrdered ?? 0,
        unitsBoughtOut: sales?.unitsBoughtOut ?? 0,
      },
      seller: {
        isVerified: p.seller.isVerified,
        rating: Number(p.seller.rating) || null,
        ratingCount: 0,
      },
      logistics: {
        stock: p.stock,
        pickupAvailable: p.pickupEnabled,
        shippingConfigured: true,
      },
    };

    const result = scoreProduct(input);
    const buyoutRate =
      input.stats.unitsOrdered > 0
        ? input.stats.unitsBoughtOut / input.stats.unitsOrdered
        : null;
    const conversionRate =
      input.stats.views > 0
        ? input.stats.completedOrders / input.stats.views
        : null;

    const statsData = {
      views: input.stats.views,
      orders: sales?.orders.size ?? 0,
      completedOrders: input.stats.completedOrders,
      unitsOrdered: input.stats.unitsOrdered,
      unitsBoughtOut: input.stats.unitsBoughtOut,
      revenue: new Prisma.Decimal((sales?.revenue ?? 0).toFixed(2)),
      conversionRate:
        conversionRate != null ? new Prisma.Decimal(conversionRate.toFixed(5)) : null,
      buyoutRate:
        buyoutRate != null ? new Prisma.Decimal(buyoutRate.toFixed(5)) : null,
      organicScore: new Prisma.Decimal(result.organicScore.toFixed(5)),
      rankingVersion: RANKING_VERSION,
    };

    await db.productRankingStats.upsert({
      where: { productId: p.id },
      create: { productId: p.id, ...statsData },
      update: statsData,
    });

    await db.product.update({
      where: { id: p.id },
      data: { rankingScore: result.finalScore },
    });
    scored += 1;
  }

  return {
    productsScored: scored,
    rankingVersion: RANKING_VERSION,
    durationMs: Date.now() - started,
  };
}

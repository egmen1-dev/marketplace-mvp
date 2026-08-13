import {
  OrderStatus,
  ProductStatus,
  PromotionCampaignStatus,
  type Prisma,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { evaluatePromotionReadiness } from "@/lib/promotion/readiness";
import type { SellerGrowthInput } from "@/lib/seller-growth/growth-score";
import { prisma } from "@/lib/prisma";

const productInclude = {
  images: { select: { id: true }, take: 1 },
  seller: { select: { isBlocked: true, isVerified: true, rating: true } },
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

export type SellerProductHealthRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  views: number;
  status: ProductStatus;
  categoryId: string | null;
  qualityScore: number;
  ready: boolean;
  blockers: string[];
  isPromoted: boolean;
  orderCount: number;
  addToCart: number;
  productViews: number;
};

export type SellerHealthSnapshot = {
  sellerId: string;
  productCount: number;
  activeProductCount: number;
  products: SellerProductHealthRow[];
  growthInput: SellerGrowthInput;
  isVerified: boolean;
  isBlocked: boolean;
  sellerRating: number;
  recentOrderCount: number;
  daysSinceLastOrder: number | null;
};

function readinessFromProduct(
  product: Prisma.ProductGetPayload<{ include: typeof productInclude }>,
) {
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

const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.READY_FOR_SHIPMENT,
  OrderStatus.SHIPPED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

export async function loadSellerHealthSnapshot(
  sellerProfileId: string,
): Promise<SellerHealthSnapshot | null> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    select: {
      id: true,
      isVerified: true,
      isBlocked: true,
      rating: true,
      products: {
        include: productInclude,
        orderBy: { updatedAt: "desc" },
        take: 100,
      },
    },
  });

  if (!seller) return null;

  const productIds = seller.products.map((p) => p.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [orderCounts, metricSignals, recentOrders, lastOrder] =
    await Promise.all([
      productIds.length
        ? prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
              productId: { in: productIds },
              order: { status: { in: PAID_STATUSES } },
            },
            _sum: { quantity: true },
          })
        : Promise.resolve([]),
      productIds.length
        ? prisma.promotionMetric.groupBy({
            by: ["productId"],
            where: { productId: { in: productIds } },
            _sum: { productViews: true, addToCart: true },
          })
        : Promise.resolve([]),
      prisma.order.count({
        where: {
          items: { some: { product: { sellerId: sellerProfileId } } },
          status: { in: PAID_STATUSES },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.order.findFirst({
        where: {
          items: { some: { product: { sellerId: sellerProfileId } } },
          status: { in: PAID_STATUSES },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  const orderMap = new Map(
    orderCounts.map((r) => [r.productId, r._sum.quantity ?? 0]),
  );
  const metricMap = new Map(
    metricSignals.map((r) => [
      r.productId,
      {
        productViews: r._sum.productViews ?? 0,
        addToCart: r._sum.addToCart ?? 0,
      },
    ]),
  );

  const products: SellerProductHealthRow[] = seller.products.map((product) => {
    const readiness = readinessFromProduct(product);
    const metric = metricMap.get(product.id);
    return {
      id: product.id,
      name: product.name,
      price: toPriceNumber(product.price),
      stock: product.stock,
      views: product.views,
      status: product.status,
      categoryId: product.categoryId,
      qualityScore: readiness.qualityScore,
      ready: readiness.ready,
      blockers: readiness.blockers,
      isPromoted:
        product.promotionCampaign?.status === PromotionCampaignStatus.STARTED,
      orderCount: orderMap.get(product.id) ?? 0,
      addToCart: metric?.addToCart ?? 0,
      productViews: metric?.productViews ?? product.views,
    };
  });

  const activeProducts = products.filter(
    (p) => p.status === ProductStatus.ACTIVE,
  );
  const readyProducts = products.filter((p) => p.ready);
  const promotedCount = products.filter((p) => p.isPromoted).length;

  const avgQuality =
    products.length > 0
      ? products.reduce((s, p) => s + p.qualityScore, 0) / products.length
      : 0;

  const catalogCompletenessRatio = clampRatio(
    Math.min(products.length / 5, 1) *
      (readyProducts.length / Math.max(products.length, 1)),
  );

  const totalViews = products.reduce((s, p) => s + p.productViews, 0);
  const totalCarts = products.reduce((s, p) => s + p.addToCart, 0);
  const totalOrders = products.reduce((s, p) => s + p.orderCount, 0);
  const conversionRate =
    totalViews > 0
      ? Math.min(100, (totalCarts / totalViews) * 100 * 2)
      : totalOrders > 0
        ? Math.min(100, (totalOrders / Math.max(totalViews, 1)) * 100 * 5)
        : 0;

  const promotionUsageRatio =
    activeProducts.length > 0
      ? promotedCount / activeProducts.length
      : 0;

  const salesVelocityScore = Math.min(
    100,
    recentOrders * 12 + totalOrders * 3,
  );

  let customerTrustScore = 50;
  if (seller.isBlocked) customerTrustScore = 10;
  else {
    if (seller.isVerified) customerTrustScore += 30;
    customerTrustScore += Math.min(20, toPriceNumber(seller.rating) * 4);
  }

  const inStockRatio =
    activeProducts.length > 0
      ? activeProducts.filter((p) => p.stock > 0).length / activeProducts.length
      : 0;
  const lowStockPenalty =
    activeProducts.filter((p) => p.stock > 0 && p.stock <= 2).length /
    Math.max(activeProducts.length, 1);
  const inventoryHealthRatio = clampRatio(inStockRatio - lowStockPenalty * 0.3);

  const daysSinceLastOrder = lastOrder
    ? Math.floor(
        (Date.now() - lastOrder.createdAt.getTime()) / (24 * 60 * 60 * 1000),
      )
    : null;

  return {
    sellerId: sellerProfileId,
    productCount: products.length,
    activeProductCount: activeProducts.length,
    products,
    growthInput: {
      avgQualityScore: avgQuality,
      catalogCompletenessRatio,
      conversionRate,
      promotionUsageRatio,
      salesVelocityScore,
      customerTrustScore,
      inventoryHealthRatio,
    },
    isVerified: seller.isVerified,
    isBlocked: seller.isBlocked,
    sellerRating: toPriceNumber(seller.rating),
    recentOrderCount: recentOrders,
    daysSinceLastOrder,
  };
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}

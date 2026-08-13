import { OrderStatus, PayoutRequestStatus, ProductStatus } from "@prisma/client";

import { computeProductCompletenessScore } from "@/lib/conversion/completeness";
import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

export type SellerProgressSignals = {
  isSeller: boolean;
  totalProducts: number;
  activeProducts: number;
  bestCompletenessScore: number;
  viewsSum: number;
  favoritesSum: number;
  cartAdds: number;
  ordersCount: number;
  completedOrdersCount: number;
  promotionCampaigns: number;
  availableBalance: number;
  pendingBalance: number;
  paidAmount: number;
  completedPayouts: number;
};

const COMPLETED_ORDER_STATUSES: OrderStatus[] = [OrderStatus.COMPLETED];

export async function loadSellerProgressSignals(
  sellerProfileId: string,
): Promise<SellerProgressSignals> {
  const [
    productAggs,
    activeProducts,
    productsForQuality,
    orderStats,
    cartAdds,
    balance,
    payoutCount,
  ] = await Promise.all([
    prisma.product.aggregate({
      where: { sellerId: sellerProfileId },
      _count: { _all: true },
      _sum: { views: true, favoritesCount: true },
    }),
    prisma.product.count({
      where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
    }),
    prisma.product.findMany({
      where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      select: {
        name: true,
        description: true,
        price: true,
        categoryId: true,
        productTypeId: true,
        _count: { select: { images: true, characteristicValues: true } },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    Promise.all([
      prisma.order.count({
        where: {
          items: { some: { product: { sellerId: sellerProfileId } } },
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      prisma.order.count({
        where: {
          items: { some: { product: { sellerId: sellerProfileId } } },
          status: { in: COMPLETED_ORDER_STATUSES },
        },
      }),
    ]),
    prisma.cartItem.count({
      where: { product: { sellerId: sellerProfileId } },
    }),
    prisma.sellerBalance.findUnique({ where: { sellerId: sellerProfileId } }),
    prisma.payoutRequest.count({
      where: {
        sellerId: sellerProfileId,
        status: PayoutRequestStatus.COMPLETED,
      },
    }),
  ]);

  let bestCompletenessScore = 0;
  for (const product of productsForQuality) {
    const result = computeProductCompletenessScore({
      photoCount: product._count.images,
      titleLength: product.name.length,
      descriptionLength: product.description?.length ?? 0,
      characteristicCount: product._count.characteristicValues,
      hasCategory: Boolean(product.categoryId),
      hasProductType: Boolean(product.productTypeId),
      price: toPriceNumber(product.price),
      hasSeller: true,
    });
    bestCompletenessScore = Math.max(bestCompletenessScore, result.score);
  }

  const [ordersCount, completedOrdersCount] = orderStats;

  return {
    isSeller: true,
    totalProducts: productAggs._count._all,
    activeProducts,
    bestCompletenessScore,
    viewsSum: productAggs._sum.views ?? 0,
    favoritesSum: productAggs._sum.favoritesCount ?? 0,
    cartAdds,
    ordersCount,
    completedOrdersCount,
    promotionCampaigns: 0,
    availableBalance: balance ? toPriceNumber(balance.availableAmount) : 0,
    pendingBalance: balance ? toPriceNumber(balance.pendingAmount) : 0,
    paidAmount: balance ? toPriceNumber(balance.paidAmount) : 0,
    completedPayouts: payoutCount,
  };
}

export function emptySellerSignals(): SellerProgressSignals {
  return {
    isSeller: false,
    totalProducts: 0,
    activeProducts: 0,
    bestCompletenessScore: 0,
    viewsSum: 0,
    favoritesSum: 0,
    cartAdds: 0,
    ordersCount: 0,
    completedOrdersCount: 0,
    promotionCampaigns: 0,
    availableBalance: 0,
    pendingBalance: 0,
    paidAmount: 0,
    completedPayouts: 0,
  };
}

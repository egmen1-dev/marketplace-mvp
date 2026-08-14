import { prisma } from "@/lib/prisma";

import { classifyBuyerSegment } from "./segments";
import { isMarketplaceConversionEnabled } from "./flags";
import type { BuyerSegment } from "./segments";

export type BuyerConversionContext = {
  enabled: boolean;
  segment: BuyerSegment | null;
  ordersCount: number;
  cartItemCount: number;
  productViewsCount: number;
};

export async function getBuyerConversionContext(
  userId: string,
): Promise<BuyerConversionContext> {
  if (!isMarketplaceConversionEnabled()) {
    return {
      enabled: false,
      segment: null,
      ordersCount: 0,
      cartItemCount: 0,
      productViewsCount: 0,
    };
  }

  const [user, ordersCount, cart, views, topCategory] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
    prisma.order.count({ where: { userId } }),
    prisma.cart.findUnique({
      where: { userId },
      select: { _count: { select: { items: true } } },
    }),
    prisma.productView.count({ where: { userId } }),
    prisma.productView.findMany({
      where: { userId },
      take: 30,
      select: { product: { select: { category: { select: { name: true } } } } },
    }),
  ]);

  const categoryCounts = new Map<string, number>();
  for (const v of topCategory) {
    const name = v.product.category?.name;
    if (!name) continue;
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }
  let topCategoryName: string | null = null;
  let topCount = 0;
  for (const [name, count] of categoryCounts) {
    if (count > topCount) {
      topCount = count;
      topCategoryName = name;
    }
  }

  const accountAgeDays = user
    ? Math.floor((Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  const segment = classifyBuyerSegment({
    ordersCount,
    cartItemCount: cart?._count.items ?? 0,
    productViewsCount: views,
    topCategoryName,
    accountAgeDays,
  });

  return {
    enabled: true,
    segment,
    ordersCount,
    cartItemCount: cart?._count.items ?? 0,
    productViewsCount: views,
  };
}

import { ProductStatus } from "@prisma/client";

import { isLowStock } from "@/features/seller/queries";
import { prisma } from "@/lib/prisma";

import type { InventoryInsight } from "./types";

const STALE_DAYS = 30;

export async function loadInventoryInsights(
  sellerProfileId: string,
): Promise<InventoryInsight[]> {
  const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      views: true,
      createdAt: true,
      inventory: { select: { quantity: true } },
      _count: { select: { orderItems: true } },
    },
    orderBy: { views: "desc" },
    take: 30,
  });

  const insights: InventoryInsight[] = [];

  for (const product of products) {
    const qty = product.inventory?.quantity ?? 0;
    const orders = product._count.orderItems;

    if (orders >= 3 && product.views >= 10) {
      insights.push({
        id: `popular-${product.id}`,
        productId: product.id,
        productName: product.name,
        kind: "popular",
        label: "Популярные",
        detail: "Продажи растут — следите за остатком",
      });
      continue;
    }

    if (isLowStock(qty)) {
      insights.push({
        id: `low-${product.id}`,
        productId: product.id,
        productName: product.name,
        kind: "low_stock",
        label: "Заканчиваются",
        detail: `Осталось: ${qty} шт.`,
      });
      continue;
    }

    if (
      product.createdAt < staleBefore &&
      product.views === 0 &&
      orders === 0
    ) {
      insights.push({
        id: `stale-${product.id}`,
        productId: product.id,
        productName: product.name,
        kind: "attention",
        label: "Внимание",
        detail: "Нет просмотров 30+ дней",
      });
    }
  }

  return insights.slice(0, 6);
}

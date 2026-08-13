import { ProductStatus } from "@prisma/client";

import { getProductCompletenessMap } from "@/lib/conversion";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

import type { ProductAttentionItem } from "./types";

const QUALITY_THRESHOLD = 70;
const NO_SALES_VIEW_THRESHOLD = 20;

export async function loadProductAttentionItems(
  sellerProfileId: string,
): Promise<ProductAttentionItem[]> {
  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      views: true,
      inventory: { select: { quantity: true } },
      _count: { select: { orderItems: true } },
    },
    orderBy: { views: "desc" },
    take: 20,
  });

  if (products.length === 0) return [];

  const qualityMap = await getProductCompletenessMap(products.map((p) => p.id));
  const items: ProductAttentionItem[] = [];

  for (const product of products) {
    const quality = qualityMap.get(product.id);
    const score = quality?.score ?? 0;
    const stock = product.inventory?.quantity ?? 0;
    const orders = product._count.orderItems;

    if (product.views >= NO_SALES_VIEW_THRESHOLD && orders === 0) {
      items.push({
        id: `no-sales-${product.id}`,
        productId: product.id,
        productName: product.name,
        type: "no_sales",
        headline: "Товар смотрят, но не покупают",
        reason: `${product.views} просмотров, 0 заказов`,
        suggestion: "Улучшите карточку и проверьте цену",
        views: product.views,
        ctaLabel: "Исправить",
        ctaHref: sellerProductEditPath(product.id),
      });
      continue;
    }

    if (stock > 0 && stock <= 5) {
      items.push({
        id: `low-stock-${product.id}`,
        productId: product.id,
        productName: product.name,
        type: "low_stock",
        headline: "Мало остатков",
        reason: `Осталось: ${stock} шт.`,
        suggestion: "Рекомендуем пополнить запас",
        stockLeft: stock,
        ctaLabel: "Добавить остаток",
        ctaHref: sellerProductEditPath(product.id),
      });
      continue;
    }

    if (score < QUALITY_THRESHOLD) {
      const missing = quality?.improvements.slice(0, 2).join(", ") ?? "фото, характеристики";
      items.push({
        id: `weak-${product.id}`,
        productId: product.id,
        productName: product.name,
        type: "weak_card",
        headline: "Слабая карточка",
        reason: `Качество: ${score} / 100`,
        suggestion: `Не хватает: ${missing}`,
        qualityScore: score,
        ctaLabel: "Исправить",
        ctaHref: sellerProductEditPath(product.id),
      });
    }
  }

  return items.slice(0, 6);
}

export function buildOperationsEmptyState(input: {
  activeProducts: number;
  totalProducts: number;
  ordersCount: number;
}): import("./types").OperationsEmptyState {
  if (input.totalProducts === 0) {
    return {
      kind: "no_products",
      title: "Ваш магазин пуст",
      body: "Первый шаг — создайте товар. AI поможет:",
      bullets: ["✓ название", "✓ характеристики", "✓ описание"],
      ctaLabel: "Создать товар",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
    };
  }

  if (input.activeProducts > 0 && input.ordersCount === 0) {
    return {
      kind: "no_sales",
      title: "Товары уже опубликованы",
      body: "Теперь цель — получить первые заказы. Рекомендуем:",
      bullets: ["улучшить карточку", "проверить цену", "рассмотреть продвижение"],
      ctaLabel: "Получить рекомендации",
      ctaHref: ROUTES.ACCOUNT_GROWTH,
    };
  }

  return null;
}

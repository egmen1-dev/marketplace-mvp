import { prisma } from "@/lib/prisma";
import { toPriceNumber } from "@/features/products/mappers";
import type { BuyerProfile, BuyerType, PriceSensitivity } from "./types";

function inferBuyerType(categories: string[]): BuyerType {
  const joined = categories.join(" ").toLowerCase();
  if (/инструмент|дрел|ремонт|сад|дом/.test(joined)) return "HOME_USER";
  if (/профессион|pro|коммерч|строй/.test(joined)) return "PRO_USER";
  if (/электрон|ноутбук|iphone|смартфон/.test(joined)) return "GENERAL";
  return "GENERAL";
}

function inferPriceSensitivity(
  prices: number[],
  cartPrices: number[],
): PriceSensitivity {
  const all = [...prices, ...cartPrices].filter((p) => p > 0);
  if (all.length === 0) return "MEDIUM";
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  if (avg < 3000) return "HIGH";
  if (avg > 15000) return "LOW";
  return "MEDIUM";
}

/** Build buyer profile from account signals (advisory only). */
export async function buildBuyerProfile(
  userId: string | null,
): Promise<BuyerProfile> {
  if (!userId) {
    return {
      buyerType: "GENERAL",
      favoriteCategories: [],
      priceSensitivity: "MEDIUM",
      recentSearchQueries: [],
      viewedProductCount: 0,
      cartItemCount: 0,
      purchaseCount: 0,
      averageViewPrice: null,
      viewedProductIds: [],
    };
  }

  const [views, cart, orders] = await Promise.all([
    prisma.productView.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        product: {
          select: {
            id: true,
            price: true,
            category: { select: { name: true } },
          },
        },
      },
    }),
    prisma.cartItem.findMany({
      where: { cart: { userId } },
      include: {
        product: {
          select: {
            id: true,
            price: true,
            category: { select: { name: true } },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { userId, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, category: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  const viewedProductIds = views.map((v) => v.productId);
  const categories = [
    ...views.map((v) => v.product.category?.name),
    ...cart.map((c) => c.product.category?.name),
    ...orders.flatMap((o) => o.items.map((i) => i.product.category?.name)),
  ].filter((c): c is string => Boolean(c));

  const categoryCounts = new Map<string, number>();
  for (const c of categories) {
    categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
  }
  const favoriteCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  const viewPrices = views.map((v) => toPriceNumber(v.product.price));
  const cartPrices = cart.map((c) => toPriceNumber(c.product.price));
  const averageViewPrice =
    viewPrices.length > 0
      ? Math.round(viewPrices.reduce((a, b) => a + b, 0) / viewPrices.length)
      : null;

  const purchaseCount = orders.reduce((n, o) => n + o.items.length, 0);

  return {
    buyerType: inferBuyerType(categories),
    favoriteCategories,
    priceSensitivity: inferPriceSensitivity(viewPrices, cartPrices),
    recentSearchQueries: [],
    viewedProductCount: views.length,
    cartItemCount: cart.length,
    purchaseCount,
    averageViewPrice,
    viewedProductIds,
  };
}

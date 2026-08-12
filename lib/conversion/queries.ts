import { prisma } from "@/lib/prisma";
import {
  computeProductCompletenessScore,
  type CompletenessResult,
} from "./completeness";

export async function getProductCompletenessMap(
  productIds: string[],
): Promise<Map<string, CompletenessResult>> {
  const map = new Map<string, CompletenessResult>();
  if (productIds.length === 0) return map;

  const rows = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      categoryId: true,
      productTypeId: true,
      sellerId: true,
      _count: {
        select: {
          images: true,
          characteristicValues: true,
        },
      },
    },
  });

  for (const row of rows) {
    map.set(
      row.id,
      computeProductCompletenessScore({
        photoCount: row._count.images,
        titleLength: row.name.trim().length,
        descriptionLength: (row.description ?? "").trim().length,
        characteristicCount: row._count.characteristicValues,
        hasCategory: Boolean(row.categoryId),
        hasProductType: Boolean(row.productTypeId),
        price: Number(row.price),
        hasSeller: Boolean(row.sellerId),
      }),
    );
  }

  return map;
}

export async function listLowCompletenessProducts(limit = 20) {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      categoryId: true,
      productTypeId: true,
      sellerId: true,
      _count: { select: { images: true, characteristicValues: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return products
    .map((row) => {
      const completeness = computeProductCompletenessScore({
        photoCount: row._count.images,
        titleLength: row.name.trim().length,
        descriptionLength: (row.description ?? "").trim().length,
        characteristicCount: row._count.characteristicValues,
        hasCategory: Boolean(row.categoryId),
        hasProductType: Boolean(row.productTypeId),
        price: Number(row.price),
        hasSeller: Boolean(row.sellerId),
      });
      return {
        id: row.id,
        title: row.name,
        photoCount: row._count.images,
        completeness,
      };
    })
    .filter((p) => p.completeness.score < 70 || p.photoCount === 0)
    .sort((a, b) => a.completeness.score - b.completeness.score)
    .slice(0, limit);
}


export type ConversionDashboard = {
  windowDays: number;
  since: Date;
  pdpViews: number;
  addToCart: number;
  checkoutStarts: number;
  purchases: number;
  addToCartRate: number | null;
  checkoutRate: number | null;
  lowConverters: Array<{
    productId: string;
    title: string;
    views: number;
    addToCart: number;
    viewToCartRate: number | null;
  }>;
  noPhoto: Array<{ id: string; title: string; score: number }>;
  lowQuality: Array<{ id: string; title: string; score: number; photoCount: number }>;
};

export async function getConversionDashboard(
  windowDays = 7,
): Promise<ConversionDashboard> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [grouped, viewGroups, cartGroups, qualityRows] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["event"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId"],
      where: {
        event: "product_view",
        createdAt: { gte: since },
        entityId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { entityId: "desc" } },
      take: 50,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId"],
      where: {
        event: "add_to_cart",
        createdAt: { gte: since },
        entityId: { not: null },
      },
      _count: { _all: true },
    }),
    listLowCompletenessProducts(40),
  ]);

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    counts[row.event] = row._count._all;
  }

  const pdpViews = counts.product_view ?? 0;
  const addToCart = counts.add_to_cart ?? 0;
  const checkoutStarts = counts.checkout_start ?? 0;
  const purchases = counts.purchase_complete ?? 0;

  const cartByProduct = new Map(
    cartGroups
      .filter((g) => g.entityId)
      .map((g) => [g.entityId!, g._count._all]),
  );

  const productIds = viewGroups
    .map((g) => g.entityId)
    .filter((id): id is string => Boolean(id));

  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];
  const titleById = new Map(products.map((p) => [p.id, p.name]));

  const lowConverters = viewGroups
    .filter((g) => g.entityId)
    .map((g) => {
      const productId = g.entityId!;
      const views = g._count._all;
      const cart = cartByProduct.get(productId) ?? 0;
      const viewToCartRate =
        views > 0 ? Math.round((cart / views) * 1000) / 10 : null;
      return {
        productId,
        title: titleById.get(productId) ?? productId.slice(0, 8),
        views,
        addToCart: cart,
        viewToCartRate,
      };
    })
    .filter((r) => r.views >= 3 && (r.viewToCartRate ?? 0) < 10)
    .sort((a, b) => (a.viewToCartRate ?? 0) - (b.viewToCartRate ?? 0))
    .slice(0, 15);

  return {
    windowDays,
    since,
    pdpViews,
    addToCart,
    checkoutStarts,
    purchases,
    addToCartRate:
      pdpViews > 0 ? Math.round((addToCart / pdpViews) * 1000) / 10 : null,
    checkoutRate:
      addToCart > 0
        ? Math.round((checkoutStarts / addToCart) * 1000) / 10
        : null,
    lowConverters,
    noPhoto: qualityRows
      .filter((p) => p.photoCount === 0)
      .map((p) => ({
        id: p.id,
        title: p.title,
        score: p.completeness.score,
      })),
    lowQuality: qualityRows
      .filter((p) => p.completeness.score < 70)
      .map((p) => ({
        id: p.id,
        title: p.title,
        score: p.completeness.score,
        photoCount: p.photoCount,
      })),
  };
}

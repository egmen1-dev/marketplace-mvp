import { Prisma, ProductStatus } from "@prisma/client";

import { mapProductListItem } from "@/features/products/mappers";
import type { ProductListItem } from "@/features/products/types";
import { prisma } from "@/lib/prisma";

const productListInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  seller: { select: { id: true, storeName: true, slug: true } },
} satisfies Prisma.ProductInclude;

export class FavoriteServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FavoriteServiceError";
  }
}

export async function listFavoriteIds(userId: string): Promise<string[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { productId: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => r.productId);
}

export async function listFavoriteProducts(
  userId: string,
): Promise<ProductListItem[]> {
  const rows = await prisma.favorite.findMany({
    where: {
      userId,
      product: { status: ProductStatus.ACTIVE },
    },
    orderBy: { createdAt: "desc" },
    include: {
      product: { include: productListInclude },
    },
  });
  return rows.map((r) => mapProductListItem(r.product));
}

export type ToggleFavoriteResult = {
  isFavorite: boolean;
  favoritesCount: number;
};

/**
 * Add or remove a favorite for the given user.
 * Keeps Product.favoritesCount in sync (never below 0).
 */
export async function toggleFavorite(
  userId: string,
  productId: string,
): Promise<ToggleFavoriteResult> {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: ProductStatus.ACTIVE },
    select: { id: true, favoritesCount: true },
  });
  if (!product) {
    throw new FavoriteServiceError("Товар не найден");
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_productId: { userId, productId },
    },
    select: { id: true },
  });

  if (existing) {
    const nextCount = Math.max(0, product.favoritesCount - 1);
    const [, updated] = await prisma.$transaction([
      prisma.favorite.delete({ where: { id: existing.id } }),
      prisma.product.update({
        where: { id: productId },
        data: { favoritesCount: nextCount },
        select: { favoritesCount: true },
      }),
    ]);
    return { isFavorite: false, favoritesCount: updated.favoritesCount };
  }

  const [, updated] = await prisma.$transaction([
    prisma.favorite.create({
      data: { userId, productId },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { favoritesCount: { increment: 1 } },
      select: { favoritesCount: true },
    }),
  ]);

  return { isFavorite: true, favoritesCount: updated.favoritesCount };
}

export async function isFavorite(
  userId: string,
  productId: string,
): Promise<boolean> {
  const row = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  return Boolean(row);
}

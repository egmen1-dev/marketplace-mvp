import { Prisma, ProductStatus } from "@prisma/client";

import { mapProductListItem } from "@/features/products/mappers";
import type { ProductListItem } from "@/features/products/types";
import type { UserProfile } from "@/features/account/types";
import type { UpdateProfileInput } from "@/features/account/schemas";
import { prisma } from "@/lib/prisma";

const HISTORY_LIMIT = 20;

const productListInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  seller: { select: { id: true, storeName: true, slug: true } },
} satisfies Prisma.ProductInclude;

function mapProfile(row: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  image: string | null;
  createdAt: Date;
}): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    city: row.city,
    avatarUrl: row.image,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Load profile for the given user (session-scoped by caller). */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      city: true,
      image: true,
      createdAt: true,
    },
  });
  return row ? mapProfile(row) : null;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name?.trim() ? input.name.trim() : null,
      phone: input.phone?.trim() ? input.phone.trim() : null,
      city: input.city?.trim() ? input.city.trim() : null,
      image: input.avatarUrl?.trim() ? input.avatarUrl.trim() : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      city: true,
      image: true,
      createdAt: true,
    },
  });
  return mapProfile(row);
}

/**
 * Record a PDP view for an authenticated user.
 * Dedupes by (userId, productId): bumps createdAt on revisit.
 */
export async function recordProductView(
  userId: string,
  productId: string,
): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: ProductStatus.ACTIVE },
    select: { id: true },
  });
  if (!product) return;

  const now = new Date();
  await prisma.productView.upsert({
    where: {
      userId_productId: { userId, productId },
    },
    create: { userId, productId, createdAt: now },
    update: { createdAt: now },
  });
}

/** Last N viewed ACTIVE products for a user, newest first. */
export async function listRecentlyViewedProducts(
  userId: string,
  limit = HISTORY_LIMIT,
): Promise<ProductListItem[]> {
  const views = await prisma.productView.findMany({
    where: {
      userId,
      product: { status: ProductStatus.ACTIVE },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      product: { include: productListInclude },
    },
  });

  return views.map((v) => mapProductListItem(v.product));
}

export { HISTORY_LIMIT };

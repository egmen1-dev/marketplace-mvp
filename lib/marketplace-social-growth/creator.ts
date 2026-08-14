import { SocialCollectionKind } from "@prisma/client";

import { getProductById } from "@/features/products";
import { prisma } from "@/lib/prisma";
import { buildWhyReasons } from "@/lib/marketplace-discovery/recommendation-context";
import { ROUTES } from "@/lib/constants";

import { isSocialCollectionsEnabled, isSocialCreatorEnabled } from "./flags";
import type { CreatorCollectionView, UserCollectionSummary } from "./types";
import { trackCreatorCollectionView } from "./analytics";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "collection";
}

export function socialCollectionSharePath(slug: string): string {
  return `${ROUTES.SOCIAL_COLLECTIONS}/${slug}`;
}

export async function listUserCollections(userId: string): Promise<UserCollectionSummary[]> {
  if (!isSocialCollectionsEnabled()) return [];

  const rows = await prisma.socialCollection.findMany({
    where: { creatorId: userId, kind: SocialCollectionKind.USER },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    productCount: c._count.items,
    coverImageUrl: c.coverImageUrl,
    sharePath: socialCollectionSharePath(c.slug),
  }));
}

export async function createUserCollection(input: {
  userId: string;
  title: string;
  description?: string;
}): Promise<UserCollectionSummary | null> {
  if (!isSocialCollectionsEnabled()) return null;

  const base = slugify(input.title);
  let slug = base;
  let i = 1;
  while (
    await prisma.socialCollection.findUnique({
      where: { creatorId_slug: { creatorId: input.userId, slug } },
    })
  ) {
    slug = `${base}-${i++}`;
  }

  const created = await prisma.socialCollection.create({
    data: {
      creatorId: input.userId,
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      kind: SocialCollectionKind.USER,
    },
    include: { _count: { select: { items: true } } },
  });

  return {
    id: created.id,
    slug: created.slug,
    title: created.title,
    description: created.description,
    productCount: 0,
    coverImageUrl: created.coverImageUrl,
    sharePath: socialCollectionSharePath(created.slug),
  };
}

export async function addProductToUserCollection(input: {
  userId: string;
  collectionId: string;
  productId: string;
}): Promise<boolean> {
  if (!isSocialCollectionsEnabled()) return false;

  const collection = await prisma.socialCollection.findFirst({
    where: { id: input.collectionId, creatorId: input.userId },
  });
  if (!collection) return false;

  await prisma.socialCollectionItem.upsert({
    where: {
      collectionId_productId: {
        collectionId: input.collectionId,
        productId: input.productId,
      },
    },
    create: {
      collectionId: input.collectionId,
      productId: input.productId,
    },
    update: {},
  });

  return true;
}

export async function createCreatorCollection(input: {
  userId: string;
  title: string;
  description?: string;
  productIds: string[];
}): Promise<CreatorCollectionView | null> {
  if (!isSocialCreatorEnabled()) return null;

  const base = slugify(input.title);
  let slug = base;
  let i = 1;
  while (
    await prisma.socialCollection.findFirst({ where: { slug, kind: SocialCollectionKind.CREATOR } })
  ) {
    slug = `${base}-${i++}`;
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });

  const created = await prisma.socialCollection.create({
    data: {
      creatorId: input.userId,
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      kind: SocialCollectionKind.CREATOR,
      items: {
        create: input.productIds.slice(0, 24).map((productId, index) => ({
          productId,
          sortOrder: index,
        })),
      },
    },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  const items = await Promise.all(
    created.items.map(async (row) => {
      const product = await getProductById(row.productId, null);
      if (!product) return null;
      return {
        product,
        reasons: (await buildWhyReasons(product)).map((r) => r.label),
      };
    }),
  ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r != null));

  return {
    id: created.id,
    slug: created.slug,
    title: created.title,
    description: created.description,
    creatorName: user?.name?.trim() || "Автор ЛОТ",
    views: created.views,
    likes: created.likes,
    items,
    sharePath: socialCollectionSharePath(created.slug),
  };
}

export async function getPublicCollectionMeta(slug: string) {
  if (!isSocialCollectionsEnabled()) return null;
  return prisma.socialCollection.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      views: true,
      likes: true,
      creator: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function loadPublicCollection(slug: string): Promise<CreatorCollectionView | null> {
  if (!isSocialCollectionsEnabled()) return null;

  const collection = await prisma.socialCollection.findFirst({
    where: { slug },
    include: {
      creator: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!collection) return null;

  trackCreatorCollectionView(collection.id);

  await prisma.socialCollection.update({
    where: { id: collection.id },
    data: { views: { increment: 1 } },
  });

  const items = await Promise.all(
    collection.items.map(async (row) => {
      const product = await getProductById(row.productId, null);
      if (!product) return null;
      return {
        product,
        reasons: (await buildWhyReasons(product)).map((r) => r.label),
      };
    }),
  ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r != null));

  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    creatorName: collection.creator.name?.trim() || "Покупатель ЛОТ",
    views: collection.views + 1,
    likes: collection.likes,
    items,
    sharePath: socialCollectionSharePath(collection.slug),
  };
}

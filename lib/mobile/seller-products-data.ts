import { ModerationStatus, ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { mapProductListItem } from "@/features/products/mappers";
import { parseMobilePageCursor, toMobilePagination } from "@/lib/mobile/pagination";
import { buildSellerProductPublishContract } from "@/lib/mobile/seller-product-publish";
import { prisma } from "@/lib/prisma";

export type SellerLotsTab = "active" | "pending" | "drafts" | "sold";

const listInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  seller: { select: { id: true, storeName: true, slug: true } },
  productModeration: { select: { status: true } },
};

function mapSellerListItem(row: {
  productModeration?: { status: ModerationStatus } | null;
} & Parameters<typeof mapProductListItem>[0]) {
  const base = mapProductListItem(row);
  const moderationState = row.productModeration?.status ?? null;
  return {
    ...base,
    ...buildSellerProductPublishContract({
      id: base.id,
      status: base.status,
      moderationState,
    }),
  };
}

async function listSellerLotsByTab(
  sellerId: string,
  tab: SellerLotsTab,
  page: number,
  pageSize: number,
) {
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  if (tab === "pending") {
    const where = {
      sellerId,
      status: { not: ProductStatus.ACTIVE },
      productModeration: {
        status: { in: [ModerationStatus.PENDING_REVIEW, ModerationStatus.NEEDS_FIX] },
      },
    };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);
    return {
      items: rows.map(mapSellerListItem),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  if (tab === "drafts") {
    const where = {
      sellerId,
      status: ProductStatus.DRAFT,
      OR: [
        { productModeration: { is: null } },
        {
          productModeration: {
            status: {
              in: [ModerationStatus.REJECTED, ModerationStatus.APPROVED],
            },
          },
        },
      ],
    };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);
    return {
      items: rows.map(mapSellerListItem),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  const status = tab === "sold" ? ProductStatus.ARCHIVED : ProductStatus.ACTIVE;
  const where = { sellerId, status };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: listInclude,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(mapSellerListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function buildMobileSellerProductsFromRequest(
  request: Request,
  cursor?: string | null,
  tab?: string | null,
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const page = parseMobilePageCursor(cursor);
  const resolvedTab: SellerLotsTab =
    tab === "drafts" || tab === "pending" || tab === "sold" ? tab : "active";
  const result = await listSellerLotsByTab(user.sellerProfileId, resolvedTab, page, 20);

  return toMobilePagination(result);
}

export async function buildMobileSellerProductDetailFromRequest(request: Request, productId: string) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return null;
  }

  const row = await prisma.product.findFirst({
    where: { id: productId, sellerId: user.sellerProfileId },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      productType: {
        select: {
          id: true,
          name: true,
          lotName: true,
          slug: true,
          categoryId: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
      },
      seller: { select: { id: true, storeName: true, slug: true } },
      productModeration: { select: { status: true } },
      pickupPoints: { include: { pickupPoint: true } },
    },
  });

  if (!row) return null;

  const moderationState = row.productModeration?.status ?? null;
  const publish = buildSellerProductPublishContract({
    id: row.id,
    status: row.status,
    moderationState,
  });

  return {
    ...publish,
    title: row.name,
    description: row.description,
    price: Number(row.price),
    city: row.city,
    condition: row.condition,
    stock: row.stock,
    pickupEnabled: row.pickupEnabled,
    category: row.category,
    productType: row.productType
      ? {
          id: row.productType.id,
          name: row.productType.lotName ?? row.productType.name,
        }
      : null,
    images: row.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    })),
    pickupPoints: row.pickupPoints
      .map((link) => link.pickupPoint)
      .filter((point) => point.isActive)
      .map((point) => ({
        id: point.id,
        name: point.name,
        city: point.city,
        address: point.address,
      })),
  };
}

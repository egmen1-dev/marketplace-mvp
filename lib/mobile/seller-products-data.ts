import { ModerationStatus, OrderStatus, Prisma, ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { toPriceNumber } from "@/features/products/mappers";
import { searchTokenVariants, tokenizeSearchQuery } from "@/features/products/search-query";
import { LOW_STOCK_THRESHOLD } from "@/features/orders/lib/inventory-sync";
import { resolvePublicImageUrl } from "@/lib/images";
import { parseMobilePageCursor, toMobilePagination } from "@/lib/mobile/pagination";
import { prisma } from "@/lib/prisma";

import type {
  MobileSellerProductDetail,
  MobileSellerProductFilter,
  MobileSellerProductItem,
  MobileSellerProductsPage,
  MobileSellerProductsSummary,
  MobileSellerProductSort,
} from "./seller-products-types";

const COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

const MODERATION_VIEW_STATUSES: ModerationStatus[] = [
  ModerationStatus.PENDING_REVIEW,
  ModerationStatus.NEEDS_FIX,
  ModerationStatus.REJECTED,
];

function sellerSearchOr(query: string): Prisma.ProductWhereInput[] {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return [];

  const buildTokenOr = (token: string): Prisma.ProductWhereInput[] => {
    const variants = searchTokenVariants(token);
    const or: Prisma.ProductWhereInput[] = [];
    for (const v of variants) {
      or.push(
        { name: { contains: v, mode: "insensitive" } },
        { sku: { contains: v, mode: "insensitive" } },
        { slug: { contains: v, mode: "insensitive" } },
        { modelName: { contains: v, mode: "insensitive" } },
      );
    }
    return or;
  };

  if (tokens.length === 1) {
    return [{ OR: buildTokenOr(tokens[0]) }];
  }
  return tokens.map((token) => ({ OR: buildTokenOr(token) }));
}

function resolveSortOrder(sort: MobileSellerProductSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "newest":
      return { createdAt: "desc" };
    case "oldest":
      return { createdAt: "asc" };
    case "stock_asc":
      return { stock: "asc" };
    case "stock_desc":
      return { stock: "desc" };
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "updated_desc":
    default:
      return { updatedAt: "desc" };
  }
}

function buildOperationalWhere(
  sellerProfileId: string,
  filter: MobileSellerProductFilter,
): Prisma.ProductWhereInput {
  const base: Prisma.ProductWhereInput = { sellerId: sellerProfileId };

  switch (filter) {
    case "active":
      return { ...base, status: ProductStatus.ACTIVE, stock: { gt: 0 } };
    case "drafts":
      return { ...base, status: ProductStatus.DRAFT };
    case "hidden":
      return { ...base, status: ProductStatus.ARCHIVED };
    case "out_of_stock":
      return {
        ...base,
        OR: [
          { status: ProductStatus.OUT_OF_STOCK },
          { status: ProductStatus.ACTIVE, stock: { lte: 0 } },
        ],
      };
    case "low_stock":
      return {
        ...base,
        status: ProductStatus.ACTIVE,
        inventory: {
          quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
        },
      };
    case "moderation":
      return {
        ...base,
        productModeration: { status: { in: MODERATION_VIEW_STATUSES } },
      };
    case "needs_fix":
      return {
        ...base,
        productModeration: { status: ModerationStatus.NEEDS_FIX },
      };
    case "all":
    default:
      return base;
  }
}

function formatModerationReason(notes: string | null, issues: unknown): string | null {
  if (notes?.trim()) return notes.trim();
  if (Array.isArray(issues)) {
    const parts = issues.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (parts.length > 0) return parts.join("; ");
  }
  if (issues && typeof issues === "object" && !Array.isArray(issues)) {
    const values = Object.values(issues as Record<string, unknown>).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    if (values.length > 0) return values.join("; ");
  }
  return null;
}

function mapRowToItem(
  row: {
    id: string;
    name: string;
    sku: string | null;
    price: Prisma.Decimal;
    compareAt: Prisma.Decimal | null;
    currency: string;
    stock: number;
    status: ProductStatus;
    views: number;
    favoritesCount: number;
    updatedAt: Date;
    createdAt: Date;
    images: Array<{ url: string; isPrimary: boolean }>;
    productModeration: {
      status: ModerationStatus;
      notes: string | null;
      issues: unknown;
      updatedAt: Date;
    } | null;
  },
  ordersCount: number,
): MobileSellerProductItem {
  const primary = row.images.find((img) => img.isPrimary) ?? row.images[0] ?? null;
  return {
    id: row.id,
    title: row.name,
    sku: row.sku,
    price: toPriceNumber(row.price),
    compareAt: row.compareAt != null ? toPriceNumber(row.compareAt) : null,
    currency: row.currency,
    stock: row.stock,
    status: row.status,
    views: row.views,
    favoritesCount: row.favoritesCount,
    ordersCount,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    primaryImage: primary
      ? { url: resolvePublicImageUrl(primary.url) ?? primary.url }
      : null,
    moderation: row.productModeration
      ? {
          status: row.productModeration.status,
          reason: formatModerationReason(row.productModeration.notes, row.productModeration.issues),
          updatedAt: row.productModeration.updatedAt.toISOString(),
        }
      : null,
  };
}

export async function buildMobileSellerProductsSummary(
  sellerProfileId: string,
): Promise<MobileSellerProductsSummary> {
  const [active, drafts, hidden, outOfStockStatus, outOfStockActive, lowStock, moderation, needsFix] =
    await Promise.all([
      prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE, stock: { gt: 0 } } }),
      prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.DRAFT } }),
      prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.ARCHIVED } }),
      prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.OUT_OF_STOCK } }),
      prisma.product.count({
        where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE, stock: { lte: 0 } },
      }),
      prisma.productInventory.count({
        where: {
          product: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
          quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
        },
      }),
      prisma.productModeration.count({
        where: {
          status: { in: MODERATION_VIEW_STATUSES },
          product: { sellerId: sellerProfileId },
        },
      }),
      prisma.productModeration.count({
        where: {
          status: ModerationStatus.NEEDS_FIX,
          product: { sellerId: sellerProfileId },
        },
      }),
    ]);

  return {
    active,
    drafts,
    moderation,
    needsFix,
    outOfStock: outOfStockStatus + outOfStockActive,
    lowStock,
    hidden,
  };
}

export async function buildMobileSellerProductsFromRequest(
  request: Request,
  params: {
    cursor?: string | null;
    query?: string | null;
    filter?: string | null;
    sort?: string | null;
  },
): Promise<MobileSellerProductsPage> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [], nextCursor: null, hasMore: false, total: 0 };
  }

  const page = parseMobilePageCursor(params.cursor);
  const pageSize = 20;
  const filter = (params.filter ?? "all") as MobileSellerProductFilter;
  const sort = (params.sort ?? "updated_desc") as MobileSellerProductSort;
  const safeFilter = (
    ["all", "active", "drafts", "moderation", "needs_fix", "low_stock", "out_of_stock", "hidden"] as const
  ).includes(filter as MobileSellerProductFilter)
    ? filter
    : "all";
  const safeSort = (
    [
      "updated_desc",
      "newest",
      "oldest",
      "stock_asc",
      "stock_desc",
      "price_asc",
      "price_desc",
    ] as const
  ).includes(sort as MobileSellerProductSort)
    ? sort
    : "updated_desc";

  const where: Prisma.ProductWhereInput = buildOperationalWhere(user.sellerProfileId, safeFilter);
  const searchClauses = params.query?.trim() ? sellerSearchOr(params.query.trim()) : [];
  if (searchClauses.length > 0) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), ...searchClauses];
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: resolveSortOrder(safeSort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        compareAt: true,
        currency: true,
        stock: true,
        status: true,
        views: true,
        favoritesCount: true,
        updatedAt: true,
        createdAt: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
          select: { url: true, isPrimary: true },
        },
        productModeration: {
          select: { status: true, notes: true, issues: true, updatedAt: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const productIds = rows.map((row) => row.id);
  const orderCounts =
    productIds.length > 0
      ? await prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            order: { status: { in: COMPLETED_ORDER_STATUSES } },
          },
          _count: { _all: true },
        })
      : [];
  const ordersByProduct = new Map(orderCounts.map((row) => [row.productId, row._count._all]));

  const items = rows.map((row) => mapRowToItem(row, ordersByProduct.get(row.id) ?? 0));
  const pageResult = toMobilePagination({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });

  return {
    items: pageResult.items,
    nextCursor: pageResult.nextCursor,
    hasMore: pageResult.hasMore,
    total,
  };
}

export async function buildMobileSellerProductDetailFromRequest(
  request: Request,
  productId: string,
): Promise<MobileSellerProductDetail | null> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return null;
  }

  const row = await prisma.product.findFirst({
    where: { id: productId, sellerId: user.sellerProfileId },
    select: {
      id: true,
      name: true,
      sku: true,
      description: true,
      price: true,
      compareAt: true,
      currency: true,
      stock: true,
      status: true,
      views: true,
      favoritesCount: true,
      updatedAt: true,
      createdAt: true,
      category: { select: { name: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { url: true, isPrimary: true },
      },
      productModeration: {
        select: { status: true, notes: true, issues: true, updatedAt: true },
      },
    },
  });
  if (!row) return null;

  const ordersCount = await prisma.orderItem.count({
    where: {
      productId: row.id,
      order: { status: { in: COMPLETED_ORDER_STATUSES } },
    },
  });

  const base = mapRowToItem(row, ordersCount);
  return {
    ...base,
    description: row.description,
    categoryName: row.category?.name ?? null,
    images: row.images.map((img) => ({
      url: resolvePublicImageUrl(img.url) ?? img.url,
      isPrimary: img.isPrimary,
    })),
  };
}

export async function buildMobileSellerProductsSummaryFromRequest(
  request: Request,
): Promise<MobileSellerProductsSummary | null> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return null;
  }
  return buildMobileSellerProductsSummary(user.sellerProfileId);
}

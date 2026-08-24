import { Prisma, ProductCondition, ProductStatus, UserRole } from "@prisma/client";

import {
  mapProductDetail,
  mapProductListItem,
  slugify,
  toPriceNumber,
} from "@/features/products/mappers";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "@/features/products/schemas";
import type {
  ProductDetail,
  ProductListFilters,
  ProductListItem,
  ProductListResult,
  ProductSort,
  ProductSuggestItem,
} from "@/features/products/types";
import { resolveCategoryIdsIncludingDescendants } from "@/features/catalog/queries";
import { categoryPagePath } from "@/features/catalog/paths";
import { syncProductPickupPoints } from "@/features/pickup/queries";
import { setInventoryQuantity } from "@/features/orders/lib/inventory-sync";
import {
  searchTokenVariants,
  tokenizeSearchQuery,
} from "@/features/products/search-query";
import { PAGINATION, ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { pathnameFromBlobUrl } from "@/lib/storage";

/** Prisma OR clause matching a single search token (and its stem variants). */
function tokenMatchOr(
  token: string,
): Prisma.ProductWhereInput["OR"] {
  const variants = searchTokenVariants(token);
  const or: Prisma.ProductWhereInput[] = [];
  for (const v of variants) {
    or.push(
      { name: { contains: v, mode: "insensitive" } },
      { description: { contains: v, mode: "insensitive" } },
      { modelName: { contains: v, mode: "insensitive" } },
      { brand: { name: { contains: v, mode: "insensitive" } } },
      { brand: { slug: { contains: v, mode: "insensitive" } } },
      {
        brand: {
          aliases: { has: v.toLowerCase() },
        },
      },
      { category: { name: { contains: v, mode: "insensitive" } } },
      { category: { slug: { contains: v, mode: "insensitive" } } },
      { productType: { name: { contains: v, mode: "insensitive" } } },
      { productType: { lotName: { contains: v, mode: "insensitive" } } },
      {
        productType: {
          aliases: { some: { normalized: { contains: v.toLowerCase() } } },
        },
      },
      {
        category: {
          aliases: { some: { normalized: { contains: v.toLowerCase() } } },
        },
      },
      { seller: { storeName: { contains: v, mode: "insensitive" } } },
      {
        characteristicValues: {
          some: { valueText: { contains: v, mode: "insensitive" } },
        },
      },
    );
  }
  return or;
}

export type ProductViewer = {
  userId?: string;
  role?: UserRole;
  sellerProfileId?: string | null;
};

/**
 * Resolve list status visibility:
 * - Anonymous / public: always ACTIVE
 * - Seller viewing own catalog (sellerId matches session profile): status filter allowed
 * - Admin: any status / ALL
 */
export function resolveListStatusFilter(
  requested: ProductStatus | "ALL" | undefined,
  viewer: ProductViewer | null | undefined,
  sellerIdFilter: string | undefined,
): ProductStatus | "ALL" {
  if (viewer?.role === UserRole.ADMIN) {
    return requested ?? ProductStatus.ACTIVE;
  }

  const isOwnerSeller =
    viewer?.role === UserRole.SELLER &&
    viewer.sellerProfileId &&
    sellerIdFilter &&
    sellerIdFilter === viewer.sellerProfileId;

  if (isOwnerSeller) {
    return requested ?? "ALL";
  }

  return ProductStatus.ACTIVE;
}

export function canViewProduct(
  status: ProductStatus,
  productSellerId: string,
  viewer?: ProductViewer | null,
): boolean {
  if (status === ProductStatus.ACTIVE) return true;
  if (viewer?.role === UserRole.ADMIN) return true;
  if (
    viewer?.role === UserRole.SELLER &&
    viewer.sellerProfileId &&
    viewer.sellerProfileId === productSellerId
  ) {
    return true;
  }
  return false;
}

const listInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  seller: { select: { id: true, storeName: true, slug: true } },
} satisfies Prisma.ProductInclude;

const detailInclude = {
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
  brand: { select: { id: true, name: true, slug: true } },
  characteristicValues: {
    include: {
      definition: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          unit: true,
          sortOrder: true,
        },
      },
    },
  },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
  },
  seller: {
    select: {
      id: true,
      storeName: true,
      slug: true,
      isVerified: true,
      user: { select: { id: true, name: true, image: true } },
    },
  },
  pickupPoints: {
    include: {
      pickupPoint: true,
    },
  },
} satisfies Prisma.ProductInclude;

function resolvePagination(filters: ProductListFilters) {
  const pageSize = Math.min(
    filters.limit ?? filters.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE,
    PAGINATION.MAX_PAGE_SIZE,
  );

  if (filters.offset != null) {
    const page = Math.floor(filters.offset / pageSize) + 1;
    return { skip: filters.offset, take: pageSize, page, pageSize };
  }

  const page = filters.page ?? 1;
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

function resolveOrderBy(
  sort: ProductSort | undefined,
): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "newest":
      return { createdAt: "desc" };
    case "popular":
    default:
      return [{ views: "desc" }, { favoritesCount: "desc" }, { createdAt: "desc" }];
  }
}

async function buildWhere(
  filters: ProductListFilters,
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = {};

  if (filters.status !== "ALL") {
    where.status = filters.status ?? ProductStatus.ACTIVE;
  }

  if (filters.sellerId) {
    where.sellerId = filters.sellerId;
  }

  // Hide admin-blocked stores from public catalog (seller's own views pass sellerId).
  const sellerWhere: Prisma.SellerProfileWhereInput = {
    isBlocked: false,
  };
  if (!filters.sellerId && filters.seller) {
    if (/^c[a-z0-9]{24}$/i.test(filters.seller)) {
      where.sellerId = filters.seller;
    } else {
      sellerWhere.slug = filters.seller;
    }
  }
  if (filters.sellerKind) {
    sellerWhere.kind = filters.sellerKind;
  }
  where.seller = sellerWhere;

  if (filters.categoryId) {
    const ids = await resolveCategoryIdsIncludingDescendants(filters.categoryId);
    if (ids && ids.length > 0) {
      where.categoryId = { in: ids };
    } else {
      where.categoryId = filters.categoryId;
    }
  } else if (filters.category) {
    // Accept slug or id — include all active descendant categories
    const ids = await resolveCategoryIdsIncludingDescendants(filters.category);
    if (ids && ids.length > 0) {
      where.categoryId = { in: ids };
    } else {
      // Unknown / inactive category → empty result
      where.categoryId = "__none__";
    }
  }

  if (filters.condition) {
    where.condition = filters.condition;
  }

  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }

  if (filters.inStock) {
    where.stock = { gt: 0 };
  }

  if (filters.productTypeId) {
    where.productTypeId = filters.productTypeId;
  } else if (filters.productType) {
    where.productType = {
      is: { slug: filters.productType, isActive: true },
    };
  }

  if (filters.brandId) {
    where.brandId = filters.brandId;
  } else if (filters.brand) {
    where.brand = {
      is: {
        OR: [
          { slug: filters.brand },
          { id: filters.brand },
        ],
        isActive: true,
      },
    };
  }

  const priceFilter: Prisma.DecimalFilter = {};
  if (filters.priceMin != null) {
    priceFilter.gte = new Prisma.Decimal(filters.priceMin);
  }
  if (filters.priceMax != null) {
    priceFilter.lte = new Prisma.Decimal(filters.priceMax);
  }
  if (Object.keys(priceFilter).length > 0) {
    where.price = priceFilter;
  }

  if (filters.query) {
    const tokens = tokenizeSearchQuery(filters.query);
    if (tokens.length === 1) {
      where.OR = tokenMatchOr(tokens[0]);
    } else if (tokens.length > 1) {
      // Every token must match somewhere (title, description, category, seller).
      where.AND = tokens.map((token) => ({ OR: tokenMatchOr(token) }));
    }
  }

  if (filters.facets?.length) {
    const { facetSelectionsToWhere, getFacetDefinitionsForCategory, getFacetDefinitionsForProductType } =
      await import("@/lib/catalog-taxonomy/facets");
    let defs: Awaited<ReturnType<typeof getFacetDefinitionsForProductType>> = [];
    if (filters.productTypeId) {
      defs = await getFacetDefinitionsForProductType(prisma, filters.productTypeId);
    } else if (filters.productType) {
      const pt = await prisma.productType.findFirst({
        where: { slug: filters.productType, isActive: true },
        select: { id: true },
      });
      if (pt) defs = await getFacetDefinitionsForProductType(prisma, pt.id);
    } else if (filters.categoryId) {
      defs = await getFacetDefinitionsForCategory(prisma, filters.categoryId);
    } else if (filters.category) {
      const cat = await prisma.category.findFirst({
        where: {
          OR: [{ slug: filters.category }, { id: filters.category }],
          isActive: true,
        },
        select: { id: true },
      });
      if (cat) defs = await getFacetDefinitionsForCategory(prisma, cat.id);
    } else {
      // Load defs by selected facet slugs only
      const slugs = [...new Set(filters.facets.map((f) => f.slug))];
      const rows = await prisma.productCharacteristicDefinition.findMany({
        where: { filterable: true, slug: { in: slugs } },
        include: { productType: { select: { name: true, lotName: true } } },
      });
      defs = rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        type: r.type,
        unit: r.unit,
        options: Array.isArray(r.options) ? r.options.map(String) : null,
        productTypeId: r.productTypeId,
        productTypeName: r.productType.lotName ?? r.productType.name,
      }));
    }

    const facetClauses = facetSelectionsToWhere(filters.facets, defs);
    if (facetClauses.length) {
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [...existingAnd, ...facetClauses];
    }
  }

  return where;
}

export async function listProducts(
  filters: ProductListFilters = {},
): Promise<ProductListResult> {
  const where = await buildWhere(filters);
  const { skip, take, page, pageSize } = resolvePagination(filters);
  const orderBy = resolveOrderBy(filters.sort);

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: listInclude,
      orderBy,
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(mapProductListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Distinct cities from ACTIVE products for catalog city filter. */
export async function listProductCities(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      city: { not: null },
    },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return rows
    .map((r) => r.city)
    .filter((c): c is string => Boolean(c && c.trim()));
}

export type ProductSellerOption = {
  id: string;
  storeName: string;
  slug: string;
};

/** Sellers that currently have ACTIVE products (for catalog filter). */
export async function listProductSellers(): Promise<ProductSellerOption[]> {
  const rows = await prisma.sellerProfile.findMany({
    where: {
      products: { some: { status: ProductStatus.ACTIVE } },
    },
    select: { id: true, storeName: true, slug: true },
    orderBy: { storeName: "asc" },
  });
  return rows;
}

/**
 * Autocomplete suggestions: matching ACTIVE product titles + categories.
 * Related products from matched categories (e.g. «дрель» → Инструменты + drills).
 */
export async function suggestCatalog(
  query: string,
  limit = 8,
): Promise<ProductSuggestItem[]> {
  const q = query.trim();
  if (!q) return [];

  const take = Math.min(Math.max(limit, 1), 20);
  const tokens = tokenizeSearchQuery(q);
  const primary = tokens[0] ?? q.toLowerCase();
  const variants = searchTokenVariants(primary);

  const categoryOr: Prisma.CategoryWhereInput[] = variants.flatMap((v) => [
    { name: { contains: v, mode: "insensitive" as const } },
    { slug: { contains: v, mode: "insensitive" as const } },
    { description: { contains: v, mode: "insensitive" as const } },
  ]);

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      OR: categoryOr,
    },
    select: { id: true, name: true, slug: true },
    take: Math.min(4, take),
    orderBy: { sortOrder: "asc" },
  });

  const categoryIds = categories.map((c) => c.id);

  const productOr: Prisma.ProductWhereInput[] = variants.flatMap((v) => [
    { name: { contains: v, mode: "insensitive" as const } },
    { description: { contains: v, mode: "insensitive" as const } },
  ]);
  if (categoryIds.length > 0) {
    productOr.push({ categoryId: { in: categoryIds } });
  }

  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      OR: productOr,
    },
    select: { id: true, name: true, slug: true },
    take,
    orderBy: [{ views: "desc" }, { createdAt: "desc" }],
  });

  const items: ProductSuggestItem[] = [
    ...categories.map((c) => ({
      type: "category" as const,
      id: c.id,
      title: c.name,
      slug: c.slug,
      href: categoryPagePath(c.slug),
    })),
    ...products.map((p) => ({
      type: "product" as const,
      id: p.id,
      title: p.name,
      slug: p.slug,
      href: `${ROUTES.PRODUCT}/${p.id}`,
    })),
  ];

  return items.slice(0, take);
}

/** Fire-and-forget view counter for PDP (does not throw to caller). */
export function incrementProductViews(productId: string): void {
  void prisma.product
    .update({
      where: { id: productId },
      data: { views: { increment: 1 } },
    })
    .catch((err) => {
      console.error("[incrementProductViews]", productId, err);
    });
}

/**
 * Load product by id with visibility rules:
 * - Anonymous / public: ACTIVE only
 * - Seller: own non-ACTIVE (DRAFT | ARCHIVED | OUT_OF_STOCK)
 * - Admin: all statuses
 */
export async function getProductById(
  id: string,
  viewer?: ProductViewer | null,
): Promise<ProductDetail | null> {
  const row = await prisma.product.findUnique({
    where: { id },
    include: detailInclude,
  });
  if (!row) return null;
  if (!canViewProduct(row.status, row.sellerId, viewer)) return null;
  return mapProductDetail(row);
}

/**
 * Similar products for PDP: same category, exclude current, prefer similar price.
 * No cross-category fillers (avoids unrelated “fake similar” items).
 */
export async function listSimilarProducts(
  productId: string,
  options?: {
    categoryId?: string | null;
    price?: number | null;
    limit?: number;
  },
): Promise<ProductListItem[]> {
  const limit = Math.min(Math.max(options?.limit ?? 8, 1), 16);
  if (!options?.categoryId) return [];

  const rows = await prisma.product.findMany({
    where: {
      id: { not: productId },
      status: ProductStatus.ACTIVE,
      categoryId: options.categoryId,
      seller: { isBlocked: false },
    },
    include: listInclude,
    take: Math.min(limit * 4, 48),
    orderBy: [{ views: "desc" }, { createdAt: "desc" }],
  });

  if (rows.length === 0) return [];

  const targetPrice =
    options.price != null && Number.isFinite(options.price)
      ? options.price
      : null;

  const sorted = [...rows].sort((a, b) => {
    if (targetPrice != null) {
      const da = Math.abs(toPriceNumber(a.price) - targetPrice);
      const db = Math.abs(toPriceNumber(b.price) - targetPrice);
      if (da !== db) return da - db;
    }
    if (b.views !== a.views) return b.views - a.views;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return sorted.slice(0, limit).map(mapProductListItem);
}

async function uniqueSlug(
  sellerId: string,
  title: string,
  excludeProductId?: string,
): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { sellerId_slug: { sellerId, slug } },
      select: { id: true },
    });
    if (!existing || existing.id === excludeProductId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function assertCategoryExists(categoryId: string | null | undefined) {
  if (!categoryId) return;
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new ProductServiceError(
      "CATEGORY_NOT_FOUND",
      "Категория не найдена",
      400,
    );
  }
}

/** Load product and verify it belongs to the given seller profile. */
export async function getOwnedProduct(
  productId: string,
  sellerId: string,
): Promise<ProductDetail> {
  const row = await prisma.product.findUnique({
    where: { id: productId },
    include: detailInclude,
  });
  if (!row) {
    throw new ProductServiceError("NOT_FOUND", "Товар не найден", 404);
  }
  if (row.sellerId !== sellerId) {
    throw new ProductServiceError(
      "FORBIDDEN",
      "Нет доступа к этому товару",
      403,
    );
  }
  return mapProductDetail(row);
}

function optionalDecimal(
  value: number | null | undefined,
): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  return new Prisma.Decimal(value);
}

/** Resolve Brand id from brandName (lazy create) or explicit brandId. No mass fill. */
async function resolveProductBrandId(input: {
  brandId?: string | null;
  brandName?: string | null;
}): Promise<string | null> {
  const name = input.brandName?.trim();
  if (name) {
    const { ensureBrand } = await import("@/lib/product-understanding");
    const brand = await ensureBrand(prisma, name);
    return brand.id;
  }
  if (input.brandId) return input.brandId;
  return null;
}

export async function createProduct(
  input: CreateProductInput,
  options?: { actorUserId?: string | null },
): Promise<ProductDetail> {
  const sellerId = input.sellerId;
  if (!sellerId) {
    throw new ProductServiceError(
      "SELLER_REQUIRED",
      "Не указан продавец (sellerId)",
      400,
    );
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { id: true },
  });
  if (!seller) {
    throw new ProductServiceError(
      "SELLER_NOT_FOUND",
      "Продавец не найден",
      400,
    );
  }

  await assertCategoryExists(input.categoryId);

  const publishCheck = (await import("@/lib/catalog-taxonomy")).assertActivePublishRequirements({
    status: input.status,
    productTypeId: input.productTypeId,
  });
  if (!publishCheck.ok) {
    throw new ProductServiceError(
      publishCheck.code,
      publishCheck.message,
      400,
    );
  }

  let resolvedCategoryId = input.categoryId ?? null;
  const resolvedProductTypeId = input.productTypeId ?? null;

  if (resolvedProductTypeId) {
    const pt = await prisma.productType.findFirst({
      where: { id: resolvedProductTypeId, isActive: true },
      include: {
        characteristics: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!pt) {
      throw new ProductServiceError(
        "PRODUCT_TYPE_NOT_FOUND",
        "Тип товара не найден",
        400,
      );
    }
    resolvedCategoryId = resolvedCategoryId ?? pt.categoryId;

    if (input.status === ProductStatus.ACTIVE) {
      const { canPublishActive } = await import("@/lib/catalog-taxonomy");
      const check = canPublishActive(
        pt.characteristics,
        input.characteristics ?? [],
      );
      if (!check.ok) {
        throw new ProductServiceError(
          "CHARACTERISTICS_REQUIRED",
          check.issues.map((i) => i.message).join("; ") ||
            "Заполните обязательные характеристики",
          400,
        );
      }
    }
  }

  const pickupEnabled = Boolean(input.pickupEnabled);
  const reservationEnabled = pickupEnabled && Boolean(input.reservationEnabled);
  const prepaymentPercent = reservationEnabled
    ? (input.prepaymentPercent ?? 0)
    : 0;
  const pickupPointIds = pickupEnabled ? (input.pickupPointIds ?? []) : [];
  if (pickupEnabled && pickupPointIds.length === 0) {
    throw new ProductServiceError(
      "PICKUP_POINTS_REQUIRED",
      "Выберите хотя бы одну точку самовывоза",
      400,
    );
  }

  if (input.status === ProductStatus.ACTIVE) {
    const { isMarketplaceTrustLoopEnabled } = await import(
      "@/lib/marketplace-trust-loop/flags"
    );
    if (isMarketplaceTrustLoopEnabled()) {
      throw new ProductServiceError(
        "MODERATION_REQUIRED",
        "Сначала сохраните ЛОТ и отправьте его на проверку.",
        400,
      );
    }
  }

  const slug = await uniqueSlug(sellerId, input.title);
  const city =
    input.city != null && input.city.trim() !== "" ? input.city.trim() : null;
  const stock = input.stock ?? 0;
  const resolvedBrandId = await resolveProductBrandId(input);
  const modelName =
    input.modelName != null && input.modelName.trim() !== ""
      ? input.modelName.trim()
      : null;

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sellerId,
        categoryId: resolvedCategoryId,
        productTypeId: resolvedProductTypeId,
        brandId: resolvedBrandId,
        modelName,
        name: input.title,
        slug,
        description: input.description ?? null,
        price: new Prisma.Decimal(input.price.toFixed(2)),
        stock,
        city,
        condition: input.condition ?? ProductCondition.NEW,
        status: input.status,
        sku: input.sku ?? null,
        weight: optionalDecimal(input.weight) ?? null,
        lengthCm: optionalDecimal(input.lengthCm) ?? null,
        widthCm: optionalDecimal(input.widthCm) ?? null,
        heightCm: optionalDecimal(input.heightCm) ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        pickupEnabled,
        reservationEnabled,
        prepaymentPercent,
        images: {
          create: input.images.map((img, index) => ({
            url: img.url,
            pathname: img.pathname ?? pathnameFromBlobUrl(img.url),
            alt: img.alt ?? input.title,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        },
        characteristicValues: {
          create: (input.characteristics ?? [])
            .filter((c) => c.definitionId)
            .map((c) => ({
              definitionId: c.definitionId,
              valueText: c.valueText ?? null,
              valueNumber:
                c.valueNumber != null
                  ? new Prisma.Decimal(c.valueNumber)
                  : null,
              valueBoolean: c.valueBoolean ?? null,
              valueJson:
                c.valueJson != null
                  ? (c.valueJson as Prisma.InputJsonValue)
                  : undefined,
            })),
        },
      },
      include: detailInclude,
    });

    await syncProductPickupPoints(tx, product.id, sellerId, pickupPointIds);

    await setInventoryQuantity(tx, {
      productId: product.id,
      quantity: stock,
      actorUserId: options?.actorUserId,
      note: "Создание товара",
    });

    return product;
  });

  return mapProductDetail(created);
}

export async function updateProduct(
  productId: string,
  sellerId: string,
  input: UpdateProductInput,
  options?: { actorUserId?: string | null },
): Promise<ProductDetail> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true, name: true, stock: true },
  });
  if (!existing) {
    throw new ProductServiceError("NOT_FOUND", "Товар не найден", 404);
  }
  if (existing.sellerId !== sellerId) {
    throw new ProductServiceError(
      "FORBIDDEN",
      "Нет доступа к этому товару",
      403,
    );
  }

  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }

  const data: Prisma.ProductUpdateInput = {};

  if (input.title !== undefined) {
    data.name = input.title;
    data.slug = await uniqueSlug(sellerId, input.title, productId);
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.price !== undefined) {
    data.price = new Prisma.Decimal(input.price.toFixed(2));
  }
  if (input.stock !== undefined) {
    data.stock = input.stock;
  }
  if (input.city !== undefined) {
    data.city =
      input.city != null && input.city.trim() !== "" ? input.city.trim() : null;
  }
  if (input.condition !== undefined) {
    data.condition = input.condition;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }
  if (input.sku !== undefined) {
    data.sku = input.sku;
  }
  if (input.weight !== undefined) {
    data.weight = optionalDecimal(input.weight) ?? null;
  }
  if (input.lengthCm !== undefined) {
    data.lengthCm = optionalDecimal(input.lengthCm) ?? null;
  }
  if (input.widthCm !== undefined) {
    data.widthCm = optionalDecimal(input.widthCm) ?? null;
  }
  if (input.heightCm !== undefined) {
    data.heightCm = optionalDecimal(input.heightCm) ?? null;
  }
  if (input.seoTitle !== undefined) {
    data.seoTitle = input.seoTitle;
  }
  if (input.seoDescription !== undefined) {
    data.seoDescription = input.seoDescription;
  }
  if (input.pickupEnabled !== undefined) {
    data.pickupEnabled = input.pickupEnabled;
  }
  if (input.reservationEnabled !== undefined) {
    data.reservationEnabled = input.reservationEnabled;
  }
  if (input.prepaymentPercent !== undefined) {
    data.prepaymentPercent = input.prepaymentPercent;
  }
  if (input.categoryId !== undefined) {
    data.category =
      input.categoryId == null
        ? { disconnect: true }
        : { connect: { id: input.categoryId } };
  }
  if (input.productTypeId !== undefined) {
    data.productType =
      input.productTypeId == null
        ? { disconnect: true }
        : { connect: { id: input.productTypeId } };
  }
  if (input.modelName !== undefined) {
    data.modelName =
      input.modelName != null && input.modelName.trim() !== ""
        ? input.modelName.trim()
        : null;
  }
  if (input.brandId !== undefined || input.brandName !== undefined) {
    const resolvedBrandId = await resolveProductBrandId(input);
    data.brand =
      resolvedBrandId == null
        ? { disconnect: true }
        : { connect: { id: resolvedBrandId } };
  }

  const existingFull = await prisma.product.findUnique({
    where: { id: productId },
    select: { productTypeId: true, status: true },
  });
  const targetStatus = input.status ?? existingFull?.status ?? ProductStatus.DRAFT;
  const targetTypeId =
    input.productTypeId !== undefined
      ? input.productTypeId
      : existingFull?.productTypeId;

  const publishCheck = (await import("@/lib/catalog-taxonomy")).assertActivePublishRequirements({
    status: targetStatus,
    productTypeId: targetTypeId,
  });
  if (!publishCheck.ok) {
    throw new ProductServiceError(
      publishCheck.code,
      publishCheck.message,
      400,
    );
  }

  if (targetStatus === ProductStatus.ACTIVE && targetTypeId) {
    const pt = await prisma.productType.findFirst({
      where: { id: targetTypeId },
      include: { characteristics: true },
    });
    if (pt) {
      const { canPublishActive } = await import("@/lib/catalog-taxonomy");
      let values = input.characteristics ?? [];
      if (!values.length) {
        const existingVals = await prisma.productCharacteristicValue.findMany({
          where: { productId },
        });
        values = existingVals.map((v) => ({
          definitionId: v.definitionId,
          valueText: v.valueText,
          valueNumber: v.valueNumber != null ? Number(v.valueNumber) : null,
          valueBoolean: v.valueBoolean,
          valueJson: v.valueJson,
        }));
      }
      const check = canPublishActive(pt.characteristics, values);
      if (!check.ok) {
        throw new ProductServiceError(
          "CHARACTERISTICS_REQUIRED",
          check.issues.map((i) => i.message).join("; ") ||
            "Заполните обязательные характеристики",
          400,
        );
      }
    }
  }

  if (targetStatus === ProductStatus.ACTIVE) {
    const { isMarketplaceTrustLoopEnabled } = await import(
      "@/lib/marketplace-trust-loop/flags"
    );
    if (isMarketplaceTrustLoopEnabled()) {
      const { assertProductModerationApproved, submitProductForModeration } =
        await import("@/lib/marketplace-trust-loop/moderation/rules");
      const existingMod = await prisma.productModeration.findUnique({
        where: { productId },
      });
      if (!existingMod) {
        await submitProductForModeration(productId);
        throw new ProductServiceError(
          "MODERATION_PENDING",
          "ЛОТ отправлен на проверку. После одобрения можно опубликовать.",
          400,
        );
      }
      await assertProductModerationApproved(productId);
    }
  }

  const pickupPointIds =
    input.pickupPointIds !== undefined ? input.pickupPointIds : undefined;
  if (input.pickupEnabled === true && pickupPointIds && pickupPointIds.length === 0) {
    throw new ProductServiceError(
      "PICKUP_POINTS_REQUIRED",
      "Выберите хотя бы одну точку самовывоза",
      400,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (input.images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.product.update({
        where: { id: productId },
        data: {
          ...data,
          images: {
            create: input.images.map((img, index) => ({
              url: img.url,
              pathname: img.pathname ?? pathnameFromBlobUrl(img.url),
              alt: img.alt ?? input.title ?? existing.name,
              sortOrder: index,
              isPrimary: index === 0,
            })),
          },
        },
      });
    } else {
      await tx.product.update({
        where: { id: productId },
        data,
      });
    }

    if (pickupPointIds !== undefined) {
      await syncProductPickupPoints(tx, productId, sellerId, pickupPointIds);
    }

    if (input.characteristics !== undefined) {
      for (const c of input.characteristics) {
        await tx.productCharacteristicValue.upsert({
          where: {
            productId_definitionId: {
              productId,
              definitionId: c.definitionId,
            },
          },
          create: {
            productId,
            definitionId: c.definitionId,
            valueText: c.valueText ?? null,
            valueNumber:
              c.valueNumber != null
                ? new Prisma.Decimal(c.valueNumber)
                : null,
            valueBoolean: c.valueBoolean ?? null,
            valueJson:
              c.valueJson != null
                ? (c.valueJson as Prisma.InputJsonValue)
                : undefined,
          },
          update: {
            valueText: c.valueText ?? null,
            valueNumber:
              c.valueNumber != null
                ? new Prisma.Decimal(c.valueNumber)
                : null,
            valueBoolean: c.valueBoolean ?? null,
            valueJson:
              c.valueJson != null
                ? (c.valueJson as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          },
        });
      }
    }

    if (input.stock !== undefined) {
      await setInventoryQuantity(tx, {
        productId,
        quantity: input.stock,
        actorUserId: options?.actorUserId,
        note: "Обновление остатка",
      });
    }
  });

  const updated = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: detailInclude,
  });
  return mapProductDetail(updated);
}

export async function archiveProduct(
  productId: string,
  sellerId: string,
): Promise<ProductDetail> {
  return updateProduct(productId, sellerId, { status: ProductStatus.ARCHIVED });
}

export async function duplicateProduct(
  productId: string,
  sellerId: string,
  options?: { actorUserId?: string | null },
): Promise<ProductDetail> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
    },
  });
  if (!existing) {
    throw new ProductServiceError("NOT_FOUND", "Товар не найден", 404);
  }
  if (existing.sellerId !== sellerId) {
    throw new ProductServiceError(
      "FORBIDDEN",
      "Нет доступа к этому товару",
      403,
    );
  }

  return createProduct(
    {
      title: `${existing.name} (копия)`,
      description: existing.description,
      price: existing.price.toNumber(),
      categoryId: existing.categoryId,
      productTypeId: existing.productTypeId,
      characteristics: [],
      sellerId,
      stock: existing.stock,
      city: existing.city,
      condition: existing.condition,
      status: ProductStatus.DRAFT,
      sku: existing.sku,
      weight: existing.weight?.toNumber() ?? null,
      lengthCm: existing.lengthCm?.toNumber() ?? null,
      widthCm: existing.widthCm?.toNumber() ?? null,
      heightCm: existing.heightCm?.toNumber() ?? null,
      seoTitle: existing.seoTitle,
      seoDescription: existing.seoDescription,
      brandId: existing.brandId,
      modelName: existing.modelName,
      pickupEnabled: existing.pickupEnabled,
      reservationEnabled: existing.reservationEnabled,
      prepaymentPercent: existing.prepaymentPercent,
      pickupPointIds: [],
      images: existing.images.map((img) => ({
        url: img.url,
        alt: img.alt,
      })),
    },
    options,
  );
}

export async function deleteProduct(
  productId: string,
  sellerId: string,
): Promise<void> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true },
  });
  if (!existing) {
    throw new ProductServiceError("NOT_FOUND", "Товар не найден", 404);
  }
  if (existing.sellerId !== sellerId) {
    throw new ProductServiceError(
      "FORBIDDEN",
      "Нет доступа к этому товару",
      403,
    );
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      throw new ProductServiceError(
        "IN_USE",
        "Товар нельзя удалить — он есть в заказах. Архивируйте его.",
        409,
      );
    }
    throw err;
  }
}

export class ProductServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ProductServiceError";
  }
}

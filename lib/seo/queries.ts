/**
 * SEO entity loaders — thin queries over Catalog Core / Brand / SeoPage.
 */

import { ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getProductTypeBySeoPath(segments: string[]) {
  if (segments.length < 1) return null;
  const typeSlug = segments[segments.length - 1]!;
  const categoryPath =
    segments.length > 1 ? segments.slice(0, -1).join("/") : null;

  const type = await prisma.productType.findFirst({
    where: {
      slug: typeSlug,
      isActive: true,
      ...(categoryPath
        ? { category: { path: categoryPath, isActive: true } }
        : {}),
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          path: true,
          description: true,
        },
      },
      characteristics: {
        where: { filterable: true },
        orderBy: { sortOrder: "asc" },
        take: 12,
        select: { id: true, name: true, slug: true, unit: true },
      },
      _count: {
        select: {
          products: { where: { status: ProductStatus.ACTIVE } },
        },
      },
    },
  });
  return type;
}

export async function getCategoryByPath(path: string) {
  return prisma.category.findFirst({
    where: { path, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      path: true,
      description: true,
    },
  });
}

export async function listProductTypesForCategory(categoryId: string, limit = 12) {
  return prisma.productType.findMany({
    where: {
      categoryId,
      isActive: true,
      products: { some: { status: ProductStatus.ACTIVE } },
    },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      lotName: true,
      slug: true,
      category: { select: { path: true } },
      _count: {
        select: { products: { where: { status: ProductStatus.ACTIVE } } },
      },
    },
  });
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findFirst({
    where: { slug, isActive: true },
    include: {
      _count: {
        select: { products: { where: { status: ProductStatus.ACTIVE } } },
      },
    },
  });
}

export async function listActiveBrands(limit = 100) {
  return prisma.brand.findMany({
    where: {
      isActive: true,
      products: { some: { status: ProductStatus.ACTIVE } },
    },
    orderBy: { name: "asc" },
    take: limit,
    include: {
      _count: {
        select: { products: { where: { status: ProductStatus.ACTIVE } } },
      },
    },
  });
}

export async function listBrandsForProductType(productTypeId: string, limit = 8) {
  const rows = await prisma.product.findMany({
    where: {
      productTypeId,
      status: ProductStatus.ACTIVE,
      brandId: { not: null },
    },
    select: { brand: { select: { id: true, name: true, slug: true } } },
    distinct: ["brandId"],
    take: limit * 3,
  });
  const seen = new Set<string>();
  const out: Array<{ id: string; name: string; slug: string }> = [];
  for (const r of rows) {
    if (!r.brand || seen.has(r.brand.id)) continue;
    seen.add(r.brand.id);
    out.push(r.brand);
    if (out.length >= limit) break;
  }
  return out;
}

export async function getSeoPageByPath(path: string) {
  return prisma.seoPage.findUnique({ where: { path } });
}

export async function listIndexableSeoPages(limit = 500) {
  return prisma.seoPage.findMany({
    where: {
      indexable: true,
      status: "APPROVED",
      score: { gte: 45 },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { path: true, updatedAt: true, entityType: true, score: true },
  });
}

export async function listAdminSeoPages(limit = 50) {
  return prisma.seoPage.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function listProductTypesForSitemap(limit = 2_000) {
  return prisma.productType.findMany({
    where: {
      isActive: true,
      products: { some: { status: ProductStatus.ACTIVE } },
      category: { isActive: true, path: { not: null } },
    },
    select: {
      slug: true,
      updatedAt: true,
      category: { select: { path: true } },
      _count: {
        select: { products: { where: { status: ProductStatus.ACTIVE } } },
      },
    },
    take: limit,
  });
}

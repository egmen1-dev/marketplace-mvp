/**
 * Category / catalog data access.
 */

import { ProductStatus } from "@prisma/client";

import {
  buildCategoryPathLabel,
  collectAncestorIds,
  collectDescendantIds,
  productCountWithDescendants,
} from "@/features/catalog/tree";
import { resolvePublicImageUrl } from "@/lib/images";
import { prisma } from "@/lib/prisma";

export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  level: number;
  /** ACTIVE products in this category only (direct). */
  productCount: number;
  /** Label with parent path for selects, e.g. «Дом / Мебель». */
  pathLabel?: string;
};

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  level: number;
  /** ACTIVE products including descendants. */
  productCount: number;
  children: CategoryTreeNode[];
};

export type CategoryDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  level: number;
  isActive: boolean;
  /** ACTIVE products including descendants. */
  productCount: number;
  ancestors: Array<{ id: string; name: string; slug: string }>;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    level: number;
    productCount: number;
  }>;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  level: number;
  isActive: boolean;
  sortOrder: number;
};

async function loadCategoryGraph(activeOnly: boolean) {
  const rows = await prisma.category.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      level: true,
      isActive: true,
      sortOrder: true,
    },
  });

  const directCounts = await prisma.product.groupBy({
    by: ["categoryId"],
    where: {
      status: ProductStatus.ACTIVE,
      categoryId: { not: null },
      ...(activeOnly
        ? { category: { isActive: true } }
        : {}),
    },
    _count: { _all: true },
  });

  const countById = directCounts
    .filter((r): r is typeof r & { categoryId: string } => r.categoryId != null)
    .map((r) => ({ id: r.categoryId, count: r._count._all }));

  return { rows, countById };
}

function pathLabelFor(
  row: CategoryRow,
  byId: Map<string, CategoryRow>,
): string {
  return buildCategoryPathLabel(
    Array.from(byId.values()),
    row.id,
    " / ",
  );
}

/** Flat list of active categories (for seller selects / API). */
export async function listCategories(options?: {
  activeOnly?: boolean;
}): Promise<CategoryListItem[]> {
  const activeOnly = options?.activeOnly ?? true;
  const { rows, countById } = await loadCategoryGraph(activeOnly);
  const countMap = new Map(countById.map((c) => [c.id, c.count]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: resolvePublicImageUrl(row.imageUrl),
    parentId: row.parentId,
    level: row.level,
    productCount: countMap.get(row.id) ?? 0,
    pathLabel: pathLabelFor(row, byId),
  }));
}

/** Root categories with product counts including descendants. */
export async function listRootCategories(options?: {
  activeOnly?: boolean;
}): Promise<CategoryListItem[]> {
  const activeOnly = options?.activeOnly ?? true;
  const { rows, countById } = await loadCategoryGraph(activeOnly);
  const treeNodes = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    isActive: r.isActive,
  }));

  return rows
    .filter((r) => r.parentId == null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: resolvePublicImageUrl(row.imageUrl),
      parentId: row.parentId,
      level: row.level,
      productCount: productCountWithDescendants(
        treeNodes,
        row.id,
        countById,
        { activeOnly },
      ),
    }));
}

/** Nested tree for mega menu / filters. */
export async function listCategoryTree(options?: {
  activeOnly?: boolean;
}): Promise<CategoryTreeNode[]> {
  const activeOnly = options?.activeOnly ?? true;
  const { rows, countById } = await loadCategoryGraph(activeOnly);
  const treeNodes = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    isActive: r.isActive,
  }));

  const byParent = new Map<string | null, CategoryRow[]>();
  for (const row of rows) {
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }

  function build(parentId: string | null): CategoryTreeNode[] {
    return (byParent.get(parentId) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: resolvePublicImageUrl(row.imageUrl),
      parentId: row.parentId,
      level: row.level,
      productCount: productCountWithDescendants(
        treeNodes,
        row.id,
        countById,
        { activeOnly },
      ),
      children: build(row.id),
    }));
  }

  return build(null);
}

export async function getCategoryBySlug(
  slug: string,
  options?: { activeOnly?: boolean },
): Promise<CategoryDetail | null> {
  const activeOnly = options?.activeOnly ?? true;

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      level: true,
      isActive: true,
    },
  });

  if (!category) return null;
  if (activeOnly && !category.isActive) return null;

  const { rows, countById } = await loadCategoryGraph(activeOnly);
  const treeNodes = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    isActive: r.isActive,
  }));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const ancestorIds = collectAncestorIds(rows, category.id);
  const ancestors = ancestorIds
    .map((id) => byId.get(id))
    .filter((r): r is CategoryRow => Boolean(r))
    .map((r) => ({ id: r.id, name: r.name, slug: r.slug }));

  const children = rows
    .filter((r) => r.parentId === category.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      level: r.level,
      productCount: productCountWithDescendants(
        treeNodes,
        r.id,
        countById,
        { activeOnly },
      ),
    }));

  return {
    ...category,
    imageUrl: resolvePublicImageUrl(category.imageUrl),
    productCount: productCountWithDescendants(
      treeNodes,
      category.id,
      countById,
      { activeOnly },
    ),
    ancestors,
    children,
  };
}

/**
 * Resolve a category slug/id to itself + all active descendant ids
 * for catalog product filtering.
 */
export async function resolveCategoryIdsIncludingDescendants(
  category: string,
): Promise<string[] | null> {
  const isId = /^c[a-z0-9]{24}$/i.test(category);
  const row = isId
    ? await prisma.category.findUnique({
        where: { id: category },
        select: { id: true, isActive: true },
      })
    : await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true, isActive: true },
      });

  if (!row || !row.isActive) return null;

  const nodes = await prisma.category.findMany({
    select: { id: true, parentId: true, isActive: true },
  });

  return collectDescendantIds(nodes, row.id, { activeOnly: true });
}

export type MarketplaceStats = {
  products: number;
  sellers: number;
  categories: number;
};

/** Cheap aggregate counts for homepage proof (ACTIVE products only). */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const [products, sellers, categories] = await Promise.all([
    prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
    prisma.sellerProfile.count(),
    prisma.category.count({ where: { isActive: true } }),
  ]);
  return { products, sellers, categories };
}

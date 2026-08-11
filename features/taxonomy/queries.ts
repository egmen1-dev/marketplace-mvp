import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildMatchCandidates,
  matchProductTypes,
  type MatchResult,
} from "@/lib/catalog-taxonomy";

export type ProductTypeListItem = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  breadcrumb: string[];
  isActive: boolean;
};

export type CharacteristicDefinitionDto = {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  unit: string | null;
  options: string[] | null;
  sortOrder: number;
  filterable: boolean;
};

async function categoryBreadcrumbMap() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (categoryId: string): string[] => {
    const parts: string[] = [];
    let cur = byId.get(categoryId);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts;
  };
}

export async function suggestProductTypes(
  query: string,
  limit = 5,
): Promise<MatchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const candidates = await buildMatchCandidates(prisma);
  return matchProductTypes(q, candidates, { limit });
}

export async function getProductTypeWithCharacteristics(productTypeId: string) {
  const pt = await prisma.productType.findFirst({
    where: { id: productTypeId, isActive: true },
    include: {
      characteristics: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!pt) return null;

  const breadcrumbFn = await categoryBreadcrumbMap();
  const breadcrumb = [...breadcrumbFn(pt.categoryId), pt.lotName ?? pt.name];

  return {
    id: pt.id,
    name: pt.lotName ?? pt.name,
    slug: pt.slug,
    categoryId: pt.categoryId,
    category: pt.category,
    breadcrumb,
    characteristics: pt.characteristics.map(
      (c): CharacteristicDefinitionDto => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        type: c.type,
        required: c.required,
        unit: c.unit,
        options: Array.isArray(c.options)
          ? c.options.map(String)
          : null,
        sortOrder: c.sortOrder,
        filterable: c.filterable,
      }),
    ),
  };
}

/** Lazy children for category browser */
export async function listCategoryChildren(parentId: string | null) {
  return prisma.category.findMany({
    where: {
      isActive: true,
      parentId: parentId,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      level: true,
      path: true,
      _count: {
        select: {
          children: { where: { isActive: true } },
          productTypes: { where: { isActive: true } },
        },
      },
    },
  });
}

export async function listProductTypesForCategory(categoryId: string) {
  const breadcrumbFn = await categoryBreadcrumbMap();
  const types = await prisma.productType.findMany({
    where: { categoryId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, lotName: true, slug: true, categoryId: true },
  });
  return types.map(
    (t): ProductTypeListItem => ({
      id: t.id,
      name: t.lotName ?? t.name,
      slug: t.slug,
      categoryId: t.categoryId,
      breadcrumb: [...breadcrumbFn(t.categoryId), t.lotName ?? t.name],
      isActive: true,
    }),
  );
}

/** Server-side product type search (no full tree to client) */
export async function searchProductTypes(query: string, limit = 20) {
  const q = query.trim();
  if (q.length < 2) return [];

  const suggested = await suggestProductTypes(q, limit);
  if (suggested.length) return suggested;

  // Fallback: DB contains on name / aliases
  const rows = await prisma.productType.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { lotName: { contains: q, mode: "insensitive" } },
        { aliases: { some: { normalized: { contains: q.toLowerCase() } } } },
      ],
    },
    take: limit,
    include: { aliases: true },
  });

  const breadcrumbFn = await categoryBreadcrumbMap();
  return rows.map((t) => ({
    productTypeId: t.id,
    name: t.lotName ?? t.name,
    breadcrumb: [...breadcrumbFn(t.categoryId), t.lotName ?? t.name],
    confidence: 0.4,
    matchedTerms: [q],
  }));
}

export async function listFilterableCharacteristics(productTypeId: string) {
  return prisma.productCharacteristicDefinition.findMany({
    where: { productTypeId, filterable: true },
    orderBy: { sortOrder: "asc" },
  });
}

export type DynamicCatalogFilter = {
  slug: string;
  name: string;
  unit: string | null;
  values: string[];
};

/**
 * Discover category-specific characteristic filters (TASK 058, section 40).
 * Aggregates filterable characteristics across the product types found in the
 * given categories, exposing only discrete values actually present on products
 * (via defined options or observed text values). Returns useful filters only.
 */
export async function getCategoryDynamicFilters(
  categoryIds: string[],
  options?: { limitFilters?: number },
): Promise<DynamicCatalogFilter[]> {
  if (!categoryIds.length) return [];
  const limitFilters = options?.limitFilters ?? 6;

  const defs = await prisma.productCharacteristicDefinition.findMany({
    where: {
      filterable: true,
      productType: { isActive: true, categoryId: { in: categoryIds } },
    },
    select: {
      slug: true,
      name: true,
      unit: true,
      options: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  // Merge definitions sharing a slug (same concept across product types).
  const bySlug = new Map<
    string,
    { name: string; unit: string | null; options: Set<string>; sortOrder: number }
  >();
  for (const d of defs) {
    const entry =
      bySlug.get(d.slug) ??
      { name: d.name, unit: d.unit, options: new Set<string>(), sortOrder: d.sortOrder };
    if (Array.isArray(d.options)) {
      for (const o of d.options) entry.options.add(String(o));
    }
    bySlug.set(d.slug, entry);
  }

  // For filters without predefined options, gather observed values on products.
  const slugs = [...bySlug.keys()];
  const observed = await prisma.productCharacteristicValue.findMany({
    where: {
      valueText: { not: null },
      definition: { slug: { in: slugs } },
      product: { status: "ACTIVE", categoryId: { in: categoryIds } },
    },
    select: { valueText: true, definition: { select: { slug: true } } },
    take: 2000,
  });
  for (const v of observed) {
    const entry = bySlug.get(v.definition.slug);
    if (entry && v.valueText) entry.options.add(v.valueText);
  }

  const filters: DynamicCatalogFilter[] = [];
  for (const [slug, entry] of bySlug) {
    const values = [...entry.options].filter(Boolean).sort((a, b) =>
      a.localeCompare(b, "ru", { numeric: true }),
    );
    // Only useful filters: at least two distinct discrete values.
    if (values.length >= 2) {
      filters.push({ slug, name: entry.name, unit: entry.unit, values: values.slice(0, 20) });
    }
  }

  return filters
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .slice(0, limitFilters);
}

export async function listAdminTaxonomyTree() {
  const [categories, productTypes] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        aliases: true,
        _count: { select: { products: true, productTypes: true } },
      },
    }),
    prisma.productType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        aliases: true,
        characteristics: { orderBy: { sortOrder: "asc" } },
        _count: { select: { products: true } },
      },
    }),
  ]);
  return { categories, productTypes };
}

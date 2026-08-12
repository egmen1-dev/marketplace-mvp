/**
 * Facet foundation — filterable characteristics per ProductType / Category.
 * UI not implemented; API readiness for catalog facets.
 */

import type { PrismaClient } from "@prisma/client";

export type FacetDefinition = {
  id: string;
  slug: string;
  name: string;
  type: string;
  unit: string | null;
  options: string[] | null;
  productTypeId: string;
  productTypeName: string;
};

function mapFacet(
  row: {
    id: string;
    slug: string;
    name: string;
    type: string;
    unit: string | null;
    options: unknown;
    productTypeId: string;
    productType: { name: string; lotName: string | null };
  },
): FacetDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    unit: row.unit,
    options: Array.isArray(row.options) ? row.options.map(String) : null,
    productTypeId: row.productTypeId,
    productTypeName: row.productType.lotName ?? row.productType.name,
  };
}

/** Filter definitions for a single ProductType. */
export async function getFacetDefinitionsForProductType(
  db: PrismaClient,
  productTypeId: string,
): Promise<FacetDefinition[]> {
  const rows = await db.productCharacteristicDefinition.findMany({
    where: { productTypeId, filterable: true },
    orderBy: { sortOrder: "asc" },
    include: {
      productType: { select: { name: true, lotName: true } },
    },
  });
  return rows.map(mapFacet);
}

/** Aggregate facets for all ProductTypes under a category (incl. descendants). */
export async function getFacetDefinitionsForCategory(
  db: PrismaClient,
  categoryId: string,
): Promise<FacetDefinition[]> {
  const categoryIds = await collectDescendantCategoryIds(db, categoryId);
  const types = await db.productType.findMany({
    where: { categoryId: { in: categoryIds }, isActive: true },
    select: { id: true },
  });
  if (!types.length) return [];

  const rows = await db.productCharacteristicDefinition.findMany({
    where: {
      productTypeId: { in: types.map((t) => t.id) },
      filterable: true,
    },
    orderBy: [{ productTypeId: "asc" }, { sortOrder: "asc" }],
    include: {
      productType: { select: { name: true, lotName: true } },
    },
  });
  return rows.map(mapFacet);
}

async function collectDescendantCategoryIds(
  db: PrismaClient,
  rootId: string,
): Promise<string[]> {
  const all = await db.category.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true },
  });
  const byParent = new Map<string | null, string[]>();
  for (const c of all) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c.id);
    byParent.set(c.parentId, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    for (const child of byParent.get(id) ?? []) {
      stack.push(child);
    }
  }
  return out;
}

/**
 * Catalog Core unification — single tree from taxonomy sync + manual seed.
 *
 * Rules:
 * - Taxonomy snapshot/WB is source of truth for ProductType branches
 * - Manual seed categories enrich (description, image) without breaking sync
 * - Legacy seed leaf categories that share slug with ProductType → soft-deactivate + remap products
 * - Paths rebuilt from parent chain after merge
 */

import type { PrismaClient } from "@prisma/client";

import { invalidateTaxonomyCache } from "./cache";

export type UnifyStats = {
  pathsRebuilt: number;
  legacyCategoriesDeactivated: number;
  productsRemapped: number;
  duplicatesMerged: number;
  repaired: number;
};

/** Pure helper — materialized path from slug chain. */
export function computeCategoryPath(
  slug: string,
  parentPath: string | null,
): string {
  return parentPath ? `${parentPath}/${slug}` : slug;
}

/** Rebuild path + level from parent chain for all active categories. */
export async function reconcileCategoryPaths(
  db: PrismaClient,
): Promise<number> {
  const categories = await db.category.findMany({
    select: { id: true, slug: true, parentId: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  function pathFor(id: string): { path: string; level: number } {
    const parts: string[] = [];
    let cur = byId.get(id);
    while (cur) {
      parts.unshift(cur.slug);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return { path: parts.join("/"), level: parts.length };
  }

  let updated = 0;
  for (const cat of categories) {
    const { path, level } = pathFor(cat.id);
    await db.category.update({
      where: { id: cat.id },
      data: { path, level },
    });
    updated += 1;
  }
  return updated;
}

/**
 * Seed historically created Category rows with same slug as ProductType (e.g. drills).
 * Deactivate browse-only duplicates and align products with ProductType.categoryId.
 */
export async function mergeProductTypeSlugCollisions(
  db: PrismaClient,
): Promise<{ deactivated: number; productsRemapped: number }> {
  const productTypes = await db.productType.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, categoryId: true, name: true },
  });

  let deactivated = 0;
  let productsRemapped = 0;

  for (const pt of productTypes) {
    const colliding = await db.category.findMany({
      where: {
        slug: pt.slug,
        isActive: true,
        id: { not: pt.categoryId },
      },
      include: {
        _count: { select: { products: true, productTypes: true } },
      },
    });

    for (const cat of colliding) {
      if (cat._count.productTypes > 0) continue;

      const products = await db.product.findMany({
        where: { categoryId: cat.id },
        select: { id: true, productTypeId: true },
      });

      for (const p of products) {
        await db.product.update({
          where: { id: p.id },
          data: {
            categoryId: pt.categoryId,
            ...(p.productTypeId ? {} : { productTypeId: pt.id }),
          },
        });
        productsRemapped += 1;
      }

      await db.category.update({
        where: { id: cat.id },
        data: {
          isActive: false,
          name: `${cat.name} (объединено → ${pt.name})`,
        },
      });
      deactivated += 1;
    }
  }

  return { deactivated, productsRemapped };
}

/** Detect sync slug-suffix duplicates only (e.g. drills-lot-drills). */
export function baseSlugForDedup(slug: string): string {
  // Only strip sync collision suffixes — never parent/child slugs like home-textile
  return slug.replace(/-lot-[^-]+$/i, "");
}

export async function mergeSlugSuffixDuplicates(
  db: PrismaClient,
): Promise<number> {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      externalSource: true,
      _count: { select: { products: true, productTypes: true } },
    },
  });

  const byBaseSlug = new Map<string, typeof categories>();
  for (const cat of categories) {
    if (!cat.slug.includes("-lot-")) continue;
    const base = baseSlugForDedup(cat.slug);
    const list = byBaseSlug.get(base) ?? [];
    list.push(cat);
    byBaseSlug.set(base, list);
  }

  // Attach canonical (exact base slug) into each group when present
  for (const cat of categories) {
    if (!byBaseSlug.has(cat.slug)) continue;
    const list = byBaseSlug.get(cat.slug)!;
    if (!list.some((c) => c.id === cat.id)) list.push(cat);
  }

  let merged = 0;
  for (const [base, group] of byBaseSlug) {
    if (group.length < 1) continue;
    const canonical =
      categories.find((c) => c.slug === base) ??
      group.find((c) => !c.slug.includes("-lot-")) ??
      group[0];
    if (!canonical) continue;
    const dupes = group.filter(
      (c) => c.id !== canonical.id && c.slug.includes("-lot-"),
    );
    for (const dupe of dupes) {
      if (dupe._count.productTypes > 0) continue;
      if (dupe._count.products > 0) {
        await db.product.updateMany({
          where: { categoryId: dupe.id },
          data: { categoryId: canonical.id },
        });
      }
      await db.category.update({
        where: { id: dupe.id },
        data: { isActive: false },
      });
      merged += 1;
    }
  }
  return merged;
}

/**
 * Repair false deactivations from aggressive slug stripping (pre-fix).
 * Does not revive ProductType leaf collisions marked «объединено».
 */
export async function repairFalseCategoryDeactivations(
  db: PrismaClient,
): Promise<number> {
  const typeSlugs = new Set(
    (
      await db.productType.findMany({
        where: { isActive: true },
        select: { slug: true },
      })
    ).map((t) => t.slug),
  );

  const inactive = await db.category.findMany({
    where: {
      isActive: false,
      NOT: { name: { contains: "объединено" } },
    },
    select: {
      id: true,
      slug: true,
      _count: { select: { children: true, products: true, productTypes: true } },
    },
  });

  let repaired = 0;
  for (const cat of inactive) {
    if (typeSlugs.has(cat.slug)) continue;
    if (cat.slug.includes("-lot-")) continue;
    // Revive browse categories that still have children/products or are seed branches
    if (
      cat._count.children === 0 &&
      cat._count.products === 0 &&
      cat._count.productTypes === 0
    ) {
      continue;
    }
    await db.category.update({
      where: { id: cat.id },
      data: { isActive: true },
    });
    repaired += 1;
  }
  return repaired;
}

/** Full catalog core unification — safe to run after seed or taxonomy sync. */
export async function unifyCatalogCore(
  db: PrismaClient,
): Promise<UnifyStats & { repaired: number }> {
  const collision = await mergeProductTypeSlugCollisions(db);
  const duplicatesMerged = await mergeSlugSuffixDuplicates(db);
  const repaired = await repairFalseCategoryDeactivations(db);
  const pathsRebuilt = await reconcileCategoryPaths(db);
  invalidateTaxonomyCache();

  return {
    pathsRebuilt,
    legacyCategoriesDeactivated: collision.deactivated,
    productsRemapped: collision.productsRemapped,
    duplicatesMerged,
    repaired,
  };
}

/**
 * Map existing products to ProductTypes by category slug / name heuristics.
 * Does not break products: productTypeId stays null when uncertain.
 */

import type { PrismaClient } from "@prisma/client";

import { matchProductTypes } from "./matcher";
import type { MatchCandidate } from "./types";

export type MigrationMappingRow = {
  productId: string;
  productName: string;
  categorySlug: string | null;
  status: "mapped" | "needs_review" | "unmapped";
  productTypeId: string | null;
  productTypeName: string | null;
  confidence: number | null;
};

export type MigrationReport = {
  mapped: number;
  needsReview: number;
  unmapped: number;
  rows: MigrationMappingRow[];
};

/** Slug hints: leaf category slug → preferred product type slug */
const SLUG_HINTS: Record<string, string> = {
  "heat-guns": "heat-guns",
  "power-tools": "drills",
  drills: "drills",
  electronics: "laptops",
  computers: "laptops",
  clothing: "shoes",
  footwear: "shoes",
};

export async function buildMatchCandidates(
  db: PrismaClient,
): Promise<MatchCandidate[]> {
  const types = await db.productType.findMany({
    where: { isActive: true },
    include: {
      aliases: true,
      category: { select: { id: true, name: true, path: true, parentId: true } },
    },
  });

  const categories = await db.category.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  function breadcrumb(categoryId: string): string[] {
    const parts: string[] = [];
    let cur = byId.get(categoryId);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts;
  }

  return types.map((t) => ({
    productTypeId: t.id,
    name: t.lotName ?? t.name,
    slug: t.slug,
    categoryId: t.categoryId,
    breadcrumb: [...breadcrumb(t.categoryId), t.lotName ?? t.name],
    aliases: t.aliases.map((a) => a.alias),
  }));
}

export async function migrateExistingProducts(
  db: PrismaClient,
  options?: { apply?: boolean; minConfidence?: number; reviewThreshold?: number },
): Promise<MigrationReport> {
  const apply = options?.apply ?? false;
  const minConfidence = options?.minConfidence ?? 0.45;
  const reviewThreshold = options?.reviewThreshold ?? 0.7;

  const candidates = await buildMatchCandidates(db);
  const products = await db.product.findMany({
    where: { productTypeId: null },
    select: {
      id: true,
      name: true,
      category: { select: { id: true, slug: true, name: true } },
    },
  });

  const rows: MigrationMappingRow[] = [];
  let mapped = 0;
  let needsReview = 0;
  let unmapped = 0;

  for (const p of products) {
    const hintedSlug = p.category?.slug
      ? SLUG_HINTS[p.category.slug]
      : undefined;
    let matches = matchProductTypes(p.name, candidates, { limit: 5 });

    if (hintedSlug) {
      const hint = candidates.find((c) => c.slug === hintedSlug);
      if (hint && !matches.some((m) => m.productTypeId === hint.productTypeId)) {
        matches = [
          {
            productTypeId: hint.productTypeId,
            name: hint.name,
            breadcrumb: hint.breadcrumb,
            confidence: 0.55,
            matchedTerms: [p.category?.slug ?? ""],
          },
          ...matches,
        ];
      }
    }

    const best = matches[0];
    if (!best || best.confidence < minConfidence) {
      unmapped += 1;
      rows.push({
        productId: p.id,
        productName: p.name,
        categorySlug: p.category?.slug ?? null,
        status: "unmapped",
        productTypeId: null,
        productTypeName: null,
        confidence: best?.confidence ?? null,
      });
      continue;
    }

    if (best.confidence < reviewThreshold) {
      needsReview += 1;
      rows.push({
        productId: p.id,
        productName: p.name,
        categorySlug: p.category?.slug ?? null,
        status: "needs_review",
        productTypeId: best.productTypeId,
        productTypeName: best.name,
        confidence: best.confidence,
      });
      continue;
    }

    mapped += 1;
    rows.push({
      productId: p.id,
      productName: p.name,
      categorySlug: p.category?.slug ?? null,
      status: "mapped",
      productTypeId: best.productTypeId,
      productTypeName: best.name,
      confidence: best.confidence,
    });

    if (apply) {
      const pt = await db.productType.findUnique({
        where: { id: best.productTypeId },
        select: { categoryId: true },
      });
      await db.product.update({
        where: { id: p.id },
        data: {
          productTypeId: best.productTypeId,
          ...(pt && !p.category
            ? { categoryId: pt.categoryId }
            : {}),
        },
      });
    }
  }

  return { mapped, needsReview, unmapped, rows };
}

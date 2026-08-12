/**
 * ProductUnderstandingEngine — deterministic rules + taxonomy matcher.
 * Does NOT mutate Product; returns suggestions for human confirmation.
 * Future: swap/extend with LLM provider behind the same interface.
 */

import type { PrismaClient } from "@prisma/client";

import { getMatchCandidates, matchProductTypes } from "@/lib/catalog-taxonomy";
import { normalizeAlias, slugifyRu } from "@/lib/catalog-taxonomy/normalize";

import {
  extractRawAttributes,
  mapAttributesToDefinitions,
} from "./attributes";
import { extractBrand, extractModel } from "./brand-model";
import { suggestSeo } from "./seo";
import {
  toFieldConfidence,
  type ProductUnderstandingResult,
  type UnderstandProductInput,
} from "./types";

export async function understandProduct(
  db: PrismaClient,
  input: UnderstandProductInput,
): Promise<ProductUnderstandingResult> {
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() || null;

  if (title.length < 3) {
    return emptyResult();
  }

  const candidates = await getMatchCandidates(db);
  const matches = matchProductTypes(title, candidates, { limit: 5 });
  const best = matches[0] ?? null;

  let productTypeSuggestion: ProductUnderstandingResult["productTypeSuggestion"] =
    null;
  let categorySuggestion: ProductUnderstandingResult["categorySuggestion"] =
    null;
  let definitions: Array<{
    id: string;
    slug: string;
    name: string;
    type: string;
    unit: string | null;
  }> = [];

  if (best) {
    const pt = await db.productType.findUnique({
      where: { id: best.productTypeId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        characteristics: {
          select: { id: true, slug: true, name: true, type: true, unit: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (pt) {
      definitions = pt.characteristics;
      productTypeSuggestion = {
        id: pt.id,
        name: pt.lotName ?? pt.name,
        slug: pt.slug,
        categoryId: pt.categoryId,
        breadcrumb: best.breadcrumb,
        confidence: toFieldConfidence(best.confidence),
      };
      categorySuggestion = {
        id: pt.category.id,
        name: pt.category.name,
        slug: pt.category.slug,
        breadcrumb: best.breadcrumb.slice(0, -1),
        confidence: toFieldConfidence(
          Math.min(0.99, best.confidence * 0.95),
        ),
      };
    }
  }

  const brandHit = extractBrand(title);
  let brand: ProductUnderstandingResult["brand"] = null;
  if (brandHit) {
    const existing = await db.brand.findFirst({
      where: {
        OR: [
          { slug: brandHit.slug },
          { normalizedName: normalizeAlias(brandHit.name) },
        ],
        isActive: true,
      },
      select: { id: true },
    });
    brand = {
      name: brandHit.name,
      slug: brandHit.slug,
      brandId: existing?.id ?? null,
      confidence: brandHit.confidence,
    };
  }

  const modelHit = extractModel(title, brand?.name);
  const model = modelHit
    ? { name: modelHit.name, confidence: modelHit.confidence }
    : null;

  const rawAttrs = extractRawAttributes(title, description);
  const characteristics = mapAttributesToDefinitions(rawAttrs, definitions);

  const aliases = [
    ...(brand ? [brand.name] : []),
    ...(model ? [model.name] : []),
    ...(productTypeSuggestion ? [productTypeSuggestion.name] : []),
  ].filter(Boolean);

  const seo = suggestSeo({
    title,
    productTypeName: productTypeSuggestion?.name,
    brand: brand?.name,
    model: model?.name,
    characteristics,
  });

  const ptScore = productTypeSuggestion?.confidence.score ?? 0;
  const brandScore = brand?.confidence.score ?? 0;
  const charScores = characteristics.map((c) => c.confidence.score);
  const charAvg = charScores.length
    ? charScores.reduce((a, b) => a + b, 0) / charScores.length
    : 0;

  const overall = toFieldConfidence(
    ptScore * 0.45 + brandScore * 0.25 + charAvg * 0.2 + (model ? 0.1 : 0),
  );

  return {
    categorySuggestion,
    productTypeSuggestion,
    brand,
    model,
    characteristics,
    aliases: [...new Set(aliases.map((a) => String(a)))],
    seo: {
      title: seo.title,
      description: seo.description,
      shortDescription: seo.shortDescription,
    },
    confidence: {
      overall,
      category: categorySuggestion?.confidence ?? toFieldConfidence(0),
      productType: productTypeSuggestion?.confidence ?? toFieldConfidence(0),
      brand: brand?.confidence ?? toFieldConfidence(0),
      characteristics: toFieldConfidence(charAvg),
    },
    engine: "rules-v1",
  };
}

/** Ensure Brand row exists for confirmed suggestion (lazy create). */
export async function ensureBrand(
  db: PrismaClient,
  name: string,
): Promise<{ id: string; name: string; slug: string }> {
  const slug = slugifyRu(name);
  const normalizedName = normalizeAlias(name);
  const existing = await db.brand.findFirst({
    where: {
      OR: [{ slug }, { normalizedName }],
    },
  });
  if (existing) {
    return { id: existing.id, name: existing.name, slug: existing.slug };
  }
  const created = await db.brand.create({
    data: {
      name,
      slug,
      normalizedName,
      aliases: [],
    },
  });
  return { id: created.id, name: created.name, slug: created.slug };
}

function emptyResult(): ProductUnderstandingResult {
  const zero = toFieldConfidence(0);
  return {
    categorySuggestion: null,
    productTypeSuggestion: null,
    brand: null,
    model: null,
    characteristics: [],
    aliases: [],
    seo: { title: null, description: null, shortDescription: null },
    confidence: {
      overall: zero,
      category: zero,
      productType: zero,
      brand: zero,
      characteristics: zero,
    },
    engine: "rules-v1",
  };
}

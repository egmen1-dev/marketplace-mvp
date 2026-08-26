import { prisma } from "@/lib/prisma";

import { computeContentVersionHash } from "./content-version";
import { buildModerationResult } from "./decision-engine";
import { isLotPolicyV2ShadowEnabled } from "./config";
import { evaluateLotPolicyV2 } from "./policy-v2/evaluate";
import { analyzeImageSignals } from "./signals/image-signals";
import { analyzePriceSignals } from "./signals/price-signals";
import { analyzeProhibitedSignals } from "./signals/prohibited-signals";
import { analyzeStructuralSignals } from "./signals/structural-signals";
import { analyzeTextSignals } from "./signals/text-signals";
import type { ModerationResult } from "./types";

export async function runLotModerationEngine(productId: string): Promise<ModerationResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      characteristicValues: {
        include: { definition: { select: { id: true, name: true } } },
      },
      _count: { select: { characteristicValues: true } },
    },
  });

  if (!product) {
    return buildModerationResult({
      reasons: [],
      signals: [],
      imageSignals: analyzeImageSignals({ imageCount: 0, imageUrls: [] }).imageSignals,
      contentVersionHash: "",
    });
  }

  const price = Number(product.price);
  const text = analyzeTextSignals({ title: product.name, description: product.description });
  const prohibited = analyzeProhibitedSignals({ name: product.name, description: product.description });
  const priceSignals = analyzePriceSignals(price);
  const structural = await analyzeStructuralSignals({
    productId,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    characteristicCount: product._count.characteristicValues,
    imageCount: product.images.length,
    hasPrimary: product.images.some((img) => img.isPrimary) || product.images.length > 0,
  });
  const image = analyzeImageSignals({
    imageCount: product.images.length,
    imageUrls: product.images.map((img) => img.url),
  });

  const reasons = [
    ...text.reasons,
    ...prohibited.reasons,
    ...priceSignals.reasons,
    ...structural.reasons,
  ];
  const signals = [
    ...text.signals,
    ...prohibited.signals,
    ...priceSignals.signals,
    ...structural.signals,
  ];

  const contentVersionHash = computeContentVersionHash({
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    productTypeId: product.productTypeId,
    condition: product.condition,
    imageUrls: product.images.map((img) => img.url),
    characteristics: product.characteristicValues.map((row) => ({
      definitionId: row.definitionId,
      value: row.valueText ?? Number(row.valueNumber ?? 0),
    })),
  });

  const baseResult = buildModerationResult({
    reasons,
    signals,
    imageSignals: image.imageSignals,
    contentVersionHash,
  });

  if (!isLotPolicyV2ShadowEnabled()) {
    return baseResult;
  }

  const category = product.categoryId
    ? await prisma.category.findUnique({ where: { id: product.categoryId }, select: { slug: true } })
    : null;
  const productType = product.productTypeId
    ? await prisma.productType.findUnique({ where: { id: product.productTypeId }, select: { slug: true } })
    : null;

  const policyV2 = evaluateLotPolicyV2({
    title: product.name,
    description: product.description,
    categorySlug: category?.slug ?? null,
    productTypeSlug: productType?.slug ?? null,
    characteristics: product.characteristicValues.map((row) => ({
      name: row.definition.name,
      value: row.valueText ?? row.valueNumber,
    })),
    price,
    imageUrls: product.images.map((img) => img.url),
    imageAltTexts: product.images.map((img) => img.altText ?? ""),
  });

  return { ...baseResult, policyV2 };
}

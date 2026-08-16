import { prisma } from "@/lib/prisma";

import { buildFactorScores } from "./commercial-quality-score";
import { getCachedQualityEvaluation, setCachedQualityEvaluation } from "./cache";
import { evaluateProductQualityInput } from "./evaluate";
import { isMarketplaceContentQualityEnabled } from "./flags";
import type {
  AdminContentQualityDashboard,
  ProductQualityEvaluation,
  ProductQualityHistoryItem,
  ProductQualityInput,
  ProductQualitySnapshotRow,
} from "./types";

async function loadProductQualityInput(productId: string): Promise<ProductQualityInput | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: { select: { name: true } },
      productModeration: true,
      characteristicValues: {
        include: { definition: { select: { name: true, slug: true } } },
      },
    },
  });
  if (!product) return null;

  return {
    productId: product.id,
    name: product.name,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
      pathname: img.pathname,
    })),
    characteristics: product.characteristicValues.map((cv) => ({
      name: cv.definition.name,
      slug: cv.definition.slug,
      value:
        cv.valueText ??
        (cv.valueNumber != null ? String(cv.valueNumber) : cv.valueBoolean ? "да" : ""),
    })),
    hasVideo: false,
    moderationStatus: product.productModeration?.status ?? null,
    prohibitedHit: product.productModeration?.prohibitedHit ?? false,
  };
}

function mapSnapshotRow(
  row: {
    productId: string;
    overallScore: number;
    confidence: number;
    factorScores: unknown;
    provider: string;
    qualityModelVersion: string;
    criticVersion: string;
    providerVersion: string;
    topEligibility: string;
    failedGates: unknown;
    blockers: unknown;
    warnings: unknown;
    strengths: unknown;
    recommendations: unknown;
    photoEvaluations: unknown;
    evaluatedAt: Date;
    contentHash: string | null;
    evaluation: unknown;
  },
): ProductQualitySnapshotRow {
  return {
    productId: row.productId,
    overallScore: row.overallScore,
    confidence: row.confidence,
    factorScores: row.factorScores as Record<string, number>,
    provider: row.provider,
    qualityModelVersion: row.qualityModelVersion,
    criticVersion: row.criticVersion,
    providerVersion: row.providerVersion,
    topEligibility: row.topEligibility as ProductQualitySnapshotRow["topEligibility"],
    failedGates: row.failedGates as ProductQualitySnapshotRow["failedGates"],
    blockers: row.blockers as string[],
    warnings: row.warnings as string[],
    strengths: row.strengths as string[],
    recommendations: row.recommendations as ProductQualitySnapshotRow["recommendations"],
    photoEvaluations: (row.photoEvaluations ?? []) as ProductQualitySnapshotRow["photoEvaluations"],
    evaluatedAt: row.evaluatedAt.toISOString(),
    contentHash: row.contentHash,
    evaluation: row.evaluation as ProductQualityEvaluation,
  };
}

export async function persistQualitySnapshot(
  evaluation: ProductQualityEvaluation,
): Promise<void> {
  const factorScores = buildFactorScores(evaluation);
  await prisma.productQualitySnapshot.upsert({
    where: { productId: evaluation.productId },
    create: {
      productId: evaluation.productId,
      overallScore: evaluation.overallScore,
      confidence: evaluation.confidence,
      factorScores,
      photoEvaluations: evaluation.photo.images,
      blockers: evaluation.blockers,
      warnings: evaluation.warnings,
      strengths: evaluation.strengths,
      recommendations: evaluation.recommendations,
      failedGates: evaluation.failedGates,
      topEligibility: evaluation.topEligibility,
      provider: evaluation.provider,
      qualityModelVersion: evaluation.qualityModelVersion,
      criticVersion: evaluation.criticVersion,
      providerVersion: evaluation.providerVersion,
      contentHash: evaluation.contentHash,
      evaluation,
    },
    update: {
      overallScore: evaluation.overallScore,
      confidence: evaluation.confidence,
      factorScores,
      photoEvaluations: evaluation.photo.images,
      blockers: evaluation.blockers,
      warnings: evaluation.warnings,
      strengths: evaluation.strengths,
      recommendations: evaluation.recommendations,
      failedGates: evaluation.failedGates,
      topEligibility: evaluation.topEligibility,
      provider: evaluation.provider,
      qualityModelVersion: evaluation.qualityModelVersion,
      criticVersion: evaluation.criticVersion,
      providerVersion: evaluation.providerVersion,
      contentHash: evaluation.contentHash,
      evaluation,
    },
  });

  await prisma.productQualityHistory.create({
    data: {
      productId: evaluation.productId,
      overallScore: evaluation.overallScore,
      factorScores,
      provider: evaluation.provider,
      qualityModelVersion: evaluation.qualityModelVersion,
    },
  });

  setCachedQualityEvaluation(evaluation.productId, evaluation.contentHash, evaluation);
}

export async function evaluateProductQuality(productId: string): Promise<ProductQualityEvaluation | null> {
  if (!isMarketplaceContentQualityEnabled()) return null;
  const input = await loadProductQualityInput(productId);
  if (!input) return null;

  const cached = getCachedQualityEvaluation(productId, input.contentHash ?? null);
  if (cached) return cached;

  const existing = await prisma.productQualitySnapshot.findUnique({
    where: { productId },
  });
  if (existing?.contentHash && existing.contentHash === input.contentHash) {
    const row = mapSnapshotRow(existing);
    setCachedQualityEvaluation(productId, row.contentHash, row.evaluation);
    return row.evaluation;
  }

  const evaluation = await evaluateProductQualityInput(input);
  await persistQualitySnapshot(evaluation);
  return evaluation;
}

export async function getProductQuality(productId: string): Promise<ProductQualitySnapshotRow | null> {
  if (!isMarketplaceContentQualityEnabled()) return null;
  const row = await prisma.productQualitySnapshot.findUnique({ where: { productId } });
  if (!row) return null;
  return mapSnapshotRow(row);
}

export async function getLatestQualitySnapshot(
  productId: string,
): Promise<ProductQualitySnapshotRow | null> {
  return getProductQuality(productId);
}

export async function getProductQualityHistory(
  productId: string,
  limit = 20,
): Promise<ProductQualityHistoryItem[]> {
  const rows = await prisma.productQualityHistory.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    overallScore: r.overallScore,
    factorScores: r.factorScores as Record<string, number>,
    provider: r.provider,
    qualityModelVersion: r.qualityModelVersion,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getQualityRecommendations(productId: string) {
  const snapshot = await getProductQuality(productId);
  return snapshot?.recommendations ?? [];
}

export async function getAdminContentQualityDashboard(): Promise<AdminContentQualityDashboard> {
  if (!isMarketplaceContentQualityEnabled()) {
    return {
      enabled: false,
      averageOverall: 0,
      averagePhotoQuality: 0,
      averageDescriptionQuality: 0,
      averageSeoQuality: 0,
      averageConsistency: 0,
      hardGateFailures: [],
      manipulationAttempts: 0,
      worstCategories: [],
      bestCategories: [],
      providerBreakdown: [],
    };
  }

  const snapshots = await prisma.productQualitySnapshot.findMany({
    take: 500,
    orderBy: { evaluatedAt: "desc" },
    include: { product: { select: { category: { select: { name: true } } } } },
  });

  if (snapshots.length === 0) {
    return {
      enabled: true,
      averageOverall: 0,
      averagePhotoQuality: 0,
      averageDescriptionQuality: 0,
      averageSeoQuality: 0,
      averageConsistency: 0,
      hardGateFailures: [],
      manipulationAttempts: 0,
      worstCategories: [],
      bestCategories: [],
      providerBreakdown: [],
    };
  }

  const avg = (pick: (f: Record<string, number>) => number) => {
    const vals = snapshots.map((s) => pick(s.factorScores as Record<string, number>));
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const gateCounts = new Map<string, number>();
  let manipulationAttempts = 0;
  for (const s of snapshots) {
    for (const gate of s.failedGates as string[]) {
      gateCounts.set(gate, (gateCounts.get(gate) ?? 0) + 1);
    }
    const factors = s.factorScores as Record<string, number>;
    if ((factors.manipulation ?? 100) < 45) manipulationAttempts += 1;
  }

  const byCategory = new Map<string, number[]>();
  for (const s of snapshots) {
    const name = s.product.category?.name ?? "Без категории";
    const list = byCategory.get(name) ?? [];
    list.push(s.overallScore);
    byCategory.set(name, list);
  }
  const categoryAvgs = [...byCategory.entries()].map(([name, scores]) => ({
    name,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));
  categoryAvgs.sort((a, b) => a.avgScore - b.avgScore);

  const providers = new Map<string, number>();
  for (const s of snapshots) {
    providers.set(s.provider, (providers.get(s.provider) ?? 0) + 1);
  }

  return {
    enabled: true,
    averageOverall: Math.round(
      snapshots.reduce((a, s) => a + s.overallScore, 0) / snapshots.length,
    ),
    averagePhotoQuality: avg((f) => f.photo ?? 0),
    averageDescriptionQuality: avg((f) => f.description ?? 0),
    averageSeoQuality: avg((f) => f.seo ?? 0),
    averageConsistency: avg((f) => f.consistency ?? 0),
    hardGateFailures: [...gateCounts.entries()].map(([gate, count]) => ({
      gate: gate as AdminContentQualityDashboard["hardGateFailures"][0]["gate"],
      count,
    })),
    manipulationAttempts,
    worstCategories: categoryAvgs.slice(0, 5),
    bestCategories: [...categoryAvgs].reverse().slice(0, 5),
    providerBreakdown: [...providers.entries()].map(([provider, count]) => ({ provider, count })),
  };
}

export { loadProductQualityInput };

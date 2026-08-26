import { prisma } from "@/lib/prisma";

import { buildEvaluationCompleteness } from "../evaluation-completeness";
import { evaluateLotImages } from "../providers/evaluate-lot-images";
import { evaluateLotPolicyV2 } from "../policy-v2/evaluate";
import { mapPolicyV2ToModerationDecision } from "../policy-v2/safe-auto-approval";
import type { LotImageEvaluationAggregate } from "../providers/types";
import type { PolicyEvaluationResult } from "../policy-v2/types";
import {
  classifyShadowComparison,
  isCriticalFalseNegative,
  type ShadowComparisonClass,
} from "./classify-comparison";

export type StagingProductEvalRow = {
  productId: string;
  name: string;
  group: "A_ORDINARY" | "B_POLICY_TRIGGERED" | "C_SYNTHETIC";
  categorySlug: string | null;
  productTypeSlug: string | null;
  imageCount: number;
  policyDecision: string;
  systemRecommendation: string;
  riskScore: number;
  rulesTriggered: string[];
  conflicts: string[];
  evaluationCompleteness: Record<string, unknown>;
  notEvaluatedDimensions: string[];
  providerFailures: boolean;
  humanStatus: string | null;
  comparison: ShadowComparisonClass;
  criticalFalseNegative: boolean;
  hardFalsePositive: boolean;
  manualReviewFalsePositive: boolean;
  latencyMs: number;
  ocrStatus: string | null;
  imageStatus: string | null;
  cacheHits: number;
  ocrCalls: number;
  imageCalls: number;
};

function isSyntheticFixture(name: string): boolean {
  return /^(rc\d|rc10|test-|fixture-)/i.test(name);
}

function isPolicyTriggered(name: string, description: string | null): boolean {
  const blob = `${name} ${description ?? ""}`.toLowerCase();
  return /вейп|vape|никотин|nicotine|оруж|weapon|алког|alcohol|telegram|whatsapp|\+7|http/i.test(blob);
}

export async function evaluateStagingProductFromDb(productId: string): Promise<StagingProductEvalRow | null> {
  const started = Date.now();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      characteristicValues: { include: { definition: { select: { name: true } } } },
      category: { select: { slug: true } },
      productType: { select: { slug: true } },
      productModeration: { select: { status: true, systemRecommendation: true } },
    },
  });
  if (!product) return null;

  const group = isSyntheticFixture(product.name)
    ? "C_SYNTHETIC"
    : isPolicyTriggered(product.name, product.description)
      ? "B_POLICY_TRIGGERED"
      : "A_ORDINARY";

  let imageEvaluation: LotImageEvaluationAggregate | null = null;
  const cacheHits = 0;
  let ocrCalls = 0;
  let imageCalls = 0;
  let providerFailures = false;

  if (product.images.length > 0) {
    const before = Date.now();
    imageEvaluation = await evaluateLotImages({
      images: product.images.map((img, idx) => ({
        imageId: img.id,
        url: img.url,
        pathname: img.pathname,
        alt: img.alt,
        sortOrder: img.sortOrder ?? idx,
      })),
    });
    void before;
    ocrCalls = product.images.length;
    imageCalls = product.images.length;
    providerFailures =
      imageEvaluation.ocrStatus === "FAILED" ||
      imageEvaluation.ocrStatus === "TIMEOUT" ||
      imageEvaluation.imageStatus === "FAILED" ||
      imageEvaluation.imageStatus === "TIMEOUT";
  }

  const policyV2: PolicyEvaluationResult = evaluateLotPolicyV2({
    title: product.name,
    description: product.description,
    categorySlug: product.category?.slug ?? null,
    productTypeSlug: product.productType?.slug ?? null,
    characteristics: product.characteristicValues.map((row) => ({
      name: row.definition.name,
      value:
        row.valueText ??
        (row.valueNumber != null ? Number(row.valueNumber) : null) ??
        (row.valueBoolean != null ? (row.valueBoolean ? "true" : "false") : null),
    })),
    price: Number(product.price),
    imageUrls: product.images.map((i) => i.url),
    imageAltTexts: product.images.map((i) => i.alt ?? ""),
    imageIds: product.images.map((i) => i.id),
    imageEvaluation,
  });

  const completeness =
    policyV2.evaluationCompleteness ??
    buildEvaluationCompleteness({
      hasImages: product.images.length > 0,
      imageEvaluation,
      policyResult: policyV2,
    });

  const humanStatus = product.productModeration?.status ?? null;
  const comparison = classifyShadowComparison({
    systemDecision: policyV2.decisionClass,
    humanStatus,
    providerFailures,
    notEvaluatedDimensions: policyV2.notEvaluatedDimensions,
  });

  const criticalFn = isCriticalFalseNegative({
    systemDecision: policyV2.decisionClass,
    humanStatus,
    rulesTriggered: policyV2.rulesTriggered,
  });

  const hardFp =
    policyV2.decisionClass === "HARD_BLOCK" && humanStatus === "APPROVED";
  const manualFp =
    (policyV2.decisionClass === "MANUAL_REVIEW" || policyV2.decisionClass === "RESTRICTED_REVIEW") &&
    humanStatus === "APPROVED";

  const riskScore = Math.round((1 - policyV2.confidence) * 100);

  return {
    productId: product.id,
    name: product.name,
    group,
    categorySlug: product.category?.slug ?? null,
    productTypeSlug: product.productType?.slug ?? null,
    imageCount: product.images.length,
    policyDecision: policyV2.decisionClass,
    systemRecommendation: mapPolicyV2ToModerationDecision(policyV2.decisionClass),
    riskScore,
    rulesTriggered: policyV2.rulesTriggered,
    conflicts: policyV2.conflicts,
    evaluationCompleteness: completeness as unknown as Record<string, unknown>,
    notEvaluatedDimensions: policyV2.notEvaluatedDimensions,
    providerFailures,
    humanStatus,
    comparison,
    criticalFalseNegative: criticalFn,
    hardFalsePositive: hardFp,
    manualReviewFalsePositive: manualFp,
    latencyMs: Date.now() - started,
    ocrStatus: imageEvaluation?.ocrStatus ?? null,
    imageStatus: imageEvaluation?.imageStatus ?? null,
    cacheHits,
    ocrCalls,
    imageCalls,
  };
}

export async function sampleStagingProductsFromDb(targetReal = 75): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: {
      status: { in: ["ACTIVE", "DRAFT"] },
    },
    select: { id: true, name: true, description: true, status: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const synthetic = products.filter((p) => isSyntheticFixture(p.name)).map((p) => p.id);
  const real = products.filter((p) => !isSyntheticFixture(p.name));

  const ordinary = real.filter((p) => !isPolicyTriggered(p.name, p.description)).slice(0, Math.ceil(targetReal * 0.6));
  const triggered = real.filter((p) => isPolicyTriggered(p.name, p.description)).slice(0, Math.ceil(targetReal * 0.4));

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of [...ordinary.map((p) => p.id), ...triggered.map((p) => p.id), ...synthetic.slice(0, 10)]) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.filter((x) => !synthetic.includes(x)).length >= targetReal && ids.length >= targetReal) break;
  }
  return ids.slice(0, Math.max(targetReal, ids.length));
}

export function countGuardedAutoEligible(rows: StagingProductEvalRow[]): {
  guardedAutoEligibleCount: number;
  guardedAutoEligiblePercent: number;
} {
  let eligible = 0;
  for (const row of rows) {
    if (row.group === "C_SYNTHETIC") continue;
    if (row.policyDecision !== "ALLOW") continue;
    if (row.conflicts.length > 0) continue;
    if (row.providerFailures) continue;
    if (row.notEvaluatedDimensions.length > 0) continue;
    const completeness = row.evaluationCompleteness as { allRequiredEvaluated?: boolean };
    if (!completeness.allRequiredEvaluated) continue;
    if (row.rulesTriggered.length > 0) continue;
    eligible++;
  }
  const realCount = rows.filter((r) => r.group !== "C_SYNTHETIC").length;
  return {
    guardedAutoEligibleCount: eligible,
    guardedAutoEligiblePercent: realCount > 0 ? eligible / realCount : 0,
  };
}

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { classifyShadowComparison } from "./classify-comparison";
import { evaluateStagingProductFromDb } from "./evaluate-product";
import { mapPolicyV2ToModerationDecision } from "../policy-v2/safe-auto-approval";
import { LOT_POLICY_V2 } from "../policy-v2/types";

export type HumanShadowDecision = "APPROVE" | "NEEDS_CHANGES" | "REJECT" | "MANUAL_REVIEW";

export async function getOrCreateOpenShadowBatch(sampleBatchId?: string) {
  const id = sampleBatchId ?? `shadow-${new Date().toISOString().slice(0, 10)}`;
  return prisma.policyShadowReviewBatch.upsert({
    where: { sampleBatchId: id },
    create: { id: randomUUID(), sampleBatchId: id, status: "OPEN", targetSampleSize: 75 },
    update: {},
  });
}

export async function getShadowReviewQueue(input: {
  batchId: string;
  productIds: string[];
  reviewerId: string;
}) {
  const existing = await prisma.policyShadowHumanReview.findMany({
    where: { batchId: input.batchId, reviewerId: input.reviewerId },
    select: { productId: true },
  });
  const reviewed = new Set(existing.map((r) => r.productId));
  return input.productIds.filter((id) => !reviewed.has(id));
}

/** Product detail for blind review — no system recommendation exposed. */
export async function getBlindShadowProductDetail(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: { select: { name: true, slug: true } },
      productType: { select: { name: true, slug: true } },
      characteristicValues: { include: { definition: { select: { name: true } } } },
    },
  });
  if (!product) return null;
  return {
    id: product.id,
    title: product.name,
    description: product.description,
    contentVersion: product.contentVersion,
    category: product.category,
    productType: product.productType,
    images: product.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt })),
    characteristics: product.characteristicValues.map((row) => ({
      name: row.definition.name,
      value: row.valueText ?? row.valueNumber?.toString() ?? row.valueBoolean,
    })),
  };
}

export async function recordShadowHumanReview(input: {
  batchId: string;
  productId: string;
  reviewerId: string;
  humanDecision: HumanShadowDecision;
  humanReason?: string;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { contentVersion: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const existing = await prisma.policyShadowHumanReview.findFirst({
    where: {
      batchId: input.batchId,
      productId: input.productId,
      contentVersion: product.contentVersion,
      reviewerId: input.reviewerId,
    },
  });
  if (existing) throw new Error("DUPLICATE_REVIEW");

  const evalRow = await evaluateStagingProductFromDb(input.productId);
  if (!evalRow) throw new Error("EVALUATION_FAILED");

  const comparison = classifyShadowComparison({
    systemDecision: evalRow.policyDecision as import("../policy-v2/types").PolicyDecisionClass,
    humanStatus:
      input.humanDecision === "APPROVE"
        ? "APPROVED"
        : input.humanDecision === "REJECT"
          ? "REJECTED"
          : input.humanDecision === "NEEDS_CHANGES"
            ? "NEEDS_FIX"
            : "PENDING_REVIEW",
    providerFailures: evalRow.providerFailures,
    notEvaluatedDimensions: evalRow.notEvaluatedDimensions,
  });

  const review = await prisma.policyShadowHumanReview.create({
    data: {
      id: randomUUID(),
      batchId: input.batchId,
      productId: input.productId,
      contentVersion: product.contentVersion,
      policyVersion: LOT_POLICY_V2,
      humanDecision: input.humanDecision,
      humanReason: input.humanReason ?? null,
      reviewerId: input.reviewerId,
      systemDecision: evalRow.policyDecision,
      systemRecommendation: mapPolicyV2ToModerationDecision(
        evalRow.policyDecision as import("../policy-v2/types").PolicyDecisionClass,
      ),
      comparisonClass: comparison,
      rulesTriggered: evalRow.rulesTriggered,
      evidenceSummary: {
        rulesTriggered: evalRow.rulesTriggered,
        conflicts: evalRow.conflicts,
        notEvaluated: evalRow.notEvaluatedDimensions,
        riskScore: evalRow.riskScore,
      },
      revealedAt: new Date(),
    },
  });

  return { review, evaluation: evalRow, comparison };
}

export async function listShadowReviewsForBatch(batchId: string) {
  return prisma.policyShadowHumanReview.findMany({
    where: { batchId },
    orderBy: { reviewedAt: "asc" },
  });
}

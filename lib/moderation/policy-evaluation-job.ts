import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { buildEvaluationCompleteness } from "./evaluation-completeness";
import { evaluateLotImages } from "./providers/evaluate-lot-images";
import type { ImageInput } from "./providers/types";
import { computeContentVersionHash } from "./content-version";
import { evaluateLotPolicyV2 } from "./policy-v2/evaluate";
import { mapPolicyV2ToModerationDecision } from "./policy-v2/safe-auto-approval";
import { getModerationAutomationMode } from "./config";

const JOB_TIMEOUT_MS = Number(process.env.MODERATION_EVAL_JOB_TIMEOUT_MS ?? "25000");

export async function enqueuePolicyEvaluationJob(input: {
  productId: string;
  contentVersionHash: string;
}): Promise<string> {
  const job = await prisma.moderationEvaluationJob.create({
    data: {
      productId: input.productId,
      contentVersionHash: input.contentVersionHash,
      status: "PENDING",
    },
  });
  return job.id;
}

export async function processPolicyEvaluationJob(productId: string): Promise<void> {
  log.info("policy_evaluation_started", { productId });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      characteristicValues: {
        include: { definition: { select: { id: true, name: true } } },
      },
    },
  });
  if (!product) return;

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

  const job = await prisma.moderationEvaluationJob.findFirst({
    where: { productId, contentVersionHash },
    orderBy: { createdAt: "desc" },
  });

  if (job) {
    await prisma.moderationEvaluationJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
    });
  }

  try {
    const category = product.categoryId
      ? await prisma.category.findUnique({ where: { id: product.categoryId }, select: { slug: true } })
      : null;
    const productType = product.productTypeId
      ? await prisma.productType.findUnique({ where: { id: product.productTypeId }, select: { slug: true } })
      : null;

    const imageInputs: ImageInput[] = product.images.map((img) => ({
      imageId: img.id,
      url: img.url,
      pathname: img.pathname,
      alt: img.alt,
      sortOrder: img.sortOrder,
    }));

    const imageEvaluation =
      imageInputs.length > 0
        ? await Promise.race([
            evaluateLotImages({ images: imageInputs }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("JOB_TIMEOUT")), JOB_TIMEOUT_MS),
            ),
          ])
        : null;

    const policyV2 = evaluateLotPolicyV2({
      title: product.name,
      description: product.description,
      categorySlug: category?.slug ?? null,
      productTypeSlug: productType?.slug ?? null,
      characteristics: product.characteristicValues.map((row) => ({
        name: row.definition.name,
        value:
          row.valueText ??
          (row.valueNumber != null ? Number(row.valueNumber) : null) ??
          (row.valueBoolean != null ? (row.valueBoolean ? "true" : "false") : null),
      })),
      price: Number(product.price),
      imageUrls: product.images.map((img) => img.url),
      imageAltTexts: product.images.map((img) => img.alt ?? ""),
      imageIds: product.images.map((img) => img.id),
      imageEvaluation,
    });

    const completeness = policyV2.evaluationCompleteness ?? buildEvaluationCompleteness({
      hasImages: imageInputs.length > 0,
      imageEvaluation,
      policyResult: policyV2,
    });

    const mode = getModerationAutomationMode();
    const systemRecommendation =
      mode === "SHADOW" || mode === "OFF"
        ? mapPolicyV2ToModerationDecision(policyV2.decisionClass)
        : mapPolicyV2ToModerationDecision(policyV2.decisionClass);

    await prisma.productModeration.updateMany({
      where: { productId, contentVersionHash },
      data: {
        policyVersion: policyV2.policyVersion,
        policyV2Snapshot: policyV2 as object,
        evaluationCompleteness: completeness as object,
        imageEvaluationSummary: imageEvaluation as object,
        systemRecommendation,
        rulesTriggered: policyV2.rulesTriggered,
        riskScore: Math.round((1 - policyV2.confidence) * 100),
      },
    });

    if (job) {
      await prisma.moderationEvaluationJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date(), lastError: null },
      });
    }

    if (policyV2.conflicts.length > 0) {
      log.info("policy_conflict_detected", {
        productId,
        conflictCount: policyV2.conflicts.length,
        conflictSummary: policyV2.conflicts.join(" | ").slice(0, 240),
      });
    }

    log.info("policy_evaluation_completed", {
      productId,
      decision: policyV2.decisionClass,
      completeness: completeness.allRequiredEvaluated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    log.error("policy_evaluation_failed", { productId, errorMessage: message.slice(0, 240) });
    if (job) {
      await prisma.moderationEvaluationJob.update({
        where: { id: job.id },
        data: {
          status: message === "JOB_TIMEOUT" ? "TIMEOUT" : "FAILED",
          lastError: message.slice(0, 500),
          completedAt: new Date(),
        },
      });
    }
  }
}

export async function runPolicyEvaluationWithTimeout(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return;

  const hash = await computeContentVersionHashForProduct(productId);
  await enqueuePolicyEvaluationJob({ productId, contentVersionHash: hash });
  await processPolicyEvaluationJob(productId);
}

async function computeContentVersionHashForProduct(productId: string): Promise<string> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      characteristicValues: true,
    },
  });
  if (!product) return "";
  return computeContentVersionHash({
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    productTypeId: product.productTypeId,
    condition: product.condition,
    imageUrls: product.images.map((i) => i.url),
    characteristics: product.characteristicValues.map((row) => ({
      definitionId: row.definitionId,
      value: row.valueText ?? Number(row.valueNumber ?? 0),
    })),
  });
}

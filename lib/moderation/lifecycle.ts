import { ModerationStatus, ProductStatus, Prisma } from "@prisma/client";

import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { appendModerationAuditEvent } from "./audit";
import { moderationContentStale } from "./content-version";
import { jsonStringArray } from "./json-coerce";
import { mapDecisionToModerationStatus } from "./decision-engine";
import { notifyModerationDecision } from "./notifications";
import { upsertModerationQueueItem } from "./queue";
import { runLotModerationEngine } from "./run-product-moderation";
import { enqueuePolicyEvaluationJob, processPolicyEvaluationJob } from "./policy-evaluation-job";
import type { ModerationDecision } from "./types";

function reviewModeForDecision(decision: ModerationDecision): string {
  return decision === "MANUAL_REVIEW" || decision === "ESCALATE" ? "MANUAL" : "AUTO";
}

function stageForDecision(decision: ModerationDecision): string {
  return decision === "MANUAL_REVIEW" || decision === "ESCALATE" ? "MANUAL_REVIEW" : "AUTO_REVIEW";
}

export async function submitLotForModeration(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true, name: true, contentVersion: true },
  });
  if (!product) return;

  const result = await runLotModerationEngine(productId);
  const status = mapDecisionToModerationStatus(result.decision);
  const now = new Date();

  const moderation = await prisma.productModeration.upsert({
    where: { productId },
    create: {
      productId,
      status,
      qualityScore: 100 - result.riskScore,
      issues: result.reasons as unknown as Prisma.InputJsonValue,
      prohibitedHit: result.reasons.some((r) => r.code === "PROHIBITED_PRODUCT"),
      submittedAt: now,
      riskScore: result.riskScore,
      policyVersion: result.policyVersion,
      reviewMode: reviewModeForDecision(result.decision),
      stage: stageForDecision(result.decision),
      reasonCodes: result.reasons.map((r) => r.code) as unknown as Prisma.InputJsonValue,
      rulesTriggered: result.rulesTriggered as unknown as Prisma.InputJsonValue,
      systemRecommendation: result.decision,
      contentVersionAtSubmit: product.contentVersion,
      contentVersionHash: result.contentVersionHash,
      policyV2Snapshot: result.policyV2 ? (result.policyV2 as object) : undefined,
      evaluationCompleteness: result.policyV2?.evaluationCompleteness
        ? (result.policyV2.evaluationCompleteness as object)
        : undefined,
      imageEvaluationSummary: result.policyV2?.imageEvaluationSummary
        ? (result.policyV2.imageEvaluationSummary as object)
        : undefined,
    },
    update: {
      status,
      qualityScore: 100 - result.riskScore,
      issues: result.reasons as unknown as Prisma.InputJsonValue,
      prohibitedHit: result.reasons.some((r) => r.code === "PROHIBITED_PRODUCT"),
      submittedAt: now,
      reviewedAt: null,
      reviewedById: null,
      riskScore: result.riskScore,
      policyVersion: result.policyVersion,
      reviewMode: reviewModeForDecision(result.decision),
      stage: stageForDecision(result.decision),
      reasonCodes: result.reasons.map((r) => r.code) as unknown as Prisma.InputJsonValue,
      rulesTriggered: result.rulesTriggered as unknown as Prisma.InputJsonValue,
      systemRecommendation: result.decision,
      contentVersionAtSubmit: product.contentVersion,
      contentVersionHash: result.contentVersionHash,
      policyV2Snapshot: result.policyV2 ? (result.policyV2 as object) : undefined,
      evaluationCompleteness: result.policyV2?.evaluationCompleteness
        ? (result.policyV2.evaluationCompleteness as object)
        : undefined,
      imageEvaluationSummary: result.policyV2?.imageEvaluationSummary
        ? (result.policyV2.imageEvaluationSummary as object)
        : undefined,
      decisionVersion: { increment: 1 },
    },
  });

  if (result.policyV2) {
    try {
      await enqueuePolicyEvaluationJob({
        productId,
        contentVersionHash: result.contentVersionHash,
      });
      void processPolicyEvaluationJob(productId).catch(() => {});
    } catch (err) {
      log.error("policy_evaluation_enqueue_failed", {
        productId,
        errorMessage: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
    }
  }

  try {
    await upsertModerationQueueItem({
      productId,
      sellerId: product.sellerId,
      status,
      riskLevel: result.riskLevel.toLowerCase(),
      summary: `${product.name} · risk ${result.riskScore}`,
    });
  } catch (err) {
    log.error("moderation_queue_upsert_failed", {
      productId,
      phase: "submit",
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
  }

  try {
    await appendModerationAuditEvent({
      productId,
      moderationId: moderation.id,
      sellerId: product.sellerId,
      previousStatus: null,
      newStatus: status,
      decision: result.decision,
      reasonCodes: result.reasons.map((r) => r.code),
      rulesTriggered: result.rulesTriggered,
      riskScore: result.riskScore,
      policyVersion: result.policyVersion,
      reviewerType: "SYSTEM",
      metadata: { imageEvaluation: result.imageSignals.evaluation },
    });
  } catch (err) {
    log.error("moderation_audit_append_failed", {
      productId,
      phase: "submit",
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
  }
}

export async function applyAdminModerationDecision(input: {
  productId: string;
  adminUserId: string;
  decision: Extract<ModerationDecision, "APPROVE" | "NEEDS_CHANGES" | "REJECT" | "ESCALATE">;
  reasonCodes?: string[];
  comment?: string;
}): Promise<{ ok: true } | { ok: false; code: "ALREADY_REVIEWED" | "NOT_FOUND" }> {
  const moderation = await prisma.productModeration.findUnique({
    where: { productId: input.productId },
    include: { product: { select: { sellerId: true, contentVersion: true, status: true } } },
  });
  if (!moderation) return { ok: false, code: "NOT_FOUND" };

  if (
    moderation.status === ModerationStatus.APPROVED &&
    moderation.product.status === ProductStatus.ACTIVE
  ) {
    return { ok: false, code: "ALREADY_REVIEWED" };
  }

  const previousStatus = moderation.status;
  const now = new Date();
  const status =
    input.decision === "APPROVE"
      ? ModerationStatus.APPROVED
      : input.decision === "NEEDS_CHANGES"
        ? ModerationStatus.NEEDS_FIX
        : input.decision === "REJECT"
          ? ModerationStatus.REJECTED
          : ModerationStatus.PENDING_REVIEW;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.productModeration.updateMany({
      where: {
        productId: input.productId,
        decisionVersion: moderation.decisionVersion,
      },
      data: {
        status,
        reviewedById: input.adminUserId,
        reviewedAt: now,
        reviewStartedAt: moderation.reviewStartedAt ?? now,
        notes: input.comment ?? null,
        reasonCodes: (input.reasonCodes ?? moderation.reasonCodes) as Prisma.InputJsonValue,
        reviewMode: "MANUAL",
        stage: input.decision === "ESCALATE" ? "ESCALATED" : "MANUAL_REVIEW",
        needsChangesAt: status === ModerationStatus.NEEDS_FIX ? now : moderation.needsChangesAt,
        rejectedAt: status === ModerationStatus.REJECTED ? now : moderation.rejectedAt,
        moderatedContentVersion: moderation.product.contentVersion,
        moderatedContentVersionHash: moderation.contentVersionHash,
        decisionVersion: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return { ok: false as const, code: "ALREADY_REVIEWED" as const };
    }

    if (input.decision === "APPROVE") {
      if (
        moderationContentStale(moderation.contentVersionHash, moderation.contentVersionHash ?? "") &&
        moderation.contentVersionHash
      ) {
        // content changed since submit — still allow manual approve but record hash at decision time
      }
      await tx.product.update({
        where: { id: input.productId },
        data: {
          status: ProductStatus.ACTIVE,
          publishedAt: now,
        },
      });
    } else if (moderation.product.status === ProductStatus.ACTIVE) {
      await tx.product.update({
        where: { id: input.productId },
        data: { status: ProductStatus.DRAFT },
      });
    }

    return { ok: true as const };
  });

  if (!result.ok) return result;

  try {
    await upsertModerationQueueItem({
      productId: input.productId,
      sellerId: moderation.product.sellerId,
      status,
      riskLevel: moderation.riskScore && moderation.riskScore >= 70 ? "high" : "low",
      summary: `Admin ${input.decision}`,
    });
  } catch (err) {
    log.error("moderation_queue_upsert_failed", {
      productId: input.productId,
      decision: input.decision,
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
  }

  try {
    await appendModerationAuditEvent({
      productId: input.productId,
      moderationId: moderation.id,
      sellerId: moderation.product.sellerId,
      previousStatus,
      newStatus: status,
      decision: input.decision,
      reasonCodes:
        input.reasonCodes ?? jsonStringArray(moderation.reasonCodes),
      rulesTriggered: jsonStringArray(moderation.rulesTriggered),
      riskScore: moderation.riskScore,
      policyVersion: moderation.policyVersion,
      reviewerType: "ADMIN",
      reviewerId: input.adminUserId,
      metadata: { comment: input.comment ?? null },
    });
  } catch (err) {
    log.error("moderation_audit_append_failed", {
      productId: input.productId,
      decision: input.decision,
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
  }

  try {
    await notifyModerationDecision({
      productId: input.productId,
      sellerId: moderation.product.sellerId,
      decision: input.decision,
    });
  } catch (err) {
    log.error("moderation_notify_failed", {
      productId: input.productId,
      decision: input.decision,
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
  }

  return { ok: true };
}

export async function invalidateModerationOnContentChange(productId: string): Promise<void> {
  const moderation = await prisma.productModeration.findUnique({
    where: { productId },
    include: { product: { select: { sellerId: true, status: true, contentVersion: true, name: true } } },
  });
  if (!moderation) return;
  if (moderation.status !== ModerationStatus.APPROVED) return;

  const previousStatus = moderation.status;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.productModeration.update({
      where: { productId },
      data: {
        status: ModerationStatus.PENDING_REVIEW,
        systemRecommendation: "MANUAL_REVIEW",
        reviewMode: "MANUAL",
        stage: "MANUAL_REVIEW",
        submittedAt: now,
        reviewedAt: null,
      },
    });

    if (moderation.product.status === ProductStatus.ACTIVE) {
      await tx.product.update({
        where: { id: productId },
        data: { status: ProductStatus.DRAFT },
      });
    }
  });

  try {
    await upsertModerationQueueItem({
      productId,
      sellerId: moderation.product.sellerId,
      status: ModerationStatus.PENDING_REVIEW,
      riskLevel: moderation.riskScore && moderation.riskScore >= 70 ? "high" : "medium",
      summary: `${moderation.product.name} · content changed, re-review`,
    });
  } catch (err) {
    log.error("moderation_queue_upsert_failed", {
      productId,
      phase: "invalidate",
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
  }

  try {
    await appendModerationAuditEvent({
      productId,
      moderationId: moderation.id,
      sellerId: moderation.product.sellerId,
      previousStatus,
      newStatus: ModerationStatus.PENDING_REVIEW,
      decision: "MANUAL_REVIEW",
      reasonCodes: ["OTHER"],
      rulesTriggered: ["CONTENT_VERSION_INVALIDATED"],
      riskScore: moderation.riskScore,
      policyVersion: moderation.policyVersion,
      reviewerType: "SYSTEM",
      metadata: {
        contentVersion: moderation.product.contentVersion,
        moderatedContentVersion: moderation.moderatedContentVersion,
      },
    });
  } catch (err) {
    log.error("moderation_audit_append_failed", {
      productId,
      phase: "invalidate",
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
    });
  }
}

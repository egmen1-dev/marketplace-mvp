import { ModerationItemType, ModerationStatus, ReviewStatus } from "@prisma/client";

import { applyAdminModerationDecision } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

import { recalculateRatingsForReview } from "../ratings/aggregation";
import {
  trackModerationApproved,
  trackModerationRejected,
  trackReviewPublished,
} from "../analytics";

export async function approveProductModeration(input: {
  productId: string;
  adminUserId: string;
}): Promise<void> {
  const result = await applyAdminModerationDecision({
    productId: input.productId,
    adminUserId: input.adminUserId,
    decision: "APPROVE",
  });
  if (!result.ok) {
    throw new Error(result.code === "ALREADY_REVIEWED" ? "ЛОТ уже проверен другим модератором" : "ЛОТ не найден");
  }
  trackModerationApproved(input.productId);
}

export async function rejectProductModeration(input: {
  productId: string;
  adminUserId: string;
  notes?: string;
}): Promise<void> {
  const result = await applyAdminModerationDecision({
    productId: input.productId,
    adminUserId: input.adminUserId,
    decision: "REJECT",
    comment: input.notes,
  });
  if (!result.ok) {
    throw new Error(result.code === "ALREADY_REVIEWED" ? "ЛОТ уже проверен другим модератором" : "ЛОТ не найден");
  }
  trackModerationRejected(input.productId);
}

export async function requestProductModerationChanges(input: {
  productId: string;
  adminUserId: string;
  reasonCodes?: string[];
  notes?: string;
}): Promise<void> {
  const result = await applyAdminModerationDecision({
    productId: input.productId,
    adminUserId: input.adminUserId,
    decision: "NEEDS_CHANGES",
    reasonCodes: input.reasonCodes,
    comment: input.notes,
  });
  if (!result.ok) {
    throw new Error(result.code === "ALREADY_REVIEWED" ? "ЛОТ уже проверен другим модератором" : "ЛОТ не найден");
  }
}

export async function escalateProductModeration(input: {
  productId: string;
  adminUserId: string;
  notes?: string;
}): Promise<void> {
  const result = await applyAdminModerationDecision({
    productId: input.productId,
    adminUserId: input.adminUserId,
    decision: "ESCALATE",
    comment: input.notes,
  });
  if (!result.ok) {
    throw new Error(result.code === "ALREADY_REVIEWED" ? "ЛОТ уже проверен другим модератором" : "ЛОТ не найден");
  }
}

export async function approveReview(reviewId: string): Promise<void> {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.APPROVED },
    include: { photos: { take: 1, select: { id: true } } },
  });

  await prisma.moderationQueueItem.updateMany({
    where: {
      type: ModerationItemType.REVIEW,
      entityId: reviewId,
    },
    data: { status: ModerationStatus.APPROVED },
  });

  await recalculateRatingsForReview({
    productId: review.productId,
    sellerId: review.sellerId,
    rating: review.rating,
    hasPhoto: review.photos.length > 0,
  });
  trackReviewPublished(reviewId);
}

export async function rejectReview(reviewId: string): Promise<void> {
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.REJECTED },
  });

  await prisma.moderationQueueItem.updateMany({
    where: { type: ModerationItemType.REVIEW, entityId: reviewId },
    data: { status: ModerationStatus.REJECTED },
  });

  trackModerationRejected(reviewId);
}

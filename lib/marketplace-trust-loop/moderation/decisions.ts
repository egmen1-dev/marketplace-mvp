import { ModerationItemType, ModerationStatus, ReviewStatus } from "@prisma/client";

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
  await prisma.productModeration.update({
    where: { productId: input.productId },
    data: {
      status: ModerationStatus.APPROVED,
      reviewedById: input.adminUserId,
      reviewedAt: new Date(),
    },
  });

  await prisma.moderationQueueItem.updateMany({
    where: {
      type: ModerationItemType.PRODUCT,
      entityId: input.productId,
      status: ModerationStatus.PENDING_REVIEW,
    },
    data: { status: ModerationStatus.APPROVED },
  });

  trackModerationApproved(input.productId);
}

export async function rejectProductModeration(input: {
  productId: string;
  adminUserId: string;
  notes?: string;
}): Promise<void> {
  await prisma.productModeration.update({
    where: { productId: input.productId },
    data: {
      status: ModerationStatus.REJECTED,
      reviewedById: input.adminUserId,
      reviewedAt: new Date(),
      notes: input.notes,
    },
  });

  await prisma.moderationQueueItem.updateMany({
    where: {
      type: ModerationItemType.PRODUCT,
      entityId: input.productId,
    },
    data: { status: ModerationStatus.REJECTED },
  });

  trackModerationRejected(input.productId);
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

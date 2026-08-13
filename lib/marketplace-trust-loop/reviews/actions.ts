"use server";

import { ModerationItemType, ModerationStatus, ReviewStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminSession, requireUserSession } from "@/features/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

import { trackReviewCreated, trackReviewStarted } from "../analytics";
import { isMarketplaceTrustLoopEnabled } from "../flags";
import {
  approveProductModeration,
  approveReview,
  rejectProductModeration,
  rejectReview,
} from "../moderation/decisions";
import {
  assertProductModerationApproved,
  submitProductForModeration,
} from "../moderation/rules";
import { canCreateReview, validateReviewRating } from "./lifecycle";

export type TrustLoopActionState = { ok: boolean; error?: string; reviewId?: string };

export async function createReviewAction(input: {
  orderId: string;
  productId: string;
  rating: number;
  text?: string;
  pros?: string;
  cons?: string;
}): Promise<TrustLoopActionState> {
  if (!isMarketplaceTrustLoopEnabled()) {
    return { ok: false, error: "MARKETPLACE_TRUST_LOOP_ENABLED=false" };
  }

  const user = await requireUserSession();
  if (!validateReviewRating(input.rating)) {
    return { ok: false, error: "Rating must be 1-5" };
  }

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: user.id },
    select: {
      id: true,
      userId: true,
      status: true,
      reviewEligibleAt: true,
      items: {
        where: { productId: input.productId },
        select: { product: { select: { sellerId: true } } },
      },
    },
  });

  if (!order || order.items.length === 0) {
    return { ok: false, error: "Order or product not found" };
  }

  const existing = await prisma.review.findUnique({
    where: {
      orderId_productId_buyerId: {
        orderId: input.orderId,
        productId: input.productId,
        buyerId: user.id,
      },
    },
  });

  const eligibility = canCreateReview({
    order,
    buyerId: user.id,
    existingReview: Boolean(existing),
  });
  if (!eligibility.ok) {
    return { ok: false, error: eligibility.reason };
  }

  trackReviewStarted(input.orderId);

  const sellerId = order.items[0]!.product.sellerId;
  const review = await prisma.review.create({
    data: {
      orderId: input.orderId,
      productId: input.productId,
      sellerId,
      buyerId: user.id,
      rating: input.rating,
      text: input.text?.trim() || null,
      pros: input.pros?.trim() || null,
      cons: input.cons?.trim() || null,
      status: ReviewStatus.PENDING,
    },
  });

  await prisma.moderationQueueItem.create({
    data: {
      type: ModerationItemType.REVIEW,
      entityId: review.id,
      sellerId,
      status: ModerationStatus.PENDING_REVIEW,
      summary: `Отзыв ${input.rating}★`,
    },
  });

  trackReviewCreated(review.id);
  revalidatePath(`${ROUTES.ORDERS}/${input.orderId}`);
  revalidatePath(`${ROUTES.PRODUCT}/${input.productId}`);

  return { ok: true, reviewId: review.id };
}

export async function submitProductModerationAction(
  productId: string,
): Promise<TrustLoopActionState> {
  if (!isMarketplaceTrustLoopEnabled()) {
    return { ok: false, error: "MARKETPLACE_TRUST_LOOP_ENABLED=false" };
  }
  await submitProductForModeration(productId);
  revalidatePath(ROUTES.ACCOUNT_PRODUCTS);
  return { ok: true };
}

export async function adminApproveProductAction(
  productId: string,
): Promise<TrustLoopActionState> {
  const admin = await requireAdminSession();
  await approveProductModeration({ productId, adminUserId: admin.id });
  revalidatePath(ROUTES.ADMIN_MODERATION);
  return { ok: true };
}

export async function adminRejectProductAction(
  productId: string,
): Promise<TrustLoopActionState> {
  const admin = await requireAdminSession();
  await rejectProductModeration({ productId, adminUserId: admin.id });
  revalidatePath(ROUTES.ADMIN_MODERATION);
  return { ok: true };
}

export async function adminApproveReviewAction(
  reviewId: string,
): Promise<TrustLoopActionState> {
  await requireAdminSession();
  await approveReview(reviewId);
  revalidatePath(ROUTES.ADMIN_MODERATION);
  revalidatePath(ROUTES.ADMIN_TRUST);
  return { ok: true };
}

export async function adminRejectReviewAction(
  reviewId: string,
): Promise<TrustLoopActionState> {
  await requireAdminSession();
  await rejectReview(reviewId);
  revalidatePath(ROUTES.ADMIN_MODERATION);
  return { ok: true };
}

export async function gateProductPublish(productId: string): Promise<void> {
  if (!isMarketplaceTrustLoopEnabled()) return;
  await assertProductModerationApproved(productId);
}

export { submitProductForModeration, assertProductModerationApproved };

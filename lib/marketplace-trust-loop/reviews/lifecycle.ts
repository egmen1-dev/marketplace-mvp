import { ReviewStatus } from "@prisma/client";

import { isOrderReviewEligible } from "@/features/order-lifecycle/lib/integrations";

export function canCreateReview(input: {
  order: { status: import("@prisma/client").OrderStatus; reviewEligibleAt: Date | null; userId: string };
  buyerId: string;
  existingReview: boolean;
}): { ok: boolean; reason?: string } {
  if (input.order.userId !== input.buyerId) {
    return { ok: false, reason: "Not order owner" };
  }
  if (input.existingReview) {
    return { ok: false, reason: "Review already exists" };
  }
  if (!isOrderReviewEligible(input.order)) {
    return { ok: false, reason: "Order not completed" };
  }
  return { ok: true };
}

export function validateReviewRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export const REVIEW_PUBLISHED_STATUS = ReviewStatus.APPROVED;

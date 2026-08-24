export type LotPublishOutcome = "PUBLISHED" | "PENDING_REVIEW" | "SAVED" | "FAILED";

export type SellerProductPublishSnapshot = {
  id: string;
  status: string;
  moderationState?: string | null;
  isPublic?: boolean;
};

export function isSellerProductPublic(status: string, isPublic?: boolean): boolean {
  if (typeof isPublic === "boolean") return isPublic;
  return status === "ACTIVE";
}

export function resolveLotPublishOutcome(product: SellerProductPublishSnapshot): LotPublishOutcome {
  if (product.status === "ACTIVE") return "PUBLISHED";
  const moderation = product.moderationState ?? null;
  if (moderation === "PENDING_REVIEW" || moderation === "NEEDS_FIX") return "PENDING_REVIEW";
  if (product.status === "DRAFT") return "SAVED";
  return "FAILED";
}

export function sellerLotDetailRoute(productId: string, outcome: LotPublishOutcome): string {
  if (outcome === "PUBLISHED") return `/product/${productId}`;
  return `/sell/lot/${productId}`;
}

export function sellerLotsTabForOutcome(outcome: LotPublishOutcome): "active" | "pending" | "drafts" | "sold" {
  if (outcome === "PUBLISHED") return "active";
  if (outcome === "PENDING_REVIEW") return "pending";
  if (outcome === "SAVED") return "drafts";
  return "drafts";
}

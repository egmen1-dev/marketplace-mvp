import { ModerationStatus, ProductStatus } from "@prisma/client";

export type LotPublishOutcome = "PUBLISHED" | "PENDING_REVIEW" | "SAVED" | "FAILED";

export type SellerProductPublishSnapshot = {
  id: string;
  status: ProductStatus;
  moderationState?: ModerationStatus | null;
};

export function isSellerProductPublic(status: ProductStatus): boolean {
  return status === ProductStatus.ACTIVE;
}

export function resolveLotPublishOutcome(
  product: SellerProductPublishSnapshot,
): LotPublishOutcome {
  if (product.status === ProductStatus.ACTIVE) {
    return "PUBLISHED";
  }

  const moderation = product.moderationState ?? null;
  if (
    moderation === ModerationStatus.PENDING_REVIEW ||
    moderation === ModerationStatus.NEEDS_FIX
  ) {
    return "PENDING_REVIEW";
  }

  if (product.status === ProductStatus.DRAFT) {
    return "SAVED";
  }

  return "FAILED";
}

export function buildSellerProductPublishContract(product: {
  id: string;
  status: ProductStatus;
  moderationState?: ModerationStatus | null;
}) {
  const publishOutcome = resolveLotPublishOutcome(product);
  return {
    id: product.id,
    status: product.status,
    isPublic: isSellerProductPublic(product.status),
    moderationState: product.moderationState ?? null,
    publicProductId: product.id,
    publishOutcome,
  };
}

import type { PromotionCenterSections } from "@/lib/seller-promotion-center/types";

export type MobileSellerPromotionPayload = PromotionCenterSections & {
  telemetry: readonly [
    "promotion_opened",
    "promotion_created",
    "promotion_updated",
    "promotion_deleted",
    "promotion_published",
    "promotion_finished",
  ];
};

export function buildMobileSellerPromotionPayload(
  input: PromotionCenterSections,
): MobileSellerPromotionPayload {
  return {
    ...input,
    telemetry: [
      "promotion_opened",
      "promotion_created",
      "promotion_updated",
      "promotion_deleted",
      "promotion_published",
      "promotion_finished",
    ],
  };
}

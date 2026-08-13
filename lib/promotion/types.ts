import type { PromotionCampaignStatus } from "@prisma/client";

import type { AdEligibilityReason } from "@/lib/product-advertising";

export type PromotionReadiness = {
  ready: boolean;
  reasons: AdEligibilityReason[];
  /** Seller-facing checklist (Russian). */
  blockers: string[];
  qualityScore: number;
};

export type PromotionCampaignDto = {
  id: string;
  productId: string;
  sellerId: string;
  status: PromotionCampaignStatus;
  budget: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export type SellerPromotionRow = {
  productId: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  imageUrl: string | null;
  readiness: PromotionReadiness;
  campaign: PromotionCampaignDto | null;
  isPromoted: boolean;
};

export type AdminPromotionRow = {
  campaignId: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  status: PromotionCampaignStatus;
  startedAt: string | null;
  qualityScore: number;
};

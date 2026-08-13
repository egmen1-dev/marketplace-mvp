import type {
  PromotionCampaignStatus,
  PromotionSurfaceType,
} from "@prisma/client";

import type { AdEligibilityReason } from "@/lib/product-advertising";

export type PromotionReadiness = {
  ready: boolean;
  reasons: AdEligibilityReason[];
  /** Seller-facing checklist (Russian). */
  blockers: string[];
  qualityScore: number;
};

export type PromotionPlacementDto = {
  id: string;
  campaignId: string;
  productId: string;
  surface: PromotionSurfaceType;
  position: number;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  placements: PromotionPlacementDto[];
  activePlacementCount: number;
};

export type AdminPromotionFilter = PromotionCampaignStatus | "ALL";

export type AdminPromotionRow = {
  campaignId: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  status: PromotionCampaignStatus;
  startedAt: string | null;
  qualityScore: number;
  placementCount: number;
  surfaces: PromotionSurfaceType[];
  topPriority: number | null;
};

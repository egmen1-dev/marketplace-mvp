import type { PromotionPlanId } from "./plans";

export type PromotionSectionId =
  | "discounts"
  | "coupons"
  | "bundles"
  | "campaigns"
  | "featured"
  | "history"
  | "performance"
  | "eligibility";

export type PromotionSectionMeta = {
  id: PromotionSectionId;
  title: string;
  supported: boolean;
  hiddenReason?: string;
};

export type PromotionListItem = {
  id: string;
  kind: "campaign" | "discount" | "featured";
  title: string;
  subtitle: string | null;
  status: string;
  productId: string;
  productName: string;
  amount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

export type PromotionDetail = PromotionListItem & {
  planId: string | null;
  planName: string | null;
  surfaces: string[];
  evidence: Array<{ label: string; value: string }>;
  editable: boolean;
  publishable: boolean;
  statisticsAvailable: boolean;
};

export type PromotionDiscountRow = {
  productId: string;
  productName: string;
  price: number;
  compareAt: number | null;
  discountPercent: number | null;
  updatedAt: string;
};

export type PromotionHistoryRow = {
  id: string;
  kind: "order" | "wallet";
  title: string;
  productId: string | null;
  productName: string | null;
  amount: number;
  status: string;
  createdAt: string;
  endedAt: string | null;
};

export type PromotionPerformanceRow = {
  campaignId: string;
  productId: string;
  productName: string;
  impressions: number;
  clicks: number;
  orders: number;
  revenue: number;
  spend: number;
  periodDays: number;
};

export type PromotionEligibilityResult = {
  productId: string;
  productName: string;
  eligible: boolean;
  reasons: string[];
  missing: string[];
  completenessScore: number;
};

export type PromotionFeaturedRow = {
  campaignId: string;
  productId: string;
  productName: string;
  surface: string;
  priority: number;
  active: boolean;
  endsAt: string | null;
};

export type PromotionCenterSections = {
  generatedAt: string;
  enabled: boolean;
  sections: PromotionSectionMeta[];
  campaigns: PromotionListItem[];
  discounts: PromotionDiscountRow[];
  featured: PromotionFeaturedRow[];
  history: PromotionHistoryRow[];
  performance: PromotionPerformanceRow[];
  eligibility: PromotionEligibilityResult[];
  plans: Array<{
    id: PromotionPlanId;
    name: string;
    price: number;
    days: number;
    description: string;
    dbPlanId: string | null;
  }>;
  summary: {
    activeCampaigns: number;
    spent30d: number;
    orders30d: number;
    revenue30d: number;
    discountCount: number;
  };
  cacheVersion: string;
  retryAfterMs: number;
  advisoryOnly: true;
};

export type PublishPromotionInput = {
  userId: string;
  sellerProfileId: string;
  productId: string;
  planId: PromotionPlanId;
  paymentMethod: "wallet" | "card";
};

export type UpdatePromotionDiscountInput = {
  sellerProfileId: string;
  productId: string;
  compareAt: number | null;
};

export type UpdatePromotionCampaignInput = {
  sellerProfileId: string;
  campaignId: string;
  status: "STARTED" | "PAUSED" | "ENDED";
};

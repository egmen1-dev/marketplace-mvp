import type { PromotionPerformanceSummary } from "@/lib/promotion/analytics/types";
import type { PromotionPlanDto } from "@/lib/promotion/billing/types";
import type { PromotionRecommendation } from "@/lib/promotion/intelligence/types";
import type { SellerPromotionRow } from "@/lib/promotion/types";

export type PromotionCenterSummary = {
  periodLabel: string;
  activeCampaigns: number;
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  revenue: number;
  roiPercent: number | null;
  roiLabel: string;
};

export type PromotionProductOpportunity = {
  productId: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  qualityScore: number;
  promotionScore: number;
  reasons: string[];
  ready: boolean;
  isPromoted: boolean;
  recommendedBudget: number | null;
  recommendedPlanLabel: string | null;
  recommendedPlan: "BOOST" | "GROWTH" | "STARTER" | null;
  href: string;
};

export type PromotionCampaignCard = {
  campaignId: string;
  productId: string;
  productTitle: string;
  imageUrl: string | null;
  status: "ACTIVE" | "PAUSED" | "ENDED" | "INACTIVE";
  statusLabel: string;
  periodLabel: string | null;
  budget: number | null;
  performance: PromotionPerformanceSummary | null;
  planName: string | null;
};

export type SmartBudgetRecommendation = {
  productId: string;
  productTitle: string;
  views: number;
  orders: number;
  recommendedAmount: number;
  durationDays: number;
  why: string;
  disclaimer: string;
};

export type PromotionFunnelStep = {
  label: string;
  value: number;
};

export type PromotionAnalyticsDetail = {
  funnel: PromotionFunnelStep[];
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversionRate: number;
    orders: number;
    revenue: number;
  };
};

export type PromotionAiAdvice = {
  id: string;
  headline: string;
  reason: string;
  action: string;
  tone: "warning" | "success" | "neutral";
};

export type CampaignComparisonRow = {
  productId: string;
  productTitle: string;
  ctr: number;
  roiPercent: number | null;
  roiLabel: string;
};

export type SellerPromotionCenterDashboard = {
  enabled: boolean;
  title: string;
  summary: PromotionCenterSummary;
  opportunities: PromotionProductOpportunity[];
  campaigns: PromotionCampaignCard[];
  budgetRecommendation: SmartBudgetRecommendation | null;
  analytics: PromotionAnalyticsDetail;
  aiAdvice: PromotionAiAdvice[];
  comparison: CampaignComparisonRow[];
  plans: PromotionPlanDto[];
  rows: SellerPromotionRow[];
  billingEnabled: boolean;
  intelligenceEnabled: boolean;
};

export type AdminSellerPromotionRow = {
  sellerId: string;
  sellerName: string;
  spend: number;
  gmv: number;
  roiPercent: number | null;
  campaignCount: number;
};

export type AdminPromotionControlExtension = {
  enabled: boolean;
  adSpendTotal: number;
  platformRevenue: number;
  activeSellers: number;
  topCategories: string[];
  sellerRows: AdminSellerPromotionRow[];
};

export type PromotionCenterNotification = {
  id: string;
  type:
    | "PROMOTION_STARTED"
    | "PROMOTION_RESULT"
    | "PROMOTION_LOW_PERFORMANCE"
    | "PROMOTION_OPPORTUNITY";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

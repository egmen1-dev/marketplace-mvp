import type { PromotionPlanDto } from "@/lib/promotion/billing/types";

export type RecommendedPlanCode = "BOOST" | "GROWTH" | "STARTER";

export type PromotionOpportunityBreakdown = {
  quality: number;
  conversion: number;
  stock: number;
  priceCompetitiveness: number;
  sellerTrust: number;
  historicalSales: number;
};

export type PromotionRecommendation = {
  productId: string;
  productTitle: string;
  score: number;
  recommendation: string;
  reasons: string[];
  /** What to fix before promoting — seller education. */
  improvements: string[];
  /** Why now is a good moment — empty when not recommended. */
  timingReasons: string[];
  recommendedPlan: RecommendedPlanCode | null;
  recommendedPlanLabel: string | null;
  recommendedBudget: number | null;
  /** Raw signals for UI table. */
  productViews: number;
  addToCart: number;
  orderCount: number;
  qualityScore: number;
  ready: boolean;
  isPromoted: boolean;
  breakdown: PromotionOpportunityBreakdown;
};

export type AdminPromotionIntelligenceSummary = {
  highPotentialCount: number;
  readyWithoutCampaignCount: number;
  estimatedMissedRevenue: number;
  topOpportunities: Array<{
    productId: string;
    productTitle: string;
    sellerName: string;
    score: number;
    recommendedPlan: RecommendedPlanCode | null;
  }>;
  headline: string;
};

export type SellerRecommendationsPayload = {
  recommendations: PromotionRecommendation[];
  plans: PromotionPlanDto[];
};

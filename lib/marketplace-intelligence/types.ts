export type MarketplaceSignalType =
  | "BUYER_DEMAND"
  | "SELLER_GROWTH"
  | "PRODUCT_GAP"
  | "PROMOTION_OPPORTUNITY"
  | "REVENUE_OPPORTUNITY"
  | "CATEGORY_TREND";

export type SignalSeverity = "HIGH" | "MEDIUM" | "LOW";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

export type MarketplaceSignal = {
  type: MarketplaceSignalType;
  category: string | null;
  severity: SignalSeverity;
  message: string;
  metric?: number;
  source: string;
};

export type MarketplaceOpportunity = {
  id: string;
  title: string;
  impact: ImpactLevel;
  reason: string;
  recommendedAction: string;
  signalTypes: MarketplaceSignalType[];
};

export type MarketplaceHealth = {
  gmv: number;
  sellers: number;
  buyers: number;
  conversionRate: number | null;
  activeProducts: number;
  orders: number;
};

export type MarketplaceProblem = {
  id: string;
  title: string;
  severity: SignalSeverity;
  detail: string;
};

export type MarketplaceRecommendation = {
  id: string;
  title: string;
  reason: string;
  action: string;
  impact: ImpactLevel;
  href?: string;
};

export type RevenueOpportunity = {
  title: string;
  forecast: string;
  affectedProducts: number;
  potentialLiftPct: number;
};

export type BuyerDemandInsight = {
  headline: string;
  queries: string[];
};

export type SellerMarketplaceInsight = {
  headline: string;
  reasons: string[];
  recommendedAction: string;
  href?: string;
};

export type MarketplaceIntelligenceDashboard = {
  enabled: boolean;
  health: MarketplaceHealth;
  signals: MarketplaceSignal[];
  opportunities: MarketplaceOpportunity[];
  problems: MarketplaceProblem[];
  recommendations: MarketplaceRecommendation[];
  revenueOpportunities: RevenueOpportunity[];
  buyerDemand: BuyerDemandInsight | null;
};

export type SellerMarketplaceConnection = {
  insights: SellerMarketplaceInsight[];
  demandHeadline: string | null;
};

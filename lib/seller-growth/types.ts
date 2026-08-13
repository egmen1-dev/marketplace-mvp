export type SellerGrowthLevel = "STRONG" | "GROWING" | "NEEDS_ATTENTION";

export type SellerGrowthScore = {
  sellerId: string;
  score: number;
  level: SellerGrowthLevel;
  levelLabel: string;
  strengths: string[];
  weaknesses: string[];
  breakdown: SellerGrowthBreakdown;
};

export type SellerGrowthBreakdown = {
  productQuality: number;
  catalogCompleteness: number;
  conversionRate: number;
  promotionUsage: number;
  salesVelocity: number;
  customerTrust: number;
  inventoryHealth: number;
};

export type SellerInsightCategory =
  | "CARD"
  | "PRICE"
  | "INVENTORY"
  | "TRUST"
  | "PROMOTION"
  | "ASSORTMENT";

export type SellerInsightSeverity = "HIGH" | "MEDIUM" | "LOW";

export type SellerInsight = {
  type: SellerInsightCategory;
  severity: SellerInsightSeverity;
  title: string;
  reason: string;
  action: string;
  productId?: string;
  productTitle?: string;
};

export type SellerActionType =
  | "IMPROVE_PRODUCT"
  | "START_PROMOTION"
  | "ADD_STOCK"
  | "ADJUST_PRICE"
  | "CREATE_PRODUCT";

export type SellerActionPriority = "HIGH" | "MEDIUM" | "LOW";

export type SellerAction = {
  priority: SellerActionPriority;
  type: SellerActionType;
  action: string;
  impact: string;
  target?: string;
  productId?: string;
  href?: string;
};

export type SellerGrowthOpportunities = {
  readyForPromotionCount: number;
  needsImprovementCount: number;
  lowStockCount: number;
  singleProductSeller: boolean;
};

export type SellerGrowthDashboard = {
  score: SellerGrowthScore;
  insights: SellerInsight[];
  actions: SellerAction[];
  opportunities: SellerGrowthOpportunities;
  nextAction: SellerAction | null;
};

export type AdminSellerGrowthOverview = {
  topSellers: Array<{
    sellerId: string;
    storeName: string;
    score: number;
    level: SellerGrowthLevel;
  }>;
  atRiskSellers: Array<{
    sellerId: string;
    storeName: string;
    score: number;
    reason: string;
  }>;
  inactiveSellers: Array<{
    sellerId: string;
    storeName: string;
    productCount: number;
    reason: string;
  }>;
  headlines: string[];
  sellersWithUnpromotedReadyProducts: number;
  singleProductSellers: number;
  highPotentialProducts: number;
};

export type DiagnosisCategory =
  | "Demand"
  | "Supply"
  | "Conversion"
  | "Revenue"
  | "Seller activity"
  | "Buyer experience";

export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type MarketplaceDiagnosis = {
  id: string;
  issue: string;
  category: DiagnosisCategory;
  severity: Severity;
  causes: string[];
  impact: string;
  categoryName: string | null;
};

export type StrategyWeek = {
  week: number;
  label: string;
  tasks: string[];
};

export type GrowthStrategy = {
  id: string;
  goal: string;
  category: string | null;
  weeks: StrategyWeek[];
};

export type ActionPlanType =
  | "SELLER_OUTREACH"
  | "PRODUCT_IMPROVEMENT"
  | "PROMOTION_LAUNCH"
  | "CATEGORY_EXPANSION"
  | "CONVERSION_FIX"
  | "TRUST_BUILDING";

export type ActionPlanItem = {
  type: ActionPlanType;
  description: string;
};

export type MarketplaceActionPlan = {
  id: string;
  title: string;
  priority: Priority;
  actions: ActionPlanItem[];
  impactScore: number;
  expectedEffect: string;
  diagnosisId: string | null;
};

export type ImpactBreakdown = {
  revenueOpportunity: number;
  demandGrowth: number;
  currentWeakness: number;
  executionEase: number;
  confidence: number;
};

export type ImpactScore = {
  impactScore: number;
  expectedEffect: string;
  breakdown: ImpactBreakdown;
};

export type OperatorStatus = {
  headline: string;
  summary: string;
  healthScore: number;
  topTaskCount: number;
};

export type BuyerDemandAction = {
  headline: string;
  detail: string;
  query: string;
  userCount: number;
};

export type SellerOperatorInsight = {
  headline: string;
  reasons: string[];
  recommendedAction: string;
  href?: string;
};

export type SellerOperatorConnection = {
  insights: SellerOperatorInsight[];
};

export type MarketplaceOperatorDashboard = {
  enabled: boolean;
  status: OperatorStatus;
  diagnoses: MarketplaceDiagnosis[];
  strategies: GrowthStrategy[];
  actionPlans: MarketplaceActionPlan[];
  topProblems: MarketplaceDiagnosis[];
  recommendedActions: ActionPlanItem[];
};

export const IMPACT_WEIGHTS = {
  revenueOpportunity: 30,
  demandGrowth: 25,
  currentWeakness: 20,
  executionDifficulty: 15,
  confidence: 10,
} as const;

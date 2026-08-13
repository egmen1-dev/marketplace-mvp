export type LearningExperimentStatus =
  | "CREATED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "INCONCLUSIVE";

export type LearningEntityType = "PRODUCT" | "SELLER" | "CAMPAIGN";

export type LearningExperimentType =
  | "ADD_PRODUCT_PHOTOS"
  | "IMPROVE_DESCRIPTION"
  | "ADD_CHARACTERISTICS"
  | "START_PROMOTION"
  | "CHANGE_PRICE"
  | "ADD_STOCK"
  | "TRUST_IMPROVEMENT"
  | "GENERIC_RECOMMENDATION";

export type LearningActionType =
  | "PRODUCT_IMAGE_UPDATE"
  | "PRODUCT_DESCRIPTION_UPDATE"
  | "ADD_CHARACTERISTICS"
  | "START_PROMOTION"
  | "PRICE_CHANGE"
  | "ADD_STOCK";

export type LearningExperimentSource =
  | "GROWTH_SCORE"
  | "QUALITY_SCORE"
  | "PROMOTION_OPPORTUNITY"
  | "EXECUTION_PRIORITY"
  | "EDUCATION_COACH"
  | "COMMUNICATION"
  | "TRUST_COACH"
  | "AI_CENTER";

export type MetricSnapshot = {
  views: number;
  cart: number;
  orders: number;
  conversion: number;
};

export type LearningExperiment = {
  id: string;
  type: LearningExperimentType;
  entityType: LearningEntityType;
  entityId: string;
  sellerProfileId: string;
  source: LearningExperimentSource;
  recommendation: string;
  reason: string;
  startedAt: string;
  endedAt: string | null;
  status: LearningExperimentStatus;
  baseline: MetricSnapshot;
  actionType: LearningActionType | null;
  actionStartedAt: string | null;
  actionCompletedAt: string | null;
  recommendationAccepted: boolean;
};

export type OutcomeVerdict = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export type ExperimentOutcome = {
  experimentId: string;
  evaluatedAt: string;
  viewsBefore: number;
  viewsAfter: number;
  cartBefore: number;
  cartAfter: number;
  ordersBefore: number;
  ordersAfter: number;
  conversionBefore: number;
  conversionAfter: number;
  verdict: OutcomeVerdict;
  summary: string;
};

export type LearningPattern = {
  id: string;
  statement: string;
  confidence: number;
  sampleSize: number;
  category: string | null;
  sources: LearningExperimentSource[];
  createdAt: string;
};

export type RecommendationQualityScore = {
  score: number;
  label: string;
  factors: Array<{ key: string; label: string; value: string; weight: number }>;
};

export type KnowledgeBaseEntry = {
  id: string;
  kind: "PATTERN" | "SUCCESS" | "FAILURE" | "CATEGORY_INSIGHT";
  title: string;
  body: string;
  confidence?: number;
  sampleSize?: number;
  createdAt: string;
};

export type SellerLearningInsights = {
  enabled: boolean;
  whatWorks: Array<{
    id: string;
    statement: string;
    confidence: number;
    sampleSize: number;
  }>;
  activeExperiments: number;
  completedExperiments: number;
  qualityScore: RecommendationQualityScore | null;
};

export type AdminLearningCenterDashboard = {
  enabled: boolean;
  marketplaceExperiments: Array<{
    id: string;
    title: string;
    body: string;
    badge?: string;
  }>;
  successfulPatterns: LearningPattern[];
  failedRecommendations: Array<{
    id: string;
    title: string;
    body: string;
  }>;
  aiAccuracy: {
    score: number;
    label: string;
    accepted: number;
    improved: number;
    total: number;
    summary: string;
  };
  knowledgeBase: KnowledgeBaseEntry[];
};

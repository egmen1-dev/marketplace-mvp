export type AiNotificationType =
  | "AI_RECOMMENDATION"
  | "TASK_READY"
  | "PRODUCT_ISSUE"
  | "PROMOTION_OPPORTUNITY";

export type PrioritySource =
  | "GROWTH_SCORE"
  | "QUALITY_SCORE"
  | "PROMOTION_OPPORTUNITY"
  | "EXECUTION_PRIORITY"
  | "EDUCATION_COACH"
  | "COMMUNICATION";

export type PriorityRecommendation = {
  id: string;
  action: string;
  why: string;
  benefit: string;
  howTo: string;
  href?: string;
  source: PrioritySource;
  priorityScore: number;
};

export type AiExperienceCard = {
  id: string;
  title: string;
  body: string;
  badge?: string;
  href?: string;
  testId: string;
};

export type SellerGrowthLevelBlock = {
  score: number;
  level: string;
  levelLabel: string;
  strengths: string[];
  weaknesses: string[];
};

export type SellerAiCenterDashboard = {
  enabled: boolean;
  title: string;
  growthLevel: SellerGrowthLevelBlock | null;
  happeningSummary: string;
  priority: PriorityRecommendation | null;
  opportunities: AiExperienceCard[];
  insightCards: AiExperienceCard[];
};

export type AdminAiCommandCenterDashboard = {
  enabled: boolean;
  marketplaceHealth: AiExperienceCard[];
  topOpportunities: AiExperienceCard[];
  activeStrategies: AiExperienceCard[];
  executionProgress: AiExperienceCard[];
};

export type AiNotification = {
  id: string;
  type: AiNotificationType;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export type BuyerAiAssistantPrompt = {
  id: string;
  question: string;
  answerPreview: string;
};

export type BuyerAiAssistantExperience = {
  enabled: boolean;
  headline: string;
  prompts: BuyerAiAssistantPrompt[];
  matchSummary: string | null;
};

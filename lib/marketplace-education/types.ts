export type EducationTarget = "SELLER" | "BUYER" | "ADMIN";

export type EducationContext =
  | "ONBOARDING"
  | "PRODUCT_CREATE"
  | "PRODUCT_EDIT"
  | "QUALITY_SCORE"
  | "GROWTH"
  | "PROMOTION"
  | "FINANCE"
  | "PDP"
  | "EMPTY_STATE"
  | "ADMIN";

export type EducationGuideStep = {
  id: string;
  title: string;
  explanation: string;
  href?: string;
  ctaLabel?: string;
};

export type EducationGuide = {
  id: string;
  target: EducationTarget;
  title: string;
  description: string;
  steps: EducationGuideStep[];
  context: EducationContext;
  priority: number;
};

export type EducationTooltipContent = {
  id: string;
  label: string;
  title: string;
  body: string;
  context: EducationContext;
  target: EducationTarget;
};

export type EducationChecklistItem = {
  id: string;
  title: string;
  explanation: string;
  completed: boolean;
  href?: string;
};

export type EducationChecklist = {
  id: string;
  title: string;
  items: EducationChecklistItem[];
  completedCount: number;
  totalCount: number;
};

export type QualityFactorExplanation = {
  key: string;
  label: string;
  score: number;
  max: number;
  whyImportant: string;
  fixHint: string | null;
};

export type QualityScoreExplanation = {
  score: number;
  factors: QualityFactorExplanation[];
};

export type SellerCoachStep = {
  order: number;
  text: string;
  href?: string;
};

export type SellerCoachRecommendation = {
  headline: string;
  summary: string;
  steps: SellerCoachStep[];
  href?: string;
  ctaLabel?: string;
};

export type BuyerHelpPrompt = {
  id: string;
  question: string;
  answerPreview: string;
};

export type BuyerEducationTopic = {
  id: string;
  title: string;
  body: string;
};

export type MarketplaceEducationDashboard = {
  enabled: boolean;
  guides: EducationGuide[];
  tooltips: EducationTooltipContent[];
  checklists: EducationChecklist[];
};

export const EDUCATION_ENTITY_TYPE = "MARKETPLACE_EDUCATION_PROGRESS";

export type EducationAudience = "SELLER" | "BUYER" | "ADMIN";

/** @deprecated Use EducationAudience */
export type EducationTarget = EducationAudience;

export type EducationContentType =
  | "GUIDE"
  | "TOOLTIP"
  | "CHECKLIST"
  | "COACH_MESSAGE";

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

export type EducationContentStep = {
  id: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
};

/** Unified education content model for guides, tooltips, checklists, coach messages. */
export type EducationContent = {
  id: string;
  type: EducationContentType;
  audience: EducationAudience;
  context: EducationContext;
  title: string;
  description: string;
  steps: EducationContentStep[];
  priority: number;
  enabled: boolean;
};

export type EducationGuideStep = {
  id: string;
  title: string;
  explanation: string;
  href?: string;
  ctaLabel?: string;
};

export type EducationGuide = {
  id: string;
  target: EducationAudience;
  title: string;
  description: string;
  steps: EducationGuideStep[];
  context: EducationContext;
  priority: number;
  enabled?: boolean;
};

export type EducationTooltipContent = {
  id: string;
  label: string;
  title: string;
  body: string;
  context: EducationContext;
  target: EducationAudience;
  priority?: number;
  enabled?: boolean;
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
  goodPoints: string[];
  improvePoints: string[];
  nextAction: string | null;
  /** @deprecated Use improvePoints */
  fixHint: string | null;
};

export type QualityScoreExplanation = {
  score: number;
  factors: QualityFactorExplanation[];
};

export type SellerCoachMetrics = {
  views: number;
  addToCart: number;
  sales: number;
};

export type SellerCoachStep = {
  order: number;
  text: string;
  href?: string;
};

export type SellerCoachRecommendation = {
  headline: string;
  productName?: string;
  metrics?: SellerCoachMetrics;
  analysis: string;
  summary: string;
  steps: SellerCoachStep[];
  href?: string;
  ctaLabel?: string;
  sources?: string[];
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
  content: EducationContent[];
  guides: EducationGuide[];
  tooltips: EducationTooltipContent[];
  checklists: EducationChecklist[];
};

export const EDUCATION_ENTITY_TYPE = "MARKETPLACE_EDUCATION_CONTENT";

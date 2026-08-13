export { isMarketplaceEducationEnabled } from "./flags";
export {
  toggleEducationContentAction,
  updateEducationContentDescriptionAction,
  updateEducationContentPriorityAction,
} from "./actions";
export type { EducationActionResult } from "./actions";
export {
  buildSellerCoachMessage,
  explainQualityScore,
  getFinanceEducationCopy,
  onboardingProgressPercent,
} from "./coach";
export {
  buildSellerOnboardingChecklist,
  checklistToContent,
  emptyStateEducation,
  guideToContent,
  tooltipToContent,
} from "./checklists";
export type { SellerOnboardingSignals } from "./checklists";
export {
  buildEducationGuides,
  guideByContext,
  guidesForTarget,
} from "./guides";
export {
  assertBuyerEducationView,
  assertMarketplaceEducationAccess,
  assertSellerEducationView,
  MarketplaceEducationForbiddenError,
} from "./permissions";
export {
  applyContentOverrides,
  buildEducationContentRegistry,
  countActiveSellerProducts,
  getBuyerEducationTopics,
  getBuyerHelpPrompts,
  getMarketplaceEducationDashboard,
  getQualityScoreExplanation,
  getSellerCoachRecommendation,
  getSellerGrowthCoach,
  getSellerOnboardingChecklist,
  selectEducationContent,
} from "./queries";
export {
  buildEducationTooltips,
  productFormTips,
  tooltipById,
  tooltipsForContext,
} from "./tooltips";
export type {
  BuyerEducationTopic,
  BuyerHelpPrompt,
  EducationAudience,
  EducationChecklist,
  EducationChecklistItem,
  EducationContent,
  EducationContentStep,
  EducationContentType,
  EducationContext,
  EducationGuide,
  EducationGuideStep,
  EducationTarget,
  EducationTooltipContent,
  MarketplaceEducationDashboard,
  QualityFactorExplanation,
  QualityScoreExplanation,
  SellerCoachMetrics,
  SellerCoachRecommendation,
  SellerCoachStep,
} from "./types";
export { EDUCATION_ENTITY_TYPE } from "./types";

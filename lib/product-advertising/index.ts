export {
  AD_ELIGIBILITY_REASONS,
  adEligibilityFixChecklist,
  adEligibilityFixHint,
  adEligibilityReasonLabel,
  evaluateProductAdvertisingEligibility,
  type AdEligibilityReason,
  type ProductAdvertisingEligibility,
  type ProductAdvertisingEligibilityInput,
} from "./eligibility";

export {
  CARD_QUALITY_WEIGHTS,
  cardQualityTier,
  computeCardQualityScore,
  type CardQualityBreakdown,
  type CardQualityInput,
} from "./quality-score";

export {
  ADS_CATEGORY_SLUGS,
  buildCategoryAdsReport,
  type CategoryAdsReportRow,
} from "./category-report";

export {
  buildProductAdSnapshot,
  type ProductAdSnapshot,
  type ProductAdSnapshotSource,
} from "./product-snapshot";

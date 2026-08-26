/** LOT_POLICY_V2 — formal decision taxonomy and evidence model. */

export const LOT_POLICY_V2 = "LOT_POLICY_V2";
export const LOT_POLICY_V2_EFFECTIVE_FROM = "2026-08-26";

export type PolicyDecisionClass =
  | "ALLOW"
  | "HARD_BLOCK"
  | "RESTRICTED_REVIEW"
  | "MANUAL_REVIEW"
  | "NOT_EVALUATED";

export type PolicyEvidenceSource =
  | "TITLE_SIGNAL"
  | "DESCRIPTION_SIGNAL"
  | "CATEGORY_SIGNAL"
  | "CHARACTERISTIC_SIGNAL"
  | "OCR_SIGNAL"
  | "IMAGE_SIGNAL"
  | "SELLER_SIGNAL"
  | "PRICE_SIGNAL";

export type PolicyEvidenceHit = {
  source: PolicyEvidenceSource;
  policyId: string;
  confidence: number;
  matchedValue: string;
  detail?: string;
  engineVersion: string;
  evaluatedAt: string;
};

export type PolicyRuleSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PolicyRuleRecord = {
  policyId: string;
  category: string;
  subcategory: string;
  decisionClass: PolicyDecisionClass;
  severity: PolicyRuleSeverity;
  legalBasis?: string;
  jurisdiction: string;
  effectiveFrom: string;
  sourceUrls: string[];
  detectionSignals: string[];
  requiredEvidence?: string[];
  humanReviewRequired: boolean;
  sellerRemediation?: string;
  buyerExposureRule: "NONE" | "BLOCK_UNTIL_REVIEW" | "BLOCK_PERMANENT";
  userMessage: string;
  adminMessage: string;
};

export type ProductTypePolicyClass = "ALLOW" | "RESTRICTED" | "MANUAL_ONLY" | "HARD_BLOCK";

export type LotPolicyV2Registry = {
  version: typeof LOT_POLICY_V2;
  effectiveFrom: string;
  deprecatedAt: string | null;
  jurisdiction: string;
  researchedAt: string;
  rules: PolicyRuleRecord[];
  productTypeGuards: Array<{
    slugPattern: string;
    policyClass: ProductTypePolicyClass;
    policyId: string;
    userMessage: string;
  }>;
  textPatternGroups: Array<{
    groupId: string;
    policyId: string;
    patterns: string[];
    context: "MAIN_PRODUCT" | "ACCESSORY" | "ANY";
    decisionOverride?: PolicyDecisionClass;
  }>;
};

export type PolicyEvaluationInput = {
  title: string;
  description?: string | null;
  categorySlug?: string | null;
  productTypeSlug?: string | null;
  characteristics?: Array<{ name: string; value: string | number | null }>;
  price?: number | null;
  imageUrls?: string[];
  imageAltTexts?: string[];
  sellerTrustScore?: number | null;
};

export type PolicyEvaluationResult = {
  policyVersion: typeof LOT_POLICY_V2;
  decisionClass: PolicyDecisionClass;
  recommendation: PolicyDecisionClass;
  confidence: number;
  rulesTriggered: string[];
  evidence: PolicyEvidenceHit[];
  conflicts: string[];
  notEvaluatedDimensions: string[];
  humanReviewRequired: boolean;
  userMessage: string | null;
  adminSummary: string;
  blockBeforeSubmit: boolean;
};

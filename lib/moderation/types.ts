export type ModerationDecision =
  | "APPROVE"
  | "NEEDS_CHANGES"
  | "REJECT"
  | "MANUAL_REVIEW"
  | "ESCALATE";

export type ModerationReasonSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ModerationReasonCode =
  | "PROHIBITED_PRODUCT"
  | "RESTRICTED_PRODUCT"
  | "CATEGORY_MISMATCH"
  | "PROHIBITED_TEXT"
  | "CONTACT_INFO_IN_TEXT"
  | "CONTACT_INFO_IN_IMAGE"
  | "EXTERNAL_PAYMENT_REQUEST"
  | "EXTERNAL_LINK"
  | "QR_CODE"
  | "SPAM"
  | "DUPLICATE_LISTING"
  | "MISLEADING_CONTENT"
  | "IMAGE_CONTENT_MISMATCH"
  | "IMAGE_POLICY_VIOLATION"
  | "INVALID_PRICE"
  | "SUSPICIOUS_PRICE"
  | "COUNTERFEIT_SUSPECTED"
  | "SELLER_RISK"
  | "MISSING_REQUIRED_INFORMATION"
  | "WRONG_CHARACTERISTICS"
  | "BROKEN_IMAGE"
  | "IMAGE_NOT_EVALUATED"
  | "OCR_NOT_EVALUATED"
  | "OTHER";

export type ModerationReason = {
  code: ModerationReasonCode;
  severity: ModerationReasonSeverity;
  userMessage: string;
  adminMessage: string;
  remediation?: string;
  ruleId: string;
};

export type ModerationSignal = {
  id: string;
  category: string;
  weight: number;
  message: string;
  ruleId: string;
};

export type ImageModerationEvaluation = "NOT_EVALUATED" | "SAFE" | "FLAGGED";

export type ImageModerationSignals = {
  evaluation: ImageModerationEvaluation;
  adultContent?: ImageModerationEvaluation;
  weaponLikelihood?: ImageModerationEvaluation;
  contactInfoDetected?: ImageModerationEvaluation;
  qrDetected?: ImageModerationEvaluation;
  ocrAvailable: boolean;
  imageText?: string | null;
};

export type ModerationResult = {
  decision: ModerationDecision;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reasons: ModerationReason[];
  rulesTriggered: string[];
  signals: ModerationSignal[];
  policyVersion: string;
  reviewerType: "SYSTEM" | "ADMIN";
  imageSignals: ImageModerationSignals;
  contentVersionHash: string;
  policyV2?: import("./policy-v2/types").PolicyEvaluationResult;
};

export type PolicyRuleAction = "APPROVE" | "NEEDS_CHANGES" | "REJECT" | "MANUAL_REVIEW";

export type PolicyRule = {
  id: string;
  category: string;
  severity: ModerationReasonSeverity;
  action: PolicyRuleAction;
  ruleType: "HARD_RULE" | "SOFT_SIGNAL";
  enabled: boolean;
};

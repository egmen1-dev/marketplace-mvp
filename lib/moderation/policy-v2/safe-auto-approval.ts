import type { PolicyDecisionClass, PolicyEvaluationResult } from "./types";

const CRITICAL_NOT_EVALUATED = new Set([
  "PIXEL_OCR_NOT_AVAILABLE",
  "PIXEL_IMAGE_CLASSIFICATION_NOT_AVAILABLE",
]);

export type AutomationLevel = "SHADOW" | "GUARDED_AUTO" | "ENFORCE";

export function canAutoApprove(
  result: PolicyEvaluationResult,
  automationLevel: AutomationLevel,
  confidenceThreshold = 0.85,
): boolean {
  if (automationLevel !== "GUARDED_AUTO" && automationLevel !== "ENFORCE") {
    return false;
  }
  if (result.decisionClass !== "ALLOW") return false;
  if (result.conflicts.length > 0) return false;
  if (result.humanReviewRequired) return false;
  if (result.confidence < confidenceThreshold) return false;
  if (result.notEvaluatedDimensions.some((d) => CRITICAL_NOT_EVALUATED.has(d))) {
    return false;
  }
  if (result.rulesTriggered.length > 0) return false;
  return true;
}

export function automationVerdict(input: {
  policyResearchComplete: boolean;
  imageEngineOperational: boolean;
  ocrOperational: boolean;
  shadowAgreementRate?: number;
  criticalFalseNegatives: number;
}): "NOT_READY_FOR_AUTOMATION" | "READY_FOR_GUARDED_AUTO_REVIEW" | "READY_FOR_GUARDED_AUTO" {
  if (!input.policyResearchComplete) return "NOT_READY_FOR_AUTOMATION";
  if (!input.imageEngineOperational || !input.ocrOperational) return "NOT_READY_FOR_AUTOMATION";
  if (input.criticalFalseNegatives > 0) return "NOT_READY_FOR_AUTOMATION";
  if (input.shadowAgreementRate == null) return "READY_FOR_GUARDED_AUTO_REVIEW";
  if (input.shadowAgreementRate >= 0.92) return "READY_FOR_GUARDED_AUTO";
  return "READY_FOR_GUARDED_AUTO_REVIEW";
}

export function mapPolicyV2ToModerationDecision(
  decisionClass: PolicyDecisionClass,
): "APPROVE" | "REJECT" | "MANUAL_REVIEW" | "NEEDS_CHANGES" {
  switch (decisionClass) {
    case "ALLOW":
      return "APPROVE";
    case "HARD_BLOCK":
      return "REJECT";
    case "RESTRICTED_REVIEW":
      return "MANUAL_REVIEW";
    case "NOT_EVALUATED":
    case "MANUAL_REVIEW":
    default:
      return "MANUAL_REVIEW";
  }
}

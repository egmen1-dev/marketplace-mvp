import type { PolicyDecisionClass, PolicyEvaluationResult } from "./types";
import { isNeverAutoApprove } from "../evaluation-completeness";

const CRITICAL_NOT_EVALUATED_PREFIXES = [
  "PIXEL_OCR",
  "PIXEL_IMAGE",
  "IMAGE_EVALUATION_PENDING",
  "OCR_",
  "IMAGE_",
];

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
  if (isNeverAutoApprove(result.rulesTriggered)) return false;
  if (result.evaluationCompleteness && !result.evaluationCompleteness.allRequiredEvaluated) {
    return false;
  }
  if (
    result.notEvaluatedDimensions.some((d) =>
      CRITICAL_NOT_EVALUATED_PREFIXES.some((p) => d.startsWith(p)),
    )
  ) {
    return false;
  }
  if (result.rulesTriggered.length > 0) return false;
  return true;
}

export function automationVerdict(input: {
  policyResearchComplete: boolean;
  imageEngineOperational: boolean;
  ocrOperational: boolean;
  /** Real staging listing shadow + human comparison (EPIC 189.1 PART 20–21). */
  stagingShadowComplete?: boolean;
  shadowAgreementRate?: number;
  criticalFalseNegatives: number;
}): "NOT_READY_FOR_AUTOMATION" | "READY_FOR_GUARDED_AUTO_REVIEW" | "READY_FOR_GUARDED_AUTO" {
  if (!input.policyResearchComplete) return "NOT_READY_FOR_AUTOMATION";
  if (!input.imageEngineOperational || !input.ocrOperational) return "NOT_READY_FOR_AUTOMATION";
  if (input.criticalFalseNegatives > 0) return "NOT_READY_FOR_AUTOMATION";
  if (!input.stagingShadowComplete) return "NOT_READY_FOR_AUTOMATION";
  if (input.shadowAgreementRate == null) return "NOT_READY_FOR_AUTOMATION";
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

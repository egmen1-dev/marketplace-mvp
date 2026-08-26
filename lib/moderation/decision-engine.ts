import { getModerationAutomationMode } from "./config";
import { decisionFromReasons, evaluateModerationRisk } from "./risk-engine";
import type { ModerationDecision, ModerationReason, ModerationResult, ModerationSignal } from "./types";
import { LOT_POLICY_V1 } from "./config";
import type { ImageModerationSignals } from "./types";

export function buildModerationResult(input: {
  reasons: ModerationReason[];
  signals: ModerationSignal[];
  imageSignals: ImageModerationSignals;
  contentVersionHash: string;
}): ModerationResult {
  const risk = evaluateModerationRisk(input.signals);
  const systemDecision = decisionFromReasons(input.reasons, risk);
  const mode = getModerationAutomationMode();

  let decision: ModerationDecision = systemDecision;
  if (mode === "OFF") {
    decision = "MANUAL_REVIEW";
  } else if (mode === "SHADOW") {
    decision = "MANUAL_REVIEW";
  } else if (mode === "GUARDED_AUTO" || mode === "ENFORCE") {
    if (systemDecision === "REJECT" && !input.reasons.some((r) => r.code === "PROHIBITED_PRODUCT")) {
      decision = "MANUAL_REVIEW";
    }
    if (systemDecision === "APPROVE" && input.imageSignals.evaluation === "NOT_EVALUATED") {
      decision = "MANUAL_REVIEW";
    }
    if (mode === "GUARDED_AUTO" && systemDecision === "APPROVE" && input.imageSignals.evaluation !== "SAFE") {
      decision = "MANUAL_REVIEW";
    }
  }

  return {
    decision,
    riskScore: risk.score,
    riskLevel: risk.level,
    reasons: input.reasons,
    rulesTriggered: [...new Set(input.reasons.map((r) => r.ruleId))],
    signals: input.signals,
    policyVersion: LOT_POLICY_V1,
    reviewerType: "SYSTEM",
    imageSignals: input.imageSignals,
    contentVersionHash: input.contentVersionHash,
  };
}

export function mapDecisionToModerationStatus(
  decision: ModerationDecision,
): "PENDING_REVIEW" | "NEEDS_FIX" | "REJECTED" | "APPROVED" {
  switch (decision) {
    case "APPROVE":
      return "APPROVED";
    case "NEEDS_CHANGES":
      return "NEEDS_FIX";
    case "REJECT":
      return "REJECTED";
    case "ESCALATE":
    case "MANUAL_REVIEW":
    default:
      return "PENDING_REVIEW";
  }
}

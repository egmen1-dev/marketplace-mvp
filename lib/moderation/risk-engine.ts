import type { ModerationDecision, ModerationReason, ModerationSignal } from "./types";

export type RiskEvaluation = {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  signals: ModerationSignal[];
};

export function evaluateModerationRisk(signals: ModerationSignal[]): RiskEvaluation {
  const score = Math.min(
    100,
    signals.reduce((sum, signal) => sum + signal.weight, 0),
  );
  const level = score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  return { score, level, signals };
}

export function decisionFromReasons(
  reasons: ModerationReason[],
  risk: RiskEvaluation,
): ModerationDecision {
  if (reasons.some((r) => r.code === "PROHIBITED_PRODUCT")) return "REJECT";
  if (reasons.some((r) => r.severity === "HIGH" || r.severity === "CRITICAL")) {
    const hasNeedsChanges = reasons.some(
      (r) =>
        r.code === "CONTACT_INFO_IN_TEXT" ||
        r.code === "EXTERNAL_LINK" ||
        r.code === "INVALID_PRICE" ||
        r.code === "MISSING_REQUIRED_INFORMATION" ||
        r.code === "WRONG_CHARACTERISTICS",
    );
    if (hasNeedsChanges) return "NEEDS_CHANGES";
    return "MANUAL_REVIEW";
  }
  if (risk.level === "HIGH") return "MANUAL_REVIEW";
  if (reasons.length > 0) return "NEEDS_CHANGES";
  return "APPROVE";
}

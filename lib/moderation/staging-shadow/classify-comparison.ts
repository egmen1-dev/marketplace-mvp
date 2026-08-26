import type { PolicyDecisionClass } from "../policy-v2/types";

export type HumanModerationDecision =
  | "APPROVE"
  | "REJECT"
  | "NEEDS_CHANGES"
  | "MANUAL_REVIEW"
  | "PENDING"
  | "UNKNOWN";

export type ShadowComparisonClass =
  | "AGREE"
  | "SYSTEM_STRICTER"
  | "SYSTEM_LOOSER"
  | "INSUFFICIENT_EVIDENCE"
  | "HUMAN_ERROR_SUSPECTED"
  | "POLICY_GAP"
  | "PROVIDER_FAILURE"
  | "NOT_EVALUATED";

const SEVERITY: Record<string, number> = {
  ALLOW: 0,
  NOT_EVALUATED: 1,
  MANUAL_REVIEW: 2,
  RESTRICTED_REVIEW: 3,
  HARD_BLOCK: 4,
};

export function mapHumanStatus(status: string | null | undefined): HumanModerationDecision {
  switch (status) {
    case "APPROVED":
      return "APPROVE";
    case "REJECTED":
      return "REJECT";
    case "NEEDS_FIX":
      return "NEEDS_CHANGES";
    case "PENDING_REVIEW":
      return "MANUAL_REVIEW";
    default:
      return status ? "UNKNOWN" : "PENDING";
  }
}

export function mapSystemToComparable(decision: PolicyDecisionClass): string {
  switch (decision) {
    case "ALLOW":
      return "ALLOW";
    case "HARD_BLOCK":
      return "REJECT";
    case "RESTRICTED_REVIEW":
    case "MANUAL_REVIEW":
      return "MANUAL_REVIEW";
    case "NOT_EVALUATED":
      return "NOT_EVALUATED";
    default:
      return "MANUAL_REVIEW";
  }
}

export function classifyShadowComparison(input: {
  systemDecision: PolicyDecisionClass;
  humanStatus: string | null | undefined;
  providerFailures: boolean;
  notEvaluatedDimensions: string[];
  policyGaps?: string[];
}): ShadowComparisonClass {
  if (input.providerFailures) return "PROVIDER_FAILURE";
  if (input.policyGaps?.length) return "POLICY_GAP";
  if (input.systemDecision === "NOT_EVALUATED" || input.notEvaluatedDimensions.length > 0) {
    return input.notEvaluatedDimensions.some((d) => d.startsWith("PIXEL_"))
      ? "INSUFFICIENT_EVIDENCE"
      : "NOT_EVALUATED";
  }

  const human = mapHumanStatus(input.humanStatus);
  const systemComparable = mapSystemToComparable(input.systemDecision);

  if (human === "PENDING" || human === "UNKNOWN") return "INSUFFICIENT_EVIDENCE";

  const humanComparable =
    human === "APPROVE"
      ? "ALLOW"
      : human === "REJECT"
        ? "REJECT"
        : human === "NEEDS_CHANGES"
          ? "MANUAL_REVIEW"
          : "MANUAL_REVIEW";

  if (systemComparable === humanComparable) return "AGREE";

  const systemSeverity = SEVERITY[input.systemDecision] ?? 2;
  const humanSeverity =
    human === "APPROVE" ? 0 : human === "REJECT" ? 4 : human === "NEEDS_CHANGES" ? 2 : 2;

  if (systemSeverity > humanSeverity) return "SYSTEM_STRICTER";
  if (systemSeverity < humanSeverity) {
    if (input.systemDecision === "ALLOW" && human === "REJECT") return "SYSTEM_LOOSER";
    return "HUMAN_ERROR_SUSPECTED";
  }
  return "AGREE";
}

export function isCriticalFalseNegative(input: {
  systemDecision: PolicyDecisionClass;
  humanStatus: string | null | undefined;
  rulesTriggered: string[];
}): boolean {
  const human = mapHumanStatus(input.humanStatus);
  if (input.systemDecision !== "ALLOW") return false;
  if (human !== "REJECT") return false;
  return input.rulesTriggered.length > 0 || true;
}

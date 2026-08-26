import type { PolicyDecisionClass, PolicyEvidenceHit, PolicyRuleRecord } from "./types";

const PRECEDENCE: PolicyDecisionClass[] = [
  "HARD_BLOCK",
  "RESTRICTED_REVIEW",
  "MANUAL_REVIEW",
  "NOT_EVALUATED",
  "ALLOW",
];

export function resolveDecisionClass(
  rules: PolicyRuleRecord[],
  notEvaluatedDimensions: string[],
  hasConflict: boolean,
): PolicyDecisionClass {
  const restrictive = rules.filter((r) => r.decisionClass !== "ALLOW");
  if (restrictive.some((r) => r.decisionClass === "HARD_BLOCK")) return "HARD_BLOCK";
  if (restrictive.some((r) => r.decisionClass === "RESTRICTED_REVIEW")) return "RESTRICTED_REVIEW";
  if (hasConflict) return "MANUAL_REVIEW";
  if (notEvaluatedDimensions.length > 0 && restrictive.length === 0) return "NOT_EVALUATED";
  if (restrictive.some((r) => r.decisionClass === "MANUAL_REVIEW")) return "MANUAL_REVIEW";
  if (rules.length === 0) return "ALLOW";
  if (rules.every((r) => r.decisionClass === "ALLOW")) return "ALLOW";
  return "MANUAL_REVIEW";
}

export function detectEvidenceConflicts(evidence: PolicyEvidenceHit[], description?: string | null): string[] {
  const conflicts: string[] = [];
  const desc = (description ?? "").toLowerCase();
  const ocr = evidence
    .filter((e) => e.source === "OCR_SIGNAL")
    .map((e) => e.matchedValue.toLowerCase())
    .join(" ");

  if (desc.includes("без никотин")) {
    const nicotineHits = evidence.filter(
      (e) =>
        /никотин|nicotine|mg\/ml/.test(e.matchedValue.toLowerCase()) &&
        !/без\s*никотин|nicotine[\s-]*free|(?:^|\s)0\s*mg(?:\s|$)|(?:^|\s)0mg(?:\s|$)/.test(e.matchedValue.toLowerCase()),
    );
    if (nicotineHits.length > 0) {
      conflicts.push("DESCRIPTION_CLAIMS_NO_NICOTINE_BUT_EVIDENCE_SUGGESTS_NICOTINE");
    }
  }
  return conflicts;
}

export function mergeTriggeredRules(a: PolicyRuleRecord[], b: PolicyRuleRecord[]): PolicyRuleRecord[] {
  const map = new Map<string, PolicyRuleRecord>();
  for (const r of [...a, ...b]) map.set(r.policyId, r);
  return [...map.values()];
}

export function highestSeverityMessage(rules: PolicyRuleRecord[]): { user: string | null; admin: string } {
  if (rules.length === 0) {
    return { user: null, admin: "No policy rules triggered" };
  }
  const sorted = [...rules].sort(
    (x, y) => PRECEDENCE.indexOf(x.decisionClass) - PRECEDENCE.indexOf(y.decisionClass),
  );
  const top = sorted[0];
  return { user: top.userMessage, admin: top.adminMessage };
}

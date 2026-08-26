import type { LotPolicyV2Registry, PolicyEvidenceHit, PolicyRuleRecord } from "./types";

const ENGINE = "LOT_POLICY_V2_CATEGORY_GUARD/1.0.0";

function slugMatches(pattern: string, slug: string): boolean {
  const normalized = slug.toLowerCase();
  if (pattern.endsWith("*")) {
    return normalized.startsWith(pattern.slice(0, -1).toLowerCase());
  }
  return normalized === pattern.toLowerCase();
}

export function evaluateCategoryGuard(input: {
  registry: LotPolicyV2Registry;
  categorySlug?: string | null;
  productTypeSlug?: string | null;
  evaluatedAt: string;
}): {
  triggeredRules: PolicyRuleRecord[];
  evidence: PolicyEvidenceHit[];
  blockBeforeSubmit: boolean;
  userMessage: string | null;
} {
  const slug = input.productTypeSlug ?? input.categorySlug ?? "";
  if (!slug) {
    return { triggeredRules: [], evidence: [], blockBeforeSubmit: false, userMessage: null };
  }

  const guard = input.registry.productTypeGuards.find((g) => slugMatches(g.slugPattern, slug));
  if (!guard) {
    return { triggeredRules: [], evidence: [], blockBeforeSubmit: false, userMessage: null };
  }

  const rule = input.registry.rules.find((r) => r.policyId === guard.policyId);
  if (!rule) {
    return { triggeredRules: [], evidence: [], blockBeforeSubmit: false, userMessage: null };
  }

  const evidence: PolicyEvidenceHit = {
    source: "CATEGORY_SIGNAL",
    policyId: rule.policyId,
    confidence: 0.95,
    matchedValue: slug,
    detail: `productTypeGuard=${guard.slugPattern}; class=${guard.policyClass}`,
    engineVersion: ENGINE,
    evaluatedAt: input.evaluatedAt,
  };

  return {
    triggeredRules: [rule],
    evidence: [evidence],
    blockBeforeSubmit: guard.policyClass === "HARD_BLOCK",
    userMessage: guard.userMessage,
  };
}

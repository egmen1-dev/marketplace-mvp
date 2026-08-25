import type { ModerationReason, ModerationReasonCode, PolicyRule } from "../types";

export const POLICY_RULES_V1: PolicyRule[] = [
  {
    id: "CONTACT_PHONE_TEXT_V1",
    category: "CONTACT_INFO",
    severity: "MEDIUM",
    action: "NEEDS_CHANGES",
    ruleType: "HARD_RULE",
    enabled: true,
  },
  {
    id: "CONTACT_EMAIL_TEXT_V1",
    category: "CONTACT_INFO",
    severity: "MEDIUM",
    action: "NEEDS_CHANGES",
    ruleType: "HARD_RULE",
    enabled: true,
  },
  {
    id: "CONTACT_MESSENGER_TEXT_V1",
    category: "CONTACT_INFO",
    severity: "MEDIUM",
    action: "NEEDS_CHANGES",
    ruleType: "HARD_RULE",
    enabled: true,
  },
  {
    id: "EXTERNAL_LINK_TEXT_V1",
    category: "EXTERNAL_LINK",
    severity: "MEDIUM",
    action: "NEEDS_CHANGES",
    ruleType: "HARD_RULE",
    enabled: true,
  },
  {
    id: "PROHIBITED_HARD_V1",
    category: "PROHIBITED",
    severity: "CRITICAL",
    action: "REJECT",
    ruleType: "HARD_RULE",
    enabled: true,
  },
  {
    id: "PROHIBITED_SOFT_V1",
    category: "PROHIBITED",
    severity: "HIGH",
    action: "MANUAL_REVIEW",
    ruleType: "SOFT_SIGNAL",
    enabled: true,
  },
  {
    id: "CATEGORY_MISMATCH_V1",
    category: "CATEGORY",
    severity: "MEDIUM",
    action: "MANUAL_REVIEW",
    ruleType: "SOFT_SIGNAL",
    enabled: true,
  },
  {
    id: "DUPLICATE_SUSPECTED_V1",
    category: "DUPLICATE",
    severity: "MEDIUM",
    action: "MANUAL_REVIEW",
    ruleType: "SOFT_SIGNAL",
    enabled: true,
  },
  {
    id: "PRICE_INVALID_V1",
    category: "PRICE",
    severity: "HIGH",
    action: "NEEDS_CHANGES",
    ruleType: "HARD_RULE",
    enabled: true,
  },
  {
    id: "PRICE_SUSPICIOUS_V1",
    category: "PRICE",
    severity: "LOW",
    action: "MANUAL_REVIEW",
    ruleType: "SOFT_SIGNAL",
    enabled: true,
  },
  {
    id: "MISSING_REQUIRED_INFO_V1",
    category: "STRUCTURAL",
    severity: "HIGH",
    action: "NEEDS_CHANGES",
    ruleType: "HARD_RULE",
    enabled: true,
  },
  {
    id: "BROKEN_IMAGE_V1",
    category: "IMAGE",
    severity: "HIGH",
    action: "NEEDS_CHANGES",
    ruleType: "HARD_RULE",
    enabled: true,
  },
];

export function getPolicyRule(ruleId: string): PolicyRule | undefined {
  return POLICY_RULES_V1.find((rule) => rule.id === ruleId && rule.enabled);
}

export function buildReason(
  code: ModerationReasonCode,
  ruleId: string,
  input: Pick<ModerationReason, "severity" | "userMessage" | "adminMessage" | "remediation">,
): ModerationReason {
  return { code, ruleId, ...input };
}

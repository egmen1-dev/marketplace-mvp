import { matchPatterns } from "./text-engine";
import type { LotPolicyV2Registry, PolicyEvidenceHit, PolicyRuleRecord } from "./types";

const ENGINE = "LOT_POLICY_V2_CHARACTERISTICS/1.0.0";

const NICOTINE_CONCENTRATION_KEYS = [
  "никотин",
  "nicotine",
  "концентрация",
  "concentration",
  "mg/ml",
  "мг/мл",
];

const REQUIRED_SAFETY_GROUPS: Record<string, string[]> = {
  LOT_NICOTINE_LIQUID_V2: ["состав", "composition", "никотин", "nicotine", "объем", "volume"],
  LOT_MEDICAL_DEVICE_V2: ["регистрацион", "registration", "назначение", "purpose"],
  LOT_CHILDREN_PRODUCT_V2: ["возраст", "age"],
};

export function evaluateCharacteristics(input: {
  registry: LotPolicyV2Registry;
  characteristics?: Array<{ name: string; value: string | number | null }>;
  triggeredPolicyIds: string[];
  evaluatedAt: string;
}): {
  triggeredRules: PolicyRuleRecord[];
  evidence: PolicyEvidenceHit[];
  missingRequiredFields: string[];
} {
  const chars = input.characteristics ?? [];
  const charText = chars
    .map((c) => `${c.name}: ${c.value ?? ""}`)
    .join("\n");
  const charNames = chars.map((c) => c.name.toLowerCase());

  const triggered = new Map<string, PolicyRuleRecord>();
  const evidence: PolicyEvidenceHit[] = [];
  const missingRequiredFields: string[] = [];

  for (const group of input.registry.textPatternGroups) {
    if (!group.groupId.startsWith("char_")) continue;
    const hits = matchPatterns(charText, group.patterns);
    if (hits.length === 0) continue;
    const rule = input.registry.rules.find((r) => r.policyId === group.policyId);
    if (!rule) continue;
    triggered.set(rule.policyId, rule);
    evidence.push({
      source: "CHARACTERISTIC_SIGNAL",
      policyId: rule.policyId,
      confidence: 0.8,
      matchedValue: hits.join(", "),
      detail: `group=${group.groupId}`,
      engineVersion: ENGINE,
      evaluatedAt: input.evaluatedAt,
    });
  }

  for (const policyId of input.triggeredPolicyIds) {
    const required = REQUIRED_SAFETY_GROUPS[policyId];
    if (!required) continue;
    const hasField = required.some((key) =>
      charNames.some((n) => n.includes(key)) || matchPatterns(charText, [key]).length > 0,
    );
    if (!hasField) {
      missingRequiredFields.push(...required.filter((k) => !charNames.some((n) => n.includes(k))));
    }
  }

  const nicotineValue = chars.find((c) =>
    NICOTINE_CONCENTRATION_KEYS.some((k) => c.name.toLowerCase().includes(k)),
  );
  if (nicotineValue?.value != null && String(nicotineValue.value).match(/\d/)) {
    const rule = input.registry.rules.find((r) => r.policyId === "LOT_NICOTINE_LIQUID_V2");
    if (rule) {
      triggered.set(rule.policyId, rule);
      evidence.push({
        source: "CHARACTERISTIC_SIGNAL",
        policyId: rule.policyId,
        confidence: 0.92,
        matchedValue: `${nicotineValue.name}=${nicotineValue.value}`,
        detail: "nicotine concentration in characteristics",
        engineVersion: ENGINE,
        evaluatedAt: input.evaluatedAt,
      });
    }
  }

  return {
    triggeredRules: [...triggered.values()],
    evidence,
    missingRequiredFields: [...new Set(missingRequiredFields)],
  };
}

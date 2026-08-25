import { detectProhibitedProduct } from "@/lib/marketplace-trust-loop/risk/prohibited-products";

import { buildReason } from "../policies/registry";
import type { ModerationReason, ModerationSignal } from "../types";

const HARD_PROHIBITED_IDS = new Set(["weapons", "drugs"]);

export function analyzeProhibitedSignals(input: {
  name: string;
  description?: string | null;
}): { reasons: ModerationReason[]; signals: ModerationSignal[] } {
  const result = detectProhibitedProduct(input);
  if (!result.hit || !result.label) {
    return { reasons: [], signals: [] };
  }

  const isHard = HARD_PROHIBITED_IDS.has(result.ruleId ?? "");
  if (isHard) {
    return {
      reasons: [
        buildReason("PROHIBITED_PRODUCT", "PROHIBITED_HARD_V1", {
          severity: "CRITICAL",
          userMessage: "Этот тип товара нельзя размещать на ЛОТ.",
          adminMessage: `Hard prohibited match: ${result.label}`,
          remediation: "Удалите запрещённый товар из объявления.",
        }),
      ],
      signals: [
        {
          id: `prohibited-${result.ruleId}`,
          category: "PROHIBITED",
          weight: 80,
          message: result.label,
          ruleId: "PROHIBITED_HARD_V1",
        },
      ],
    };
  }

  return {
    reasons: [
      buildReason("RESTRICTED_PRODUCT", "PROHIBITED_SOFT_V1", {
        severity: "HIGH",
        userMessage: "ЛОТ требует ручной проверки модератором.",
        adminMessage: `Soft prohibited signal: ${result.label}`,
      }),
    ],
    signals: [
      {
        id: `prohibited-soft-${result.ruleId}`,
        category: "PROHIBITED",
        weight: 45,
        message: result.label,
        ruleId: "PROHIBITED_SOFT_V1",
      },
    ],
  };
}

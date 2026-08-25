import { buildReason } from "../policies/registry";
import type { ModerationReason, ModerationSignal } from "../types";

export function analyzePriceSignals(price: number): {
  reasons: ModerationReason[];
  signals: ModerationSignal[];
} {
  const reasons: ModerationReason[] = [];
  const signals: ModerationSignal[] = [];

  if (!Number.isFinite(price) || price <= 0) {
    reasons.push(
      buildReason("INVALID_PRICE", "PRICE_INVALID_V1", {
        severity: "HIGH",
        userMessage: "Укажите корректную цену.",
        adminMessage: "Zero or negative price",
        remediation: "Введите цену больше нуля.",
      }),
    );
    signals.push({
      id: "price-invalid",
      category: "PRICE",
      weight: 40,
      message: "Invalid price",
      ruleId: "PRICE_INVALID_V1",
    });
    return { reasons, signals };
  }

  if (price < 10) {
    signals.push({
      id: "price-suspicious-low",
      category: "PRICE",
      weight: 10,
      message: "Very low price",
      ruleId: "PRICE_SUSPICIOUS_V1",
    });
  }

  if (price > 10_000_000) {
    signals.push({
      id: "price-suspicious-high",
      category: "PRICE",
      weight: 10,
      message: "Very high price",
      ruleId: "PRICE_SUSPICIOUS_V1",
    });
  }

  return { reasons, signals };
}

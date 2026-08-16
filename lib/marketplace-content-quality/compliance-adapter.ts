import type { ProductQualityInput } from "./types";
import { clampScore } from "./utils";

export function evaluateCompliance(input: ProductQualityInput): {
  score: number;
  confidence: number;
  complianceStatus: string;
  reasons: string[];
  hardBlock: boolean;
} {
  const hints = input.hints;
  if (input.prohibitedHit || hints?.prohibited) {
    return {
      score: 0,
      confidence: 0.99,
      complianceStatus: "PROHIBITED",
      reasons: ["Запрещённый товар"],
      hardBlock: true,
    };
  }

  if (input.moderationStatus === "REJECTED" || hints?.moderationRejected) {
    return {
      score: 5,
      confidence: 0.98,
      complianceStatus: "MODERATION_REJECTED",
      reasons: ["Модерация отклонила карточку"],
      hardBlock: true,
    };
  }

  if (input.moderationStatus === "PENDING") {
    return {
      score: 45,
      confidence: 0.9,
      complianceStatus: "UNDER_MODERATION",
      reasons: ["Карточка на модерации"],
      hardBlock: false,
    };
  }

  return {
    score: 92,
    confidence: 0.88,
    complianceStatus: "OK",
    reasons: ["Compliance проверен через Trust Loop сигналы"],
    hardBlock: false,
  };
}

export function evaluateBuyerValue(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
} {
  const hints = input.hints;
  if (hints?.buyerValue != null) {
    return {
      score: clampScore(hints.buyerValue),
      confidence: 0.86,
      reasons: ["Сценарий lab: buyer value"],
    };
  }

  let score = 50;
  const reasons: string[] = [];
  if ((input.description ?? "").length >= 60) {
    score += 15;
    reasons.push("Описание помогает принять решение");
  }
  if (input.characteristics.length >= 4) {
    score += 12;
    reasons.push("Ключевые параметры указаны");
  }
  if (input.images.length >= 2) {
    score += 10;
    reasons.push("Визуальное подтверждение товара");
  }
  return { score: clampScore(score), confidence: 0.7, reasons };
}

export function evaluateCommercialIntent(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
} {
  const hints = input.hints;
  if (hints?.commercialIntent != null) {
    return {
      score: clampScore(hints.commercialIntent),
      confidence: 0.85,
      reasons: ["Сценарий lab: commercial intent"],
    };
  }

  const hasClearName = input.name.trim().length >= 8;
  const score = clampScore(
    (hasClearName ? 35 : 10) +
      Math.min(25, input.images.length * 5) +
      Math.min(20, input.characteristics.length * 3) +
      ((input.description ?? "").length >= 40 ? 15 : 0),
  );
  return {
    score,
    confidence: 0.68,
    reasons: score >= 70 ? ["Карточка помогает принять решение о покупке"] : ["Недостаточно коммерческой ясности"],
  };
}

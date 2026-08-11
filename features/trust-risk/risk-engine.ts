import type { RiskSeverity } from "@prisma/client";

import { riskLevel } from "./config";

/**
 * RiskScoreEngine (AGENT-019, sections 6/7). Fraud/abuse risk for a specific
 * operation or entity. Higher = riskier. Explainable, combination-based (a new
 * account alone is never high risk — sections 6/38/39).
 *
 * Risk is NOT the inverse of trust; kept separate from TrustScoreEngine.
 */

export type RiskSignal = { label: string; delta: number };

export type RiskResult = {
  score: number; // 0..100
  level: RiskSeverity;
  signals: RiskSignal[];
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function build(signals: RiskSignal[]): RiskResult {
  const applied = signals.filter((s) => s.delta !== 0);
  const score = clamp(applied.reduce((a, s) => a + s.delta, 0));
  return { score: Math.round(score), level: riskLevel(score), signals: applied };
}

export type ProductRiskSignals = {
  /** 0..100 from PriceOutlierDetector. */
  priceOutlierScore: number;
  /** 0..100 from DuplicateListingDetector. */
  duplicateRiskScore: number;
  /** 0..100 seller risk contribution. */
  sellerRiskScore: number;
  hasImages: boolean;
  hasDescription: boolean;
  hasProductType: boolean;
};

/** Product risk (section 7). Cheap price alone is not fraud (combination-based). */
export function computeProductRisk(s: ProductRiskSignals): RiskResult {
  const signals: RiskSignal[] = [];
  if (s.priceOutlierScore > 0) {
    signals.push({ label: "Аномально низкая цена", delta: Math.round(s.priceOutlierScore * 0.4) });
  }
  if (s.duplicateRiskScore > 0) {
    signals.push({ label: "Похоже на дубль объявления", delta: Math.round(s.duplicateRiskScore * 0.35) });
  }
  if (s.sellerRiskScore > 0) {
    signals.push({ label: "Риск продавца", delta: Math.round(s.sellerRiskScore * 0.25) });
  }
  const missing =
    (s.hasImages ? 0 : 1) + (s.hasDescription ? 0 : 1) + (s.hasProductType ? 0 : 1);
  if (missing >= 2) {
    signals.push({ label: "Не хватает базовых данных карточки", delta: 8 });
  }
  return build(signals);
}

export type TransactionRiskSignals = {
  sellerAccountAgeDays: number;
  buyerAccountAgeDays: number;
  sellerVerified: boolean;
  /** Transaction amount vs the buyer's typical / segment median (ratio). */
  amount: number;
  typicalAmount?: number | null;
  /** Orders/reservations created by the buyer in the last hour. */
  recentActionCount?: number;
  buyerCancellationRate?: number | null;
};

/**
 * Transaction risk (section 6). Uses combinations/thresholds — a single "new
 * account" signal never yields high risk on its own.
 */
export function computeTransactionRisk(s: TransactionRiskSignals): RiskResult {
  const signals: RiskSignal[] = [];

  const newSeller = s.sellerAccountAgeDays < 1;
  const newBuyer = s.buyerAccountAgeDays < 1;
  const highValue =
    s.typicalAmount != null && s.typicalAmount > 0 && s.amount > s.typicalAmount * 3;

  // New account is only risky in combination with a high-value transaction.
  if (newSeller && highValue) {
    signals.push({ label: "Новый продавец + крупная сумма", delta: 22 });
  } else if (newSeller) {
    signals.push({ label: "Новый продавец", delta: 6 });
  }
  if (newBuyer && highValue) {
    signals.push({ label: "Новый покупатель + крупная сумма", delta: 18 });
  } else if (newBuyer) {
    signals.push({ label: "Новый покупатель", delta: 5 });
  }

  if (highValue) {
    signals.push({ label: "Необычно высокая сумма сделки", delta: 12 });
  }

  if (s.recentActionCount && s.recentActionCount >= 5) {
    signals.push({ label: `Быстрые операции: ${s.recentActionCount}/час`, delta: Math.min(25, s.recentActionCount * 3) });
  }

  if (s.buyerCancellationRate != null && s.buyerCancellationRate > 0.4) {
    signals.push({ label: `Высокая доля отмен: ${Math.round(s.buyerCancellationRate * 100)}%`, delta: 15 });
  }

  if (s.sellerVerified) {
    signals.push({ label: "Проверенный продавец", delta: -12 });
  }

  return build(signals);
}

/** Aggregate an entity's open risk-event score deltas into a level (capped). */
export function aggregateEventRisk(deltas: number[]): RiskResult {
  const score = clamp(deltas.reduce((a, d) => a + Math.max(0, d), 0));
  return {
    score: Math.round(score),
    level: riskLevel(score),
    signals: [],
  };
}

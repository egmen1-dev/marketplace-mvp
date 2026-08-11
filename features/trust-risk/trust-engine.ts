import { NEUTRAL_TRUST } from "./config";

/**
 * TrustScoreEngine (AGENT-019, sections 3–5). Operational 0–100 trust score from
 * REAL signals only, with neutral priors for unknown/new accounts (sections
 * 38/39). Fully explainable: every contribution has a label and delta.
 *
 * Trust is NOT fraud risk (kept separate from RiskScoreEngine).
 */

export type TrustSignal = { label: string; delta: number };

export type TrustResult = {
  score: number; // 0..100
  base: number;
  signals: TrustSignal[];
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function build(signals: TrustSignal[]): TrustResult {
  const applied = signals.filter((s) => s.delta !== 0);
  const score = clamp(NEUTRAL_TRUST + applied.reduce((a, s) => a + s.delta, 0));
  return { score: Math.round(score), base: NEUTRAL_TRUST, signals: applied };
}

export type SellerTrustSignals = {
  isVerified: boolean;
  accountAgeDays: number;
  completedTransactions: number;
  avgRating: number; // 0 when no reviews
  ratingCount: number;
  /** 0..1; null when unknown (neutral). */
  cancellationRate: number | null;
  /** True when recent fulfillment degraded (real signal). */
  fulfillmentDegraded?: boolean;
  /** 0..1 profile completeness (name/logo/description/etc.). */
  profileCompleteness?: number;
};

/** Seller operational trust (composite over existing reputation, section 5). */
export function computeSellerTrust(s: SellerTrustSignals): TrustResult {
  const signals: TrustSignal[] = [];
  if (s.isVerified) signals.push({ label: "Проверенный продавец", delta: 15 });

  if (s.accountAgeDays >= 90) signals.push({ label: "Аккаунт старше 90 дней", delta: 8 });
  else if (s.accountAgeDays >= 30) signals.push({ label: "Аккаунт старше 30 дней", delta: 4 });
  // New account → neutral (not negative), section 38.

  if (s.completedTransactions > 0) {
    const pts = Math.round(Math.min(20, (Math.log1p(s.completedTransactions) / Math.log1p(200)) * 20));
    signals.push({ label: `Завершённых сделок: ${s.completedTransactions}`, delta: pts });
  }

  if (s.ratingCount > 0) {
    // (avg-3)/2 ∈ [-1,1] → ±18. Only when real reviews exist.
    const pts = Math.round(((s.avgRating - 3) / 2) * 18);
    signals.push({ label: `Рейтинг ${s.avgRating.toFixed(1)} (${s.ratingCount})`, delta: pts });
  }

  if (s.cancellationRate != null) {
    const pts = Math.round((1 - s.cancellationRate) * 14 - 7); // 0% → +7, 100% → -7
    signals.push({ label: `Отмены: ${Math.round(s.cancellationRate * 100)}%`, delta: pts });
  }

  if (s.fulfillmentDegraded) {
    signals.push({ label: "Снижение качества исполнения", delta: -5 });
  }

  if (s.profileCompleteness != null && s.profileCompleteness >= 0.8) {
    signals.push({ label: "Заполненный профиль", delta: 3 });
  }

  return build(signals);
}

export type BuyerTrustSignals = {
  accountAgeDays: number;
  completedOrders: number;
  cancelledOrders: number;
  completedReservations: number;
  cancelledReservations: number;
  noShowCount?: number;
  highRiskEventCount?: number;
};

/** Buyer operational trust (section 4). No sensitive/protected traits used. */
export function computeBuyerTrust(s: BuyerTrustSignals): TrustResult {
  const signals: TrustSignal[] = [];

  if (s.accountAgeDays >= 90) signals.push({ label: "Аккаунт старше 90 дней", delta: 6 });
  else if (s.accountAgeDays >= 30) signals.push({ label: "Аккаунт старше 30 дней", delta: 3 });

  const completed = s.completedOrders + s.completedReservations;
  if (completed > 0) {
    const pts = Math.round(Math.min(20, (Math.log1p(completed) / Math.log1p(100)) * 20));
    signals.push({ label: `Завершённых покупок: ${completed}`, delta: pts });
  }

  const totalOrders = s.completedOrders + s.cancelledOrders;
  if (totalOrders >= 3) {
    const rate = s.cancelledOrders / totalOrders;
    signals.push({ label: `Отмены заказов: ${Math.round(rate * 100)}%`, delta: Math.round((1 - rate) * 12 - 6) });
  }

  const totalRes = s.completedReservations + s.cancelledReservations;
  if (totalRes >= 3) {
    const rate = s.cancelledReservations / totalRes;
    signals.push({ label: `Отмены броней: ${Math.round(rate * 100)}%`, delta: Math.round((1 - rate) * 10 - 5) });
  }

  if (s.noShowCount && s.noShowCount > 0) {
    signals.push({ label: `Неявки: ${s.noShowCount}`, delta: -Math.min(15, s.noShowCount * 5) });
  }

  if (s.highRiskEventCount && s.highRiskEventCount > 0) {
    signals.push({ label: `Серьёзные риск-события: ${s.highRiskEventCount}`, delta: -Math.min(20, s.highRiskEventCount * 8) });
  }

  return build(signals);
}

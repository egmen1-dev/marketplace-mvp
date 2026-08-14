import {
  computeSellerTrustScore,
  fulfillmentPercent,
} from "@/lib/marketplace-trust-score/calculator";
import { TRUST_SCORE_USER_LABEL } from "@/lib/marketplace-trust-score/constants";
import { isMarketplaceTrustScoreModelEnabled } from "@/lib/marketplace-trust-score/flags";
import { listTrustScoreHistory } from "@/lib/marketplace-trust-score/history";
import { gatherSellerMetrics, getCurrentSellerTrustScore } from "@/lib/marketplace-trust-score/recalculate";
import {
  buildSellerTrustSignals,
  buildVerificationDetails,
  VERIFIED_SELLER_EXPLANATION,
} from "@/lib/marketplace-trust-score/signals";
import { prisma } from "@/lib/prisma";

import { getAdminTrustCenterSnapshot } from "./admin-analytics";
import { averageShippingLabel, buildTrustAchievements } from "./achievements";
import { getTrustLevelUx } from "./constants";
import { buildFactorInsights } from "./factor-insights";
import { isMarketplaceTrustExperienceEnabled } from "./flags";
import { buildHistoryTimeline, computeTrendSummary } from "./history-timeline";
import { buildTrustNextStep } from "./next-step";
import { buildTrustScoreNotifications } from "./notifications";
import type {
  AdminTrustCenterSnapshot,
  BuyerTrustExperienceSnapshot,
  SellerTrustCenterSnapshot,
  TrustScoreNotification,
} from "./types";

export async function getSellerTrustCenter(
  sellerId: string,
): Promise<SellerTrustCenterSnapshot | null> {
  if (!isMarketplaceTrustExperienceEnabled() || !isMarketplaceTrustScoreModelEnabled()) {
    return null;
  }

  const [metrics, history, trustScore] = await Promise.all([
    gatherSellerMetrics(sellerId),
    listTrustScoreHistory(sellerId, 20),
    getCurrentSellerTrustScore(sellerId),
  ]);

  const computed = computeSellerTrustScore(metrics);
  const signals = buildSellerTrustSignals({
    metrics,
    trustScore,
    lastHistoryReason: history[0]?.reason ?? null,
  });
  const trendRaw = computeTrendSummary({ history, windowDays: 30 });

  return {
    enabled: true,
    trustScore,
    trustScoreLabel: TRUST_SCORE_USER_LABEL,
    level: getTrustLevelUx(trustScore),
    trend: {
      windowDays: 30,
      delta: trendRaw.delta,
      direction: trendRaw.direction,
      mainReason: trendRaw.mainReason ?? signals.helps[0]?.replace(/^✓\s*/, "") ?? null,
    },
    factors: buildFactorInsights({ factors: computed.factors, metrics, history }),
    history: buildHistoryTimeline(history),
    nextStep: buildTrustNextStep(metrics),
    achievements: buildTrustAchievements(metrics),
    helps: signals.helps,
  };
}

export async function getBuyerTrustExperience(
  sellerId: string,
): Promise<BuyerTrustExperienceSnapshot | null> {
  if (!isMarketplaceTrustExperienceEnabled() || !isMarketplaceTrustScoreModelEnabled()) {
    return null;
  }

  const [metrics, trustScore] = await Promise.all([
    gatherSellerMetrics(sellerId),
    getCurrentSellerTrustScore(sellerId),
  ]);

  const level = getTrustLevelUx(trustScore);
  const reasons: string[] = [];
  const fulfillment = fulfillmentPercent(metrics);
  if (metrics.completedOrders > 0 && fulfillment > 0) {
    reasons.push(`✓ ${fulfillment}% заказов выполнено`);
  }
  const shipLabel = averageShippingLabel(metrics);
  if (shipLabel) {
    reasons.push(`✓ Среднее время отправки: ${shipLabel}`);
  }
  if (metrics.reviewsCount > 0) {
    reasons.push(`✓ ${metrics.reviewsCount} отзывов покупателей`);
  }
  const verificationDetails = buildVerificationDetails({
    phoneVerified: metrics.phoneVerified,
    paymentVerified: metrics.paymentVerified,
    isVerified: metrics.isVerified,
    completedOrders: metrics.completedOrders,
  });

  if (
    verificationDetails.length > 0 &&
    !reasons.some((line) => line.includes(VERIFIED_SELLER_EXPLANATION))
  ) {
    reasons.push(`✓ ${VERIFIED_SELLER_EXPLANATION}`);
  }

  return {
    enabled: true,
    level,
    headline: "Почему можно доверять продавцу",
    reasons: reasons.slice(0, 4),
    verificationDetails,
  };
}

export async function getTrustExperienceNotifications(input: {
  sellerId: string;
}): Promise<TrustScoreNotification[]> {
  if (!isMarketplaceTrustExperienceEnabled() || !isMarketplaceTrustScoreModelEnabled()) {
    return [];
  }

  const history = await listTrustScoreHistory(input.sellerId, 10);
  return buildTrustScoreNotifications(history);
}

export async function getAdminTrustCenter(): Promise<AdminTrustCenterSnapshot | null> {
  if (!isMarketplaceTrustExperienceEnabled() || !isMarketplaceTrustScoreModelEnabled()) {
    return null;
  }

  return getAdminTrustCenterSnapshot();
}

export async function countTrustHistoryEntries(): Promise<number> {
  return prisma.trustScoreHistory.count();
}

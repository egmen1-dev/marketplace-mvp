import { getSellerTrustScoreSummary, isTrustSafetyEnabled } from "@/lib/trust-safety";
import {
  getSellerLearningInsights,
  isMarketplaceLearningEnabled,
} from "@/lib/marketplace-learning";
import {
  getSellerGrowthDashboard,
  isSellerGrowthEnabled,
} from "@/lib/seller-growth";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";

import type { SellerHealthScores } from "./types";

export async function loadSellerHealthScores(
  sellerProfileId: string,
): Promise<SellerHealthScores> {
  const [growth, trust, health, learning] = await Promise.all([
    isSellerGrowthEnabled()
      ? getSellerGrowthDashboard(sellerProfileId).catch(() => null)
      : Promise.resolve(null),
    isTrustSafetyEnabled()
      ? getSellerTrustScoreSummary(sellerProfileId).catch(() => null)
      : Promise.resolve(null),
    loadSellerHealthSnapshot(sellerProfileId).catch(() => null),
    isMarketplaceLearningEnabled()
      ? getSellerLearningInsights(sellerProfileId).catch(() => null)
      : Promise.resolve(null),
  ]);

  const qualityScore =
    health && health.products.length > 0
      ? Math.round(
          health.products.reduce((sum, p) => sum + p.qualityScore, 0) /
            health.products.length,
        )
      : null;

  return {
    growthScore: growth?.score.score ?? null,
    trustScore: trust?.score ?? null,
    qualityScore,
    learningScore: learning?.qualityScore?.score ?? null,
  };
}

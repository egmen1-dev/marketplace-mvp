import {
  computePromotionContribution,
  rankProductsByScore,
} from "@/lib/marketplace-ranking-intelligence/calibration-100";
import { evaluateQualityGates } from "@/lib/marketplace-ranking-intelligence/quality-gates";
import { computeRankingScore } from "@/lib/marketplace-ranking-intelligence/ranking-score";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import {
  buildDirtySocksProductControl,
  buildFourQualityPhotosProduct,
  buildHighQuantityLowQualityProduct,
} from "../benchmark/scenarios";
import { evaluateProductQualityInput } from "../evaluate";
import { applyContentQualityToRankingInput } from "../ranking-integration";
import { isMarketplaceContentQualityEnabled } from "../flags";

function baseRankingProduct(id: string, name: string): RankingProductInput {
  return {
    id,
    name,
    price: 3990,
    compareAt: null,
    status: "ACTIVE",
    stock: 8,
    views: 300,
    favoritesCount: 12,
    categoryId: "cat-home",
    categoryName: "Климат",
    descriptionLength: 180,
    seoTitleLength: 40,
    seoDescriptionLength: 120,
    photoCount: 4,
    hasVideo: false,
    characteristicCount: 8,
    hasBrand: true,
    sellerId: "seller-quality-lab",
    sellerBlocked: false,
    sellerTrustScore: 75,
    sellerReviewsCount: 6,
    sellerAverageRating: 4.4,
    sellerCompletedOrders: 12,
    sellerCancellationRate: 0.03,
    moderationStatus: "APPROVED",
    prohibitedHit: false,
    qualityScore: 80,
    cartAdds: 5,
    ordersCount: 2,
    promotionActive: false,
  };
}

async function withQuality(input: RankingProductInput): Promise<RankingProductInput> {
  if (!isMarketplaceContentQualityEnabled()) return input;
  const qualityInput =
    input.id === "dirty-socks-a"
      ? buildDirtySocksProductControl()
      : input.id === "hq-lq-a"
        ? buildHighQuantityLowQualityProduct()
        : input.id === "four-good-b"
          ? buildFourQualityPhotosProduct()
          : null;
  if (!qualityInput) return input;
  const evaluation = await evaluateProductQualityInput(qualityInput);
  return applyContentQualityToRankingInput(input, evaluation);
}

export type QualityRankingCriticalResult = {
  verdict: "PASS" | "FAIL";
  productAPosition: number;
  productBPosition: number;
  productAGated: boolean;
  productBPromotionBlocked: boolean;
  notes: string[];
};

/** Critical assertion: 10 irrelevant photos + promotion must NOT beat 4 quality photos. */
export async function runQualityRankingCriticalTest(): Promise<QualityRankingCriticalResult> {
  const notes: string[] = [];
  let productA = baseRankingProduct("dirty-socks-a", "Напольный вентилятор");
  productA = {
    ...productA,
    photoCount: 10,
    descriptionLength: 500,
    seoTitleLength: 60,
    seoDescriptionLength: 160,
    characteristicCount: 12,
    promotionActive: true,
  };

  let productB = baseRankingProduct("four-good-b", "Напольный вентилятор PRO");
  productB = {
    ...productB,
    photoCount: 4,
    promotionActive: false,
  };

  productA = await withQuality(productA);
  productB = await withQuality(productB);

  const pool = [productA, productB];
  const ranked = rankProductsByScore(pool, DEFAULT_RANKING_WEIGHTS_V1, 15);
  const scoreA = computeRankingScore(productA, DEFAULT_RANKING_WEIGHTS_V1);
  const scoreB = computeRankingScore(productB, DEFAULT_RANKING_WEIGHTS_V1);
  const gateA = evaluateQualityGates(productA, scoreA);
  const gateB = evaluateQualityGates(productB, scoreB);

  const posA = ranked.find((r) => r.product.id === productA.id)?.position ?? 99;
  const posB = ranked.find((r) => r.product.id === productB.id)?.position ?? 99;

  const promoA = computePromotionContribution({
    organicScore: scoreA.overall,
    promotionActive: true,
    promotionInfluencePercent: 15,
    topBlocked: gateA.topBlocked,
  });

  if (gateA.topBlocked) notes.push("Product A hard-gated — expected");
  if (promoA === 0 && productA.promotionActive) {
    notes.push("Promotion не обходит quality gate для Product A");
  }

  const pass = posB < posA && (gateA.topBlocked || scoreB.overall >= scoreA.overall);
  if (!pass) notes.push("Product A outranked Product B — FAIL");

  return {
    verdict: pass ? "PASS" : "FAIL",
    productAPosition: posA,
    productBPosition: posB,
    productAGated: gateA.topBlocked,
    productBPromotionBlocked: gateB.topBlocked,
    notes,
  };
}

export async function runDirtySocksControlTest() {
  const evaluation = await evaluateProductQualityInput(buildDirtySocksProductControl());
  return {
    photoRelevance:
      evaluation.photo.images.reduce((s, i) => s + i.relevance, 0) /
      Math.max(1, evaluation.photo.images.length),
    qualityGateFailed: evaluation.qualityGateFailed,
    topBlocked: evaluation.topEligibility === "BLOCKED",
    failedGates: evaluation.failedGates,
    overallScore: evaluation.overallScore,
  };
}

export async function runHighQuantityVsQualityTest() {
  const bad = await evaluateProductQualityInput(buildHighQuantityLowQualityProduct());
  const good = await evaluateProductQualityInput(buildFourQualityPhotosProduct());
  return {
    badPhotoScore: bad.photo.score,
    goodPhotoScore: good.photo.score,
    badEffectiveCount: bad.photo.effectivePhotoCount,
    goodEffectiveCount: good.photo.effectivePhotoCount,
    goodWins: good.photo.score > bad.photo.score,
  };
}

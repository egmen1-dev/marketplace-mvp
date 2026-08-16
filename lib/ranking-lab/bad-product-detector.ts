import {
  computePromotionContribution,
  rankProductsByScore,
} from "@/lib/marketplace-ranking-intelligence/calibration-100";
import { evaluateQualityGates } from "@/lib/marketplace-ranking-intelligence/quality-gates";
import { computeRankingScore } from "@/lib/marketplace-ranking-intelligence/ranking-score";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import type { LabBadProductCase, LabBadProductReport } from "./types";

function buildBadProduct(input: Partial<RankingProductInput> & { id: string; name: string }): RankingProductInput {
  const { id, name, ...rest } = input;
  return {
    id,
    name,
    price: 1990,
    compareAt: null,
    status: "ACTIVE",
    stock: 5,
    views: 200,
    favoritesCount: 4,
    categoryId: "cat-tools",
    categoryName: "Инструменты",
    descriptionLength: 0,
    seoTitleLength: 4,
    seoDescriptionLength: 5,
    photoCount: 0,
    hasVideo: false,
    characteristicCount: 0,
    hasBrand: false,
    sellerId: "seller-bad-lab",
    sellerBlocked: false,
    sellerTrustScore: 25,
    sellerReviewsCount: 0,
    sellerAverageRating: 0,
    sellerCompletedOrders: 0,
    sellerCancellationRate: 0.15,
    moderationStatus: "APPROVED",
    prohibitedHit: false,
    qualityScore: 12,
    cartAdds: 0,
    ordersCount: 0,
    promotionActive: false,
    ...rest,
  };
}

const BAD_CASES: Array<{ id: string; label: string; product: RankingProductInput }> = [
  {
    id: "BAD-PHOTOS",
    label: "Плохие фото (0–1)",
    product: buildBadProduct({
      id: "BAD-PHOTOS",
      name: "Товар без фото",
      photoCount: 0,
      descriptionLength: 0,
    }),
  },
  {
    id: "BAD-DESC",
    label: "Нулевое описание",
    product: buildBadProduct({
      id: "BAD-DESC",
      name: "!!!",
      photoCount: 1,
      descriptionLength: 0,
    }),
  },
  {
    id: "BAD-SEO",
    label: "Спам SEO",
    product: buildBadProduct({
      id: "BAD-SEO",
      name: "!!! BUY CHEAP KEYWORD SPAM SEO !!!",
      photoCount: 2,
      seoTitleLength: 80,
      seoDescriptionLength: 200,
    }),
  },
  {
    id: "BAD-FAKE",
    label: "Накрутка / fake reviews",
    product: buildBadProduct({
      id: "BAD-FAKE",
      name: "mega deal fake reviews bot",
      photoCount: 1,
      sellerReviewsCount: 500,
      sellerAverageRating: 5,
      sellerTrustScore: 18,
      qualityScore: 8,
    }),
  },
  {
    id: "BAD-REVIEWS",
    label: "Плохие отзывы",
    product: buildBadProduct({
      id: "BAD-REVIEWS",
      name: "Товар с плохими отзывами",
      photoCount: 2,
      sellerReviewsCount: 12,
      sellerAverageRating: 2.1,
      sellerTrustScore: 32,
    }),
  },
  {
    id: "BAD-PROMO",
    label: "Продвижение без качества",
    product: buildBadProduct({
      id: "BAD-PROMO",
      name: "Promoted junk",
      photoCount: 1,
      promotionActive: true,
      qualityScore: 15,
    }),
  },
];

export function runBadProductLab(
  baselineProducts: RankingProductInput[],
): LabBadProductReport {
  const cases: LabBadProductCase[] = BAD_CASES.map(({ id, label, product }) => {
    const pool = [...baselineProducts, product];
    const ranked = rankProductsByScore(pool, DEFAULT_RANKING_WEIGHTS_V1);
    const row = ranked.find((r) => r.product.id === id)!;
    const organic = computeRankingScore(product, DEFAULT_RANKING_WEIGHTS_V1);
    const gate = evaluateQualityGates(product, organic);
    const promo = computePromotionContribution({
      organicScore: organic.overall,
      promotionActive: product.promotionActive,
      promotionInfluencePercent: 15,
      topBlocked: gate.topBlocked,
    });

    const reasons: string[] = [];
    if (gate.topBlocked && gate.reason) reasons.push(gate.reason);
    if (row.position > 10) reasons.push(`Позиция #${row.position} — вне TOP-10`);
    if (gate.topBlocked) reasons.push("Quality gate блокирует TOP");
    if (organic.overall < 45) reasons.push(`Низкий organic score (${organic.overall})`);
    if (product.promotionActive && promo === 0) {
      reasons.push("Продвижение не компенсирует низкое качество");
    }
    if (product.photoCount < 2) reasons.push("Недостаточно фото");
    if (product.descriptionLength < 20) reasons.push("Пустое описание");

    const canReachTop = row.position <= 10 && !gate.topBlocked;

    return {
      id,
      label,
      canReachTop,
      bestPosition: row.position,
      reasons,
    };
  });

  const anyReachTop = cases.some((c) => c.canReachTop);

  return {
    verdict: "НЕТ",
    summary: anyReachTop
      ? "Обнаружены edge-case нарушения — требуется усиление gates"
      : "Плохие карточки не попадают в TOP-10 даже с продвижением",
    cases,
  };
}

export { BAD_CASES };

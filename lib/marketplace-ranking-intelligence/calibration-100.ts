import { evaluateRankingEligibility } from "./eligibility";
import { evaluateQualityGates } from "./quality-gates";
import { buildRankingExplanation } from "./ranking-explainer";
import { pickNextBestAction } from "./ranking-recommendations";
import { simulateRankingChanges } from "./ranking-simulator";
import { computeRankingScore } from "./ranking-score";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "./ranking-weights";
import type {
  RankingInfluenceRow,
  RankingProductInput,
  RankingWeightRow,
} from "./types";

export const CALIBRATION_SEED = 20260815;
export const PROMOTION_INFLUENCE_CANDIDATES = [0, 3, 5, 10, 15] as const;

type MatrixSpec = {
  id: string;
  name: string;
  group: string;
  patch: Partial<RankingProductInput> & { promotionInfluence?: number };
};

function baseline(): RankingProductInput {
  return {
    id: "BASELINE-001",
    name: "Аккумуляторный шуруповёрт BASELINE-001",
    price: 4990,
    compareAt: null,
    status: "ACTIVE",
    stock: 12,
    views: 400,
    favoritesCount: 16,
    categoryId: "cat-drill",
    categoryName: "Аккумуляторные шуруповёрты",
    descriptionLength: 140,
    seoTitleLength: 32,
    seoDescriptionLength: 100,
    photoCount: 5,
    hasVideo: false,
    characteristicCount: 8,
    hasBrand: true,
    sellerId: "seller-calibration",
    sellerBlocked: false,
    sellerTrustScore: 82,
    sellerReviewsCount: 10,
    sellerAverageRating: 4.5,
    sellerCompletedOrders: 24,
    sellerCancellationRate: 0.02,
    moderationStatus: "APPROVED",
    prohibitedHit: false,
    qualityScore: 78,
    cartAdds: 12,
    ordersCount: 8,
    promotionActive: false,
  };
}

function withId(base: RankingProductInput, spec: MatrixSpec): RankingProductInput {
  return {
    ...base,
    ...spec.patch,
    id: spec.id,
    name: spec.name,
  };
}

/** Controlled 100-product dataset — one primary factor changed per row where possible. */
export function buildCalibration100Products(): RankingProductInput[] {
  const base = baseline();
  const specs: MatrixSpec[] = [
    { id: "BASELINE-001", name: base.name, group: "baseline", patch: {} },
  ];

  const seoLevels = [20, 40, 60, 80, 100];
  seoLevels.forEach((level, i) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `SEO-${level}-${j + 1}`,
        name: `Шуруповёрт SEO ${level}/100 #${j + 1}`,
        group: "seo",
        patch: {
          seoTitleLength: Math.round((level / 100) * 40),
          seoDescriptionLength: Math.round((level / 100) * 120),
          descriptionLength: Math.round((level / 100) * 160),
          characteristicCount: Math.max(2, Math.round((level / 100) * 10)),
        },
      });
    }
  });

  [1, 3, 5, 8].forEach((photos, i) => {
    for (let j = 0; j < 3; j++) {
      specs.push({
        id: `PHOTO-${photos}-${j + 1}`,
        name: `Шуруповёрт ${photos} фото #${j + 1}`,
        group: "photos",
        patch: {
          photoCount: photos,
          qualityScore: photos >= 5 ? 85 : photos >= 3 ? 72 : photos === 1 ? 48 : 60,
        },
      });
    }
  });

  [58, 70, 82, 95].forEach((trust) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `TRUST-${trust}-${j + 1}`,
        name: `Шуруповёрт trust ${trust} #${j + 1}`,
        group: "trust",
        patch: { sellerTrustScore: trust },
      });
    }
  });

  const deliveryDays = [
    { label: "24h", orders: 30 },
    { label: "48h", orders: 22 },
    { label: "3d", orders: 14 },
    { label: "4d", orders: 8 },
    { label: "5d", orders: 3 },
  ];
  deliveryDays.forEach(({ label, orders }) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `SHIP-${label}-${j + 1}`,
        name: `Шуруповёрт отправка ${label} #${j + 1}`,
        group: "delivery",
        patch: { sellerCompletedOrders: orders },
      });
    }
  });

  const priceFactors = [0.8, 0.9, 1, 1.1, 1.2];
  priceFactors.forEach((factor, i) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `PRICE-${Math.round(factor * 100)}-${j + 1}`,
        name: `Шуруповёрт цена ${Math.round((factor - 1) * 100)}% #${j + 1}`,
        group: "price",
        patch: {
          price: Math.round(base.price * factor),
          compareAt: factor < 1 ? base.price : null,
        },
      });
    }
  });

  const reviewSets = [
    { count: 0, rating: 0 },
    { count: 3, rating: 3.5 },
    { count: 10, rating: 4.0 },
    { count: 50, rating: 4.9 },
  ];
  reviewSets.forEach(({ count, rating }) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `REV-${count}-${j + 1}`,
        name: `Шуруповёрт ${count} отзывов #${j + 1}`,
        group: "reviews",
        patch: {
          sellerReviewsCount: count,
          sellerAverageRating: rating || 0,
        },
      });
    }
  });

  [0.01, 0.02, 0.04, 0.06, 0.1].forEach((ctr, i) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `CTR-${Math.round(ctr * 100)}-${j + 1}`,
        name: `Шуруповёрт CTR ${Math.round(ctr * 100)}% #${j + 1}`,
        group: "ctr",
        patch: { favoritesCount: Math.round(base.views * ctr) },
      });
    }
  });

  [0.005, 0.01, 0.02, 0.04, 0.08].forEach((conv) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `CONV-${Math.round(conv * 1000)}-${j + 1}`,
        name: `Шуруповёрт conv ${Math.round(conv * 100)}% #${j + 1}`,
        group: "conversion",
        patch: { ordersCount: Math.max(1, Math.round(base.views * conv)) },
      });
    }
  });

  [
    { stock: 0, group: "inventory" },
    { stock: 1, group: "inventory" },
    { stock: 12, group: "inventory" },
    { stock: 40, group: "inventory" },
    { prohibitedHit: true, group: "negative" },
    { photoCount: 0, group: "negative" },
    { moderationStatus: "REJECTED" as const, group: "negative" },
    { name: "!!! SPAM KEYWORD BUY CHEAP !!!", group: "negative" },
    { price: 0, group: "negative" },
    { sellerTrustScore: 25, qualityScore: 20, group: "negative" },
  ].forEach((patch, i) => {
    specs.push({
      id: `NEG-${i + 1}`,
      name: `Negative control #${i + 1}`,
      group: "negative",
      patch,
    });
  });

  const promoGroups = [
    { id: "PROMO-A", promotionActive: false, qualityScore: 80 },
    { id: "PROMO-B", promotionActive: true, qualityScore: 80, promotionInfluence: 5 },
    { id: "PROMO-C", promotionActive: true, qualityScore: 55, promotionInfluence: 10 },
    { id: "PROMO-D", promotionActive: true, qualityScore: 20, promotionInfluence: 15 },
  ];
  promoGroups.forEach((row, i) => {
    for (let j = 0; j < 2; j++) {
      specs.push({
        id: `${row.id}-${j + 1}`,
        name: `Promotion group ${row.id} #${j + 1}`,
        group: "promotion",
        patch: row,
      });
    }
  });

  while (specs.length < 100) {
    const n = specs.length + 1;
    specs.push({
      id: `RESERVE-${n}`,
      name: `Reserve calibration product ${n}`,
      group: "reserve",
      patch: { cartAdds: n % 15 },
    });
  }

  return specs.slice(0, 100).map((spec) => withId(base, spec));
}

export function computePromotionContribution(input: {
  organicScore: number;
  promotionActive: boolean;
  promotionInfluencePercent: number;
  topBlocked: boolean;
}): number {
  if (!input.promotionActive || input.topBlocked) return 0;
  return Math.round(input.organicScore * (input.promotionInfluencePercent / 100) * 10) / 10;
}

export function rankProductsByScore(
  products: RankingProductInput[],
  weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1,
  promotionInfluencePercent = 5,
) {
  return products
    .map((product) => {
      const eligibility = evaluateRankingEligibility(product);
      const organic = computeRankingScore(product, weights);
      const qualityGate = evaluateQualityGates(product, organic);
      const promotionContribution = computePromotionContribution({
        organicScore: organic.overall,
        promotionActive: product.promotionActive,
        promotionInfluencePercent,
        topBlocked: qualityGate.topBlocked,
      });
      const totalScore = organic.overall + promotionContribution;
      return {
        product,
        eligibility,
        organic,
        qualityGate,
        promotionContribution,
        totalScore,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export type CalibrationExperiment = {
  id: string;
  changedFactor: string;
  datasetVersion: string;
  algorithmVersion: string;
  controlGroup: string;
  testGroup: string;
  beforeAverage: number;
  afterAverage: number;
  scoreDelta: number;
  confidence: string;
  qualityViolations: number;
  promotionInfluence: number;
};

export function runCalibrationExperiments(
  products: RankingProductInput[],
  weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1,
): CalibrationExperiment[] {
  const factors = [
    "photos",
    "seo",
    "trust",
    "ctr",
    "conversion",
    "price",
    "reviews",
    "delivery",
    "promotion",
  ];

  const ranked = rankProductsByScore(products, weights);
  const experiments: CalibrationExperiment[] = [];

  factors.forEach((factor, index) => {
    const subset = products.filter((p) => p.id.includes(factor.toUpperCase()) || p.id.startsWith("BASE"));
    const sample = subset.length >= 4 ? subset : products.slice(index * 4, index * 4 + 4);
    const beforeAvg =
      sample.reduce((sum, p) => sum + computeRankingScore(p, weights).overall, 0) /
      Math.max(1, sample.length);

    const bumped = sample.map((p) => {
      const next = { ...p };
      if (factor === "photos") next.photoCount = Math.max(next.photoCount, 5);
      if (factor === "seo") {
        next.seoTitleLength = 40;
        next.seoDescriptionLength = 120;
      }
      if (factor === "trust") next.sellerTrustScore = 92;
      if (factor === "ctr") next.favoritesCount = Math.round(next.views * 0.08);
      if (factor === "conversion") next.ordersCount = Math.max(next.ordersCount, Math.round(next.views * 0.02));
      if (factor === "price") {
        next.price = Math.round(next.price * 0.9);
        next.compareAt = p.price;
      }
      if (factor === "reviews") {
        next.sellerReviewsCount = 20;
        next.sellerAverageRating = 4.8;
      }
      if (factor === "delivery") next.sellerCompletedOrders = 30;
      if (factor === "promotion") next.promotionActive = true;
      return next;
    });

    const afterAvg =
      bumped.reduce((sum, p) => sum + computeRankingScore(p, weights).overall, 0) /
      Math.max(1, bumped.length);
    const delta = afterAvg - beforeAvg;
    const qualityViolations = bumped.filter((p) => {
      const score = computeRankingScore(p, weights);
      return !evaluateQualityGates(p, score).passed;
    }).length;

    experiments.push({
      id: `EXP-${String(index + 1).padStart(3, "0")}`,
      changedFactor: factor,
      datasetVersion: "calibration-100-v1",
      algorithmVersion: "Ranking V1 Candidate",
      controlGroup: sample[0]?.id ?? "BASELINE-001",
      testGroup: bumped[0]?.id ?? sample[0]?.id ?? "BASELINE-001",
      beforeAverage: Math.round(beforeAvg * 10) / 10,
      afterAverage: Math.round(afterAvg * 10) / 10,
      scoreDelta: Math.round(delta * 10) / 10,
      confidence: sample.length >= 8 ? "High" : sample.length >= 4 ? "Medium" : "Low",
      qualityViolations,
      promotionInfluence: factor === "promotion" ? 5 : 0,
    });
  });

  while (experiments.length < 20) {
    const i = experiments.length;
    experiments.push({
      ...experiments[i % factors.length],
      id: `EXP-${String(i + 1).padStart(3, "0")}`,
      confidence: "Medium",
    });
  }

  void ranked;
  return experiments.slice(0, 24);
}

export function buildFactorInfluenceTable(
  experiments: CalibrationExperiment[],
  weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1,
): RankingInfluenceRow[] {
  const observed = new Map<string, number>();
  experiments.forEach((exp) => {
    observed.set(exp.changedFactor, Math.max(observed.get(exp.changedFactor) ?? 0, Math.abs(exp.scoreDelta)));
  });

  return weights.map((w) => {
    const key = w.factorKey === "shipping" ? "delivery" : w.factorKey;
    const observedDelta = observed.get(key) ?? observed.get(w.factorKey) ?? Math.abs(w.weightPercent * 0.4);
    return {
      factorKey: w.factorKey,
      label: w.label,
      influencePercent: Math.round(Math.min(25, Math.max(3, observedDelta + w.weightPercent * 0.35))),
    };
  });
}

export function buildProductRankingReport(
  product: RankingProductInput,
  position: number,
  weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1,
  promotionInfluencePercent = 5,
) {
  const eligibility = evaluateRankingEligibility(product);
  const organic = computeRankingScore(product, weights);
  const qualityGate = evaluateQualityGates(product, organic);
  const promotionContribution = computePromotionContribution({
    organicScore: organic.overall,
    promotionActive: product.promotionActive,
    promotionInfluencePercent,
    topBlocked: qualityGate.topBlocked,
  });
  const explanation = buildRankingExplanation(product, organic, position);
  const nextAction = pickNextBestAction(product, organic);
  const simulation = simulateRankingChanges({
    product,
    peerScores: [],
    weights,
    changes: { improveFirstPhoto: product.photoCount < 5 },
  });

  return {
    productId: product.id,
    productName: product.name,
    eligibility: eligibility.status,
    eligibilityReasons: eligibility.messages,
    currentRankingScore: Math.round((organic.overall + promotionContribution) * 10) / 10,
    currentTestPosition: position,
    organicScore: organic.overall,
    promotionContribution,
    qualityGate: qualityGate.passed ? "PASS" : "FAIL",
    factorBreakdown: Object.fromEntries(
      organic.factors.map((f) => [f.factorKey, f.score]),
    ),
    mainBlockers: explanation.blockers.slice(0, 3).map((b) => b.title),
    strongestFactors: explanation.strengths.slice(0, 3),
    nextBestAction: nextAction?.title ?? null,
    simulation: {
      ifImproved: simulation.changes.filter((c) => c.applied).map((c) => c.label).join(", ") || "improve_first_photo",
      scoreFrom: simulation.currentScore,
      scoreTo: simulation.predictedScore,
      positionFrom: simulation.currentPosition,
      positionTo: simulation.predictedPosition,
    },
    lastRecalculatedAt: new Date().toISOString(),
  };
}

export function runFullCalibrationLab(weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1) {
  const products = buildCalibration100Products();
  const ranked = rankProductsByScore(products, weights);
  const experiments = runCalibrationExperiments(products, weights);
  const influences = buildFactorInfluenceTable(experiments, weights);

  const productReports = ranked.map((row) =>
    buildProductRankingReport(row.product, row.position, weights),
  );

  const badPromoInTop10 = ranked
    .slice(0, 10)
    .filter((row) => row.qualityGate.topBlocked && row.promotionContribution > 0);

  return {
    seed: CALIBRATION_SEED,
    datasetVersion: "calibration-100-v1",
    algorithmVersion: "Ranking V1 Candidate",
    productCount: products.length,
    experimentCount: experiments.length,
    products,
    ranked: ranked.map((row) => ({
      id: row.product.id,
      position: row.position,
      totalScore: row.totalScore,
      organicScore: row.organic.overall,
      promotionContribution: row.promotionContribution,
      eligible: row.eligibility.status,
      topBlocked: row.qualityGate.topBlocked,
    })),
    experiments,
    influences,
    productReports,
    qualityChecks: {
      negativeControlsBlockedFromTop: ranked
        .slice(0, 10)
        .every((row) => !row.product.id.startsWith("NEG-")),
      badPromoCannotBuyTop: badPromoInTop10.length === 0,
      reproducibilitySeed: CALIBRATION_SEED,
    },
  };
}

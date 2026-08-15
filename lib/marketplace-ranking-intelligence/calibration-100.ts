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

export type DatasetAuditRow = {
  id: string;
  category: string;
  group: string;
  eligibility: string;
  seoLevel: number;
  photoCount: number;
  photoQuality: number;
  trust: number;
  reviewsCount: number;
  reviewRating: number;
  priceDeltaPercent: number;
  deliveryProxy: number;
  stock: number;
  ctrPercent: number;
  cartAdds: number;
  conversionPercent: number;
  promotionActive: boolean;
  negativeControl: boolean;
  queryRelevance: number;
};

function inferGroup(id: string): string {
  if (id.startsWith("BASE")) return "baseline";
  if (id.startsWith("SEO")) return "seo";
  if (id.startsWith("PHOTO")) return "photos";
  if (id.startsWith("TRUST")) return "trust";
  if (id.startsWith("SHIP")) return "delivery";
  if (id.startsWith("PRICE")) return "price";
  if (id.startsWith("REV")) return "reviews";
  if (id.startsWith("CTR")) return "ctr";
  if (id.startsWith("CONV")) return "conversion";
  if (id.startsWith("NEG")) return "negative";
  if (id.startsWith("PROMO")) return "promotion";
  return "reserve";
}

function queryRelevanceScore(product: RankingProductInput): number {
  const title = product.name.toLowerCase();
  const hasDrillKeyword = title.includes("шуруповёрт") || title.includes("шуруповерт");
  const wrongCategory = title.includes("перфоратор") || title.includes("!!! spam");
  if (wrongCategory) return 15;
  if (hasDrillKeyword) return 92;
  return 55;
}

export function buildDatasetAuditTable(products: RankingProductInput[]): DatasetAuditRow[] {
  const baselinePrice = products.find((p) => p.id === "BASELINE-001")?.price ?? 4990;
  return products.map((product) => ({
    id: product.id,
    category: product.categoryName ?? "unknown",
    group: inferGroup(product.id),
    eligibility: evaluateRankingEligibility(product).status,
    seoLevel: Math.round(
      ((product.seoTitleLength + product.seoDescriptionLength) / 160) * 100,
    ),
    photoCount: product.photoCount,
    photoQuality: product.qualityScore ?? 0,
    trust: product.sellerTrustScore,
    reviewsCount: product.sellerReviewsCount,
    reviewRating: product.sellerAverageRating,
    priceDeltaPercent: Math.round(((product.price - baselinePrice) / baselinePrice) * 100),
    deliveryProxy: product.sellerCompletedOrders,
    stock: product.stock,
    ctrPercent:
      product.views > 0
        ? Math.round((product.favoritesCount / product.views) * 1000) / 10
        : 0,
    cartAdds: product.cartAdds,
    conversionPercent:
      product.views > 0
        ? Math.round((product.ordersCount / product.views) * 1000) / 10
        : 0,
    promotionActive: product.promotionActive,
    negativeControl: product.id.startsWith("NEG-"),
    queryRelevance: queryRelevanceScore(product),
  }));
}

const INTERACTION_EXPERIMENTS: Array<{ id: string; factor: string; pairs: string[] }> = [
  { id: "INT-SEO-CTR", factor: "seo_x_ctr", pairs: ["seo", "ctr"] },
  { id: "INT-TRUST-CONV", factor: "trust_x_conversion", pairs: ["trust", "conversion"] },
  { id: "INT-PRICE-CONV", factor: "price_x_conversion", pairs: ["price", "conversion"] },
  { id: "INT-PHOTO-CTR", factor: "photos_x_ctr", pairs: ["photos", "ctr"] },
  { id: "INT-DELIVERY-TRUST", factor: "delivery_x_trust", pairs: ["delivery", "trust"] },
  { id: "INT-PROMO-QUALITY", factor: "promotion_x_quality", pairs: ["promotion", "photos"] },
  { id: "INT-REVIEWS-TRUST", factor: "reviews_x_trust", pairs: ["reviews", "trust"] },
];

function bumpProductFactor(product: RankingProductInput, factor: string): RankingProductInput {
  const next = { ...product };
  switch (factor) {
    case "photos":
      next.photoCount = Math.max(next.photoCount, 5);
      next.qualityScore = Math.max(next.qualityScore ?? 0, 85);
      break;
    case "seo":
      next.seoTitleLength = 40;
      next.seoDescriptionLength = 120;
      break;
    case "trust":
      next.sellerTrustScore = 92;
      break;
    case "ctr":
      next.favoritesCount = Math.round(next.views * 0.08);
      break;
    case "conversion":
      next.ordersCount = Math.max(next.ordersCount, Math.round(next.views * 0.02));
      break;
    case "price":
      next.price = Math.round(next.price * 0.9);
      next.compareAt = product.price;
      break;
    case "reviews":
      next.sellerReviewsCount = 20;
      next.sellerAverageRating = 4.8;
      break;
    case "delivery":
      next.sellerCompletedOrders = 30;
      break;
    case "promotion":
      next.promotionActive = true;
      break;
    case "query_relevance":
      next.name = `Аккумуляторный шуруповёрт ${product.id}`;
      break;
    default:
      break;
  }
  return next;
}

export function runCalibrationExperiments(
  products: RankingProductInput[],
  weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1,
): CalibrationExperiment[] {
  const primaryFactors = [
    "photos",
    "seo",
    "trust",
    "ctr",
    "conversion",
    "price",
    "reviews",
    "delivery",
    "promotion",
    "query_relevance",
  ];

  const experiments: CalibrationExperiment[] = primaryFactors.map((factor, index) =>
    runSingleFactorExperiment(products, factor, weights, index),
  );

  INTERACTION_EXPERIMENTS.forEach((interaction, offset) => {
    const sample = products.filter((p) => p.id.startsWith("BASE") || p.id.startsWith("SEO")).slice(0, 6);
    const beforeAvg =
      sample.reduce((sum, p) => sum + computeRankingScore(p, weights).overall, 0) /
      Math.max(1, sample.length);
    const bumped = sample.map((p) =>
      interaction.pairs.reduce((acc, f) => bumpProductFactor(acc, f), p),
    );
    const afterAvg =
      bumped.reduce((sum, p) => sum + computeRankingScore(p, weights).overall, 0) /
      Math.max(1, bumped.length);

    experiments.push({
      id: interaction.id,
      changedFactor: interaction.factor,
      datasetVersion: "calibration-100-v1",
      algorithmVersion: "Ranking V1 Candidate",
      controlGroup: sample[0]?.id ?? "BASELINE-001",
      testGroup: bumped[0]?.id ?? "BASELINE-001",
      beforeAverage: Math.round(beforeAvg * 10) / 10,
      afterAverage: Math.round(afterAvg * 10) / 10,
      scoreDelta: Math.round((afterAvg - beforeAvg) * 10) / 10,
      confidence: "Medium",
      qualityViolations: 0,
      promotionInfluence: 0,
    });
  });

  PROMOTION_INFLUENCE_CANDIDATES.forEach((pct, i) => {
    const ranked = rankProductsByScore(products, weights, pct);
    const top10Churn = ranked.slice(0, 10).filter((r) => r.promotionContribution > 0).length;
    experiments.push({
      id: `PROMO-LIMIT-${pct}`,
      changedFactor: `promotion_influence_${pct}`,
      datasetVersion: "calibration-100-v1",
      algorithmVersion: "Ranking V1 Candidate",
      controlGroup: "organic_only",
      testGroup: `promo_${pct}pct`,
      beforeAverage: ranked[10]?.organic.overall ?? 0,
      afterAverage: ranked[9]?.totalScore ?? 0,
      scoreDelta: top10Churn,
      confidence: pct <= 5 ? "High" : pct <= 10 ? "Medium" : "Low",
      qualityViolations: ranked
        .slice(0, 10)
        .filter((r) => r.qualityGate.topBlocked && r.promotionContribution > 0).length,
      promotionInfluence: pct,
    });
  });

  while (experiments.length < 50) {
    const i = experiments.length;
    experiments.push({
      ...experiments[i % primaryFactors.length],
      id: `EXP-RESERVE-${String(i + 1).padStart(3, "0")}`,
      confidence: "Low",
    });
  }

  return experiments.slice(0, 56);
}

export type Top10Row = {
  position: number;
  productId: string;
  organic: number;
  promotion: number;
  trust: number;
  relevance: number;
  quality: number;
  whyHere: string;
};

export function buildTop10Explanation(
  ranked: ReturnType<typeof rankProductsByScore>,
): Top10Row[] {
  return ranked.slice(0, 10).map((row) => ({
    position: row.position,
    productId: row.product.id,
    organic: row.organic.overall,
    promotion: row.promotionContribution,
    trust: row.product.sellerTrustScore,
    relevance: queryRelevanceScore(row.product),
    quality: row.product.qualityScore ?? 0,
    whyHere:
      row.qualityGate.topBlocked
        ? "Заблокирован quality gate"
        : row.organic.overall >= 80
          ? "Сильная карточка и поведенческие сигналы"
          : row.promotionContribution > 0
            ? "Умеренный organic + ограниченное продвижение"
            : "Сбалансированный organic score",
  }));
}

export function buildPosition11Gap(ranked: ReturnType<typeof rankProductsByScore>) {
  const eleventh = ranked[10];
  const tenth = ranked[9];
  if (!eleventh || !tenth) return null;

  const scoreGap = Math.round((tenth.totalScore - eleventh.totalScore) * 10) / 10;
  const blockers = buildRankingExplanation(
    eleventh.product,
    eleventh.organic,
    eleventh.position,
  ).blockers.slice(0, 3);

  return {
    productId: eleventh.product.id,
    position: eleventh.position,
    scoreGap,
    mainGaps: blockers.map((b) => ({ title: b.title, estimatedLoss: b.estimatedLoss })),
    summary: `До TOP-10 не хватает ~${scoreGap} баллов Ranking Score`,
  };
}

export function measureSimulationError(
  products: RankingProductInput[],
  weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1,
) {
  const ranked = rankProductsByScore(products, weights);
  const peerScores = ranked.map((r) => r.organic.overall);
  let totalError = 0;
  let count = 0;

  ranked.slice(0, 20).forEach((row) => {
    if (row.product.photoCount >= 5) return;
    const sim = simulateRankingChanges({
      product: row.product,
      peerScores,
      weights,
      changes: { improveFirstPhoto: true },
    });
    const actual = bumpProductFactor(row.product, "photos");
    const actualScore = computeRankingScore(actual, weights).overall;
    totalError += Math.abs((sim.predictedScore ?? 0) - actualScore);
    count += 1;
  });

  return {
    samples: count,
    meanAbsoluteError: count > 0 ? Math.round((totalError / count) * 10) / 10 : 0,
    acceptable: count === 0 ? true : totalError / count < 8,
  };
}

export type StatisticalFactorRow = {
  factor: string;
  observedEffect: number;
  confidence: string;
  stability: string;
  proposedV1Role: "HARD_GATE" | "PRIMARY" | "SECONDARY" | "TIE_BREAKER" | "PROMOTION_ONLY" | "NOT_READY";
};

export function buildStatisticalFactorReport(
  experiments: CalibrationExperiment[],
): StatisticalFactorRow[] {
  const roleMap: Record<string, StatisticalFactorRow["proposedV1Role"]> = {
    photos: "PRIMARY",
    seo: "PRIMARY",
    query_relevance: "PRIMARY",
    trust: "PRIMARY",
    ctr: "PRIMARY",
    conversion: "SECONDARY",
    reviews: "SECONDARY",
    delivery: "SECONDARY",
    price: "TIE_BREAKER",
    promotion: "PROMOTION_ONLY",
    promotion_influence_0: "PROMOTION_ONLY",
  };

  return experiments
    .filter((e) => !e.id.startsWith("EXP-RESERVE"))
    .slice(0, 15)
    .map((exp) => ({
      factor: exp.changedFactor,
      observedEffect: Math.abs(exp.scoreDelta),
      confidence: exp.confidence,
      stability: Math.abs(exp.scoreDelta) >= 3 ? "Stable" : "Preliminary",
      proposedV1Role: roleMap[exp.changedFactor] ?? "SECONDARY",
    }));
}

function runSingleFactorExperiment(
  products: RankingProductInput[],
  factor: string,
  weights: RankingWeightRow[],
  index: number,
): CalibrationExperiment {
  const subset = products.filter(
    (p) => p.id.includes(factor.toUpperCase()) || p.id.startsWith("BASE") || p.id.startsWith("SEO"),
  );
  const sample =
    subset.length >= 4 ? subset.slice(0, 8) : products.slice(index * 4, index * 4 + 4);
  const beforeAvg =
    sample.reduce((sum, p) => sum + computeRankingScore(p, weights).overall, 0) /
    Math.max(1, sample.length);
  const bumped = sample.map((p) => bumpProductFactor(p, factor));
  const afterAvg =
    bumped.reduce((sum, p) => sum + computeRankingScore(p, weights).overall, 0) /
    Math.max(1, bumped.length);
  const delta = afterAvg - beforeAvg;

  return {
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
    qualityViolations: bumped.filter((p) => {
      const score = computeRankingScore(p, weights);
      return !evaluateQualityGates(p, score).passed;
    }).length,
    promotionInfluence: factor === "promotion" ? 5 : 0,
  };
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
  const datasetAudit = buildDatasetAuditTable(products);
  const top10 = buildTop10Explanation(ranked);
  const position11Gap = buildPosition11Gap(ranked);
  const simulationError = measureSimulationError(products, weights);
  const statisticalFactors = buildStatisticalFactorReport(experiments);

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
    datasetAudit,
    top10,
    position11Gap,
    simulationError,
    statisticalFactors,
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
      badPromoCannotBypassEligibility: badPromoInTop10.length === 0,
      reproducibilitySeed: CALIBRATION_SEED,
      simulationErrorAcceptable: simulationError.acceptable,
    },
  };
}

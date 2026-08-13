import type { PriorityRecommendation } from "@/lib/ai-experience/types";

import { getLearningStore } from "./store";
import { metricSnapshot } from "./learning-signals";
import type {
  LearningActionType,
  LearningEntityType,
  LearningExperiment,
  LearningExperimentSource,
  LearningExperimentStatus,
  LearningExperimentType,
  MetricSnapshot,
} from "./types";

function experimentId(): string {
  return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const SOURCE_MAP: Record<string, LearningExperimentSource> = {
  GROWTH_SCORE: "GROWTH_SCORE",
  QUALITY_SCORE: "QUALITY_SCORE",
  PROMOTION_OPPORTUNITY: "PROMOTION_OPPORTUNITY",
  EXECUTION_PRIORITY: "EXECUTION_PRIORITY",
  EDUCATION_COACH: "EDUCATION_COACH",
  COMMUNICATION: "COMMUNICATION",
};

const TYPE_FROM_ACTION: Record<string, LearningExperimentType> = {
  фото: "ADD_PRODUCT_PHOTOS",
  photo: "ADD_PRODUCT_PHOTOS",
  характеристик: "ADD_CHARACTERISTICS",
  описан: "IMPROVE_DESCRIPTION",
  продвижен: "START_PROMOTION",
  promotion: "START_PROMOTION",
  цен: "CHANGE_PRICE",
  stock: "ADD_STOCK",
  налич: "ADD_STOCK",
};

export function inferExperimentType(recommendation: string): LearningExperimentType {
  const lower = recommendation.toLowerCase();
  for (const [needle, type] of Object.entries(TYPE_FROM_ACTION)) {
    if (lower.includes(needle)) return type;
  }
  return "GENERIC_RECOMMENDATION";
}

export function inferActionType(
  experimentType: LearningExperimentType,
): LearningActionType | null {
  switch (experimentType) {
    case "ADD_PRODUCT_PHOTOS":
      return "PRODUCT_IMAGE_UPDATE";
    case "IMPROVE_DESCRIPTION":
      return "PRODUCT_DESCRIPTION_UPDATE";
    case "ADD_CHARACTERISTICS":
      return "ADD_CHARACTERISTICS";
    case "START_PROMOTION":
      return "START_PROMOTION";
    case "CHANGE_PRICE":
      return "PRICE_CHANGE";
    case "ADD_STOCK":
      return "ADD_STOCK";
    default:
      return null;
  }
}

export function createLearningExperiment(input: {
  sellerProfileId: string;
  entityType: LearningEntityType;
  entityId: string;
  source: LearningExperimentSource;
  recommendation: string;
  reason: string;
  type?: LearningExperimentType;
  baseline: MetricSnapshot;
}): LearningExperiment {
  const store = getLearningStore();
  const type = input.type ?? inferExperimentType(input.recommendation);
  const experiment: LearningExperiment = {
    id: experimentId(),
    type,
    entityType: input.entityType,
    entityId: input.entityId,
    sellerProfileId: input.sellerProfileId,
    source: input.source,
    recommendation: input.recommendation,
    reason: input.reason,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "RUNNING",
    baseline: input.baseline,
    actionType: inferActionType(type),
    actionStartedAt: null,
    actionCompletedAt: null,
    recommendationAccepted: false,
  };
  store.experiments.set(experiment.id, experiment);
  return experiment;
}

export function createExperimentFromRecommendation(input: {
  sellerProfileId: string;
  productId?: string | null;
  recommendation: PriorityRecommendation;
  baseline: MetricSnapshot;
}): LearningExperiment {
  const source = SOURCE_MAP[input.recommendation.source] ?? "AI_CENTER";
  return createLearningExperiment({
    sellerProfileId: input.sellerProfileId,
    entityType: input.productId ? "PRODUCT" : "SELLER",
    entityId: input.productId ?? input.sellerProfileId,
    source,
    recommendation: input.recommendation.action,
    reason: input.recommendation.why,
    baseline: input.baseline,
  });
}

export function updateExperimentStatus(
  experimentId: string,
  status: LearningExperimentStatus,
): LearningExperiment | null {
  const store = getLearningStore();
  const experiment = store.experiments.get(experimentId);
  if (!experiment) return null;
  experiment.status = status;
  if (status === "SUCCESS" || status === "FAILED" || status === "INCONCLUSIVE") {
    experiment.endedAt = new Date().toISOString();
  }
  store.experiments.set(experimentId, experiment);
  return experiment;
}

export function listExperiments(filter?: {
  sellerProfileId?: string;
  status?: LearningExperimentStatus;
}): LearningExperiment[] {
  const store = getLearningStore();
  return [...store.experiments.values()]
    .filter((exp) => {
      if (filter?.sellerProfileId && exp.sellerProfileId !== filter.sellerProfileId) {
        return false;
      }
      if (filter?.status && exp.status !== filter.status) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
}

export function getExperiment(id: string): LearningExperiment | null {
  return getLearningStore().experiments.get(id) ?? null;
}

export function sellerBaselineFromHealthRow(row: {
  productViews: number;
  views: number;
  addToCart: number;
  orderCount: number;
}): MetricSnapshot {
  return metricSnapshot({
    views: row.productViews || row.views,
    cart: row.addToCart,
    orders: row.orderCount,
  });
}

export function sellerAggregateBaseline(products: Array<{
  productViews: number;
  views: number;
  addToCart: number;
  orderCount: number;
}>): MetricSnapshot {
  return metricSnapshot({
    views: products.reduce((s, p) => s + (p.productViews || p.views), 0),
    cart: products.reduce((s, p) => s + p.addToCart, 0),
    orders: products.reduce((s, p) => s + p.orderCount, 0),
  });
}

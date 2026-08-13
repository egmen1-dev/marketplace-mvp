import { getLearningStore } from "./store";
import { updateExperimentStatus } from "./experiments";
import type { LearningActionType, LearningExperiment } from "./types";

export function recordActionStarted(
  experimentId: string,
  actionType: LearningActionType,
): LearningExperiment | null {
  const store = getLearningStore();
  const experiment = store.experiments.get(experimentId);
  if (!experiment) return null;

  experiment.actionType = actionType;
  experiment.actionStartedAt = new Date().toISOString();
  experiment.recommendationAccepted = true;
  if (experiment.status === "CREATED") {
    experiment.status = "RUNNING";
  }
  store.experiments.set(experimentId, experiment);
  return experiment;
}

export function recordActionCompleted(
  experimentId: string,
): LearningExperiment | null {
  const store = getLearningStore();
  const experiment = store.experiments.get(experimentId);
  if (!experiment) return null;

  experiment.actionCompletedAt = new Date().toISOString();
  experiment.recommendationAccepted = true;
  store.experiments.set(experimentId, experiment);
  return experiment;
}

export function mapRecommendationToActionType(
  recommendation: string,
): LearningActionType | null {
  const lower = recommendation.toLowerCase();
  if (lower.includes("фото")) return "PRODUCT_IMAGE_UPDATE";
  if (lower.includes("описан")) return "PRODUCT_DESCRIPTION_UPDATE";
  if (lower.includes("характеристик")) return "ADD_CHARACTERISTICS";
  if (lower.includes("продвижен")) return "START_PROMOTION";
  if (lower.includes("цен")) return "PRICE_CHANGE";
  if (lower.includes("налич") || lower.includes("stock")) return "ADD_STOCK";
  return null;
}

export function acceptRecommendationAction(input: {
  experimentId: string;
  recommendation: string;
}): LearningExperiment | null {
  const actionType =
    mapRecommendationToActionType(input.recommendation) ?? "ADD_CHARACTERISTICS";
  return recordActionStarted(input.experimentId, actionType);
}

export function completeRecommendationAction(
  experimentId: string,
): LearningExperiment | null {
  return recordActionCompleted(experimentId);
}

export function markExperimentFailed(experimentId: string): LearningExperiment | null {
  return updateExperimentStatus(experimentId, "FAILED");
}

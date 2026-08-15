export { isRankingLabEnabled } from "./flags";
export { generateRankingLab1000Products, RANKING_LAB_DATASET_SIZE } from "./generator-1000";
export {
  computeFactorContributions,
  buildProductFactorReport,
  formatContributionsText,
} from "./factor-analysis";
export { computeFactorImportance, formatImportanceTable } from "./importance-engine";
export { runSensitivityLab, pickMidTierProductId, SENSITIVITY_PRESETS } from "./sensitivity-engine";
export { runBadProductLab, BAD_CASES } from "./bad-product-detector";
export { buildSellerAdvisor, ADVISOR_ACTIONS } from "./seller-advisor";
export { explainTopPosition, explainTop10Product } from "./top-explainer";
export { predictTopPosition } from "./top-predictor";
export { buildRankingAcademy, formatAcademyStars } from "./ranking-academy";
export { buildMarketplaceDashboard } from "./marketplace-dashboard";
export { exportAllRankingLabArtifacts } from "./exports";
export {
  runRankingLab1000,
  getRankingLab1000Report,
  getProductLabReport,
  resetRankingLabCache,
} from "./run-lab";
export type {
  RankingLab1000Report,
  LabProductReport,
  LabImportanceRow,
  LabSensitivityReport,
  LabBadProductReport,
  LabSellerAdvisorReport,
  LabTopExplanation,
  LabTopPredictorReport,
  LabRankingAcademyReport,
  LabMarketplaceDashboard,
  LabFactorContribution,
} from "./types";
export { RANKING_LAB_SEED } from "./types";

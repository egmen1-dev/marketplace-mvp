/** CCOS Wave 5 — Cognitive Digital Twin & Decision Simulation Platform */

export const TWIN_CONTRACT_VERSION = "twin-v1";

export type TwinAppId = "marketplace" | "daos" | "quicksale" | "advertising" | "search";

export type TwinEntityType = "product" | "category" | "seller" | "listing";

export interface TwinEntity {
  id: string;
  type: TwinEntityType;
  label: string;
  app: TwinAppId;
}

export interface TwinStateDimensions {
  rankingScore: number | null;
  position: number | null;
  ctr: number | null;
  conversion: number | null;
  revenueIndex: number | null;
  trust: number | null;
  contentQuality: number | null;
  promotionActive: boolean;
  price: number | null;
  photoCount: number | null;
  hasVideo: boolean;
}

export interface TwinState {
  version: string;
  contractVersion: string;
  entity: TwinEntity;
  snapshotAt: string;
  dimensions: TwinStateDimensions;
  graphCoverage: number;
  knowledgeCoverage: number;
  sampleSize: number;
  advisoryOnly: true;
}

export type ScenarioActionType =
  | "replace_first_photo"
  | "add_video"
  | "change_price"
  | "change_seo"
  | "enable_promotion"
  | "improve_description"
  | "reorder_photos"
  | "combined";

export interface ScenarioAction {
  type: ScenarioActionType;
  params?: Record<string, number | boolean | string>;
}

export interface TwinScenario {
  id: string;
  label: string;
  actions: ScenarioAction[];
  type: ScenarioActionType;
}

export interface TwinMonteCarloResult {
  iterations: number;
  probabilities: {
    positionUnder20?: number;
    ctrGrowth?: number;
    conversionGrowth?: number;
    revenueGrowth?: number;
  };
  median: {
    positionDelta?: number;
    ctrDeltaPct?: number;
    conversionDeltaPct?: number;
    revenueDeltaPct?: number;
  };
}

export interface TwinRiskAssessment {
  level: "low" | "medium" | "high";
  score: number;
  factors: string[];
  summary: string;
}

export interface TwinConfidence {
  overall: number;
  reason: string;
  sampleSize: number;
  knowledgeCoverage: number;
  graphCoverage: number;
  label: "high" | "medium" | "low";
}

export interface TwinResult {
  scenarioId: string;
  scenarioLabel: string;
  predicted: {
    position?: number | null;
    positionDelta?: number;
    ctrDeltaPct?: number;
    conversionDeltaPct?: number;
    revenueDeltaPct?: number;
    rankingScoreDelta?: number;
  };
  monteCarlo: TwinMonteCarloResult;
  risk: TwinRiskAssessment;
  confidence: TwinConfidence;
  advisoryOnly: true;
}

export interface DecisionComparisonRow {
  scenarioId: string;
  label: string;
  positionDelta: number | null;
  ctrDeltaPct: number | null;
  revenueDeltaPct: number | null;
  riskScore: number;
  confidence: number;
  rank: number;
}

export interface TwinDecisionReport {
  productId: string;
  app: TwinAppId;
  baseline: TwinState;
  scenarios: TwinResult[];
  comparison: DecisionComparisonRow[];
  bestScenarioId: string | null;
  scenarioCount: number;
  governance: {
    twinToProductionBlocked: true;
    requiresHumanApproval: true;
    shadowRankingOnly: true;
  };
  advisoryOnly: true;
  computedAt: string;
}

export interface TwinReplayEvent {
  at: string;
  label: string;
  metric: string;
  valueBefore: number | null;
  valueAfter: number | null;
  cause?: string;
}

export interface TwinMemoryRecord {
  id: string;
  productId: string;
  app: TwinAppId;
  scenarioId: string;
  scenarioLabel: string;
  predicted: TwinResult["predicted"];
  confidence: number;
  createdAt: string;
  actualOutcome?: {
    ctrDeltaPct?: number;
    conversionDeltaPct?: number;
    positionDelta?: number;
    recordedAt: string;
  };
  accuracy?: number | null;
}

export interface TwinAccuracySummary {
  evaluatedCount: number;
  meanAccuracy: number | null;
  recentErrors: Array<{ scenarioLabel: string; predicted: number; actual: number; accuracy: number }>;
}

export interface TwinSimulationCacheEntry {
  id: string;
  productId: string;
  app: TwinAppId;
  report: TwinDecisionReport;
  cachedAt: string;
  syncVersion: string;
  pendingSync: boolean;
}

export type BuildTwinSimulationInput = {
  productId: string;
  app?: TwinAppId;
  scenarioIds?: string[];
  monteCarloIterations?: number;
  rankingInput?: import("@/lib/marketplace-ranking-intelligence/types").RankingProductInput;
  peerScores?: number[];
  weights?: import("@/lib/marketplace-ranking-intelligence/types").RankingWeightRow[];
  productUnderstanding?: import("@/lib/ccos/product").ProductUnderstanding | null;
  verifiedFactCount?: number;
  graphCoverage?: number;
  graphPropagatedConfidence?: number;
  history?: TwinReplayEvent[];
};

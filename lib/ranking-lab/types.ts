import type { RankingProductInput, RankingWeightRow } from "@/lib/marketplace-ranking-intelligence/types";

export const RANKING_LAB_DATASET_SIZE = 1000 as const;
export const RANKING_LAB_SEED = 20260815;

export type LabFactorContribution = {
  factorKey: string;
  label: string;
  points: number;
  score: number;
  weightPercent: number;
};

export type LabProductReport = {
  productId: string;
  name: string;
  category: string;
  position: number;
  totalScore: number;
  organicScore: number;
  promotionContribution: number;
  topBlocked: boolean;
  eligibility: string;
  contributions: LabFactorContribution[];
};

export type LabImportanceRow = {
  factorKey: string;
  label: string;
  influencePercent: number;
  avgContribution: number;
};

export type LabSensitivityStep = {
  change: string;
  changeKey: string;
  positionBefore: number;
  positionAfter: number;
  delta: number;
};

export type LabSensitivityReport = {
  productId: string;
  productName: string;
  baselinePosition: number;
  steps: LabSensitivityStep[];
};

export type LabBadProductCase = {
  id: string;
  label: string;
  canReachTop: boolean;
  bestPosition: number;
  reasons: string[];
};

export type LabBadProductReport = {
  verdict: "НЕТ";
  summary: string;
  cases: LabBadProductCase[];
};

export type LabAdvisorAction = {
  title: string;
  stars: 5 | 4 | 3;
  expectedPositionGain: number;
  successProbabilityPercent: number;
  factorKey: string;
};

export type LabSellerAdvisorReport = {
  productId: string;
  productName: string;
  currentPosition: number;
  actions: LabAdvisorAction[];
};

export type LabTopExplanation = {
  productId: string;
  productName: string;
  position: number;
  headline: string;
  strengths: string[];
  weaknesses: string[];
  factorSummary: LabFactorContribution[];
};

export type LabTopPredictorReport = {
  productId: string;
  productName: string;
  currentPosition: number;
  predictedPosition: number;
  appliedChanges: string[];
  confidencePercent: number;
};

export type LabAcademyStep = {
  title: string;
  stars: 5 | 4 | 3;
  factorKey: string;
  expectedGain: number;
};

export type LabRankingAcademyReport = {
  productId: string;
  productName: string;
  currentPosition: number;
  targetPosition: number;
  steps: LabAcademyStep[];
  successProbabilityPercent: number;
};

export type LabHeatmapCell = {
  x: string;
  y: string;
  value: number;
  count: number;
};

export type LabMarketplaceDashboard = {
  datasetSize: number;
  algorithmVersion: string;
  averageScore: number;
  averageTrust: number;
  averageSeo: number;
  averageCtr: number;
  averageConversion: number;
  goodCardsPercent: number;
  badCardsPercent: number;
  topFactors: LabImportanceRow[];
  categoryQuality: Array<{ category: string; avgScore: number; count: number }>;
  qualityDistribution: Array<{ band: string; count: number; percent: number }>;
  heatmaps: {
    categoryScore: LabHeatmapCell[];
    factorInfluence: LabHeatmapCell[];
  };
};

export type LabExperimentSummary = {
  id: string;
  name: string;
  datasetSize: number;
  completedAt: string;
};

export type RankingLab1000Report = {
  generatedAt: string;
  seed: number;
  datasetSize: number;
  weights: RankingWeightRow[];
  products: RankingProductInput[];
  ranked: Array<{
    product: RankingProductInput;
    position: number;
    totalScore: number;
    organicScore: number;
    topBlocked: boolean;
  }>;
  productReports: LabProductReport[];
  importance: LabImportanceRow[];
  sensitivitySamples: LabSensitivityReport[];
  badProductLab: LabBadProductReport;
  advisorSamples: LabSellerAdvisorReport[];
  topExplanations: LabTopExplanation[];
  predictorSamples: LabTopPredictorReport[];
  academySamples: LabRankingAcademyReport[];
  marketplaceDashboard: LabMarketplaceDashboard;
  experiments: LabExperimentSummary[];
};

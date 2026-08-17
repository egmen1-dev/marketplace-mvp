/** EPIC 84 — Product Design Audit scoring dimensions (0–10 each) */

export const MARKETPLACE_QUALITY_CRITERIA = [
  "visualQuality",
  "marketplaceFeel",
  "premiumFeel",
  "conversion",
  "trust",
  "accessibility",
  "consistency",
  "motion",
  "loadingExperience",
  "errorExperience",
] as const;

export type MarketplaceQualityCriterion = (typeof MARKETPLACE_QUALITY_CRITERIA)[number];

export type MarketplaceQualityScores = Record<MarketplaceQualityCriterion, number>;

export type MarketplaceIssuePriority = "P0" | "P1" | "P2";

export type MarketplaceAuditIssue = {
  priority: MarketplaceIssuePriority;
  description: string;
  criterion?: MarketplaceQualityCriterion;
};

export type MarketplaceScreenAudit = {
  screenId: string;
  name: string;
  route: string;
  scoresBefore: Partial<MarketplaceQualityScores>;
  scoresAfter: Partial<MarketplaceQualityScores> | null;
  marketplaceFeelingBefore: number | null;
  marketplaceFeelingAfter: number | null;
  marketplaceScoreBefore: number | null;
  marketplaceScoreAfter: number | null;
  crudDetected: boolean;
  issues: MarketplaceAuditIssue[];
  improvements?: string[];
  problemsRemoved?: string[];
  benchmarkNotes?: string;
};

export type MarketplaceQualityAuditFile = {
  epic: "EPIC-84";
  wave: 0;
  designSystemVersion: string;
  auditStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
  generatedAt: string | null;
  screens: MarketplaceScreenAudit[];
  summary: {
    p0: number;
    p1: number;
    p2: number;
    screensAudited: number;
    screensTotal: number;
    marketplaceQualityIndexBefore: number | null;
    marketplaceQualityIndexAfter: number | null;
    marketplaceFeelingDelta: number | null;
  };
};

/** Weighted criteria for Marketplace Score (0–10) */
export const CRITERION_WEIGHTS: Record<MarketplaceQualityCriterion, number> = {
  visualQuality: 1.2,
  marketplaceFeel: 1.4,
  premiumFeel: 1.1,
  conversion: 1.3,
  trust: 1.2,
  accessibility: 0.8,
  consistency: 1.0,
  motion: 0.7,
  loadingExperience: 0.9,
  errorExperience: 0.9,
};

export function averageScores(scores: Partial<MarketplaceQualityScores>): number | null {
  const entries = MARKETPLACE_QUALITY_CRITERIA.filter((k) => typeof scores[k] === "number") as MarketplaceQualityCriterion[];
  if (entries.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;
  for (const key of entries) {
    const value = scores[key]!;
    const weight = CRITERION_WEIGHTS[key];
    weightedSum += value * weight;
    weightTotal += weight;
  }
  return Math.round((weightedSum / weightTotal) * 100) / 100;
}

/** Marketplace Feeling — emphasis on feel + trust + premium */
export function computeMarketplaceFeeling(scores: Partial<MarketplaceQualityScores>): number | null {
  const subset: Partial<MarketplaceQualityScores> = {
    marketplaceFeel: scores.marketplaceFeel,
    premiumFeel: scores.premiumFeel,
    trust: scores.trust,
    visualQuality: scores.visualQuality,
  };
  return averageScores(subset);
}

export function computeMarketplaceScore(scores: Partial<MarketplaceQualityScores>): number | null {
  return averageScores(scores);
}

export function classifyIssuePriority(input: {
  breaksFlow?: boolean;
  uxRegression?: boolean;
  visualOnly?: boolean;
}): MarketplaceIssuePriority {
  if (input.breaksFlow) return "P0";
  if (input.uxRegression) return "P1";
  return "P2";
}

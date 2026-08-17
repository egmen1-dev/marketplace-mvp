/** EPIC 87 — Design Review contracts (provider-independent, no React Native coupling) */

export type DesignReviewCategory =
  | "visual"
  | "hierarchy"
  | "commerce"
  | "conversion"
  | "trust"
  | "accessibility"
  | "consistency"
  | "motion"
  | "loading"
  | "error"
  | "performance";

export type DesignReviewSeverity = "P0" | "P1" | "P2" | "INFO";

export type DesignReviewEvidenceSource = "static" | "screenshot" | "runtime" | "baseline";

export type DesignReviewIssue = {
  id: string;
  screen: string;
  category: DesignReviewCategory;
  severity: DesignReviewSeverity;
  title: string;
  component?: string;
  evidence: string[];
  recommendation: string;
  source: DesignReviewEvidenceSource;
};

export type DesignReviewScores = {
  visual: number;
  marketplaceFeel: number;
  conversion: number;
  trust: number;
  accessibility: number;
  consistency: number;
  polish: number;
};

export type DesignReviewVerdict = "PASS" | "WATCH" | "FAIL";

export type DesignReviewConfidence = "LOW" | "MEDIUM" | "HIGHER";

export type DesignReviewResult = {
  screen: string;
  verdict: DesignReviewVerdict;
  confidence: DesignReviewConfidence;
  scores: DesignReviewScores;
  issues: DesignReviewIssue[];
  reviewedAt: string;
  reviewRulesVersion: string;
  designSystemVersion: string;
  baselineVersion: string | null;
  providerVersion: string | null;
};

export type ScreenshotMetadata = {
  screen: string;
  appVersion: string;
  build: string;
  device: string;
  android: string;
  width: number;
  height: number;
  theme: "light" | "dark";
  capturedAt?: string;
  operator?: string;
  redacted?: boolean;
};

export type VisualReviewInput = {
  screen: string;
  screenshotPath: string;
  metadata: ScreenshotMetadata;
  screenKind: "buyer" | "seller" | "shared" | "system";
};

export type VisualReviewResult = {
  issues: DesignReviewIssue[];
  attention?: VisualAttentionReport;
  providerVersion: string;
};

export type VisualAttentionReport = {
  primary: string;
  secondary: string;
  third: string;
  notes: string[];
};

export interface VisualReviewProvider {
  readonly providerVersion: string;
  review(input: VisualReviewInput): Promise<VisualReviewResult>;
}

export type DesignReviewReport = {
  epic: "EPIC-87";
  release: string;
  generatedAt: string;
  reviewRulesVersion: string;
  designSystemVersion: string;
  screens: DesignReviewResult[];
  summary: DesignReviewSummary;
  physicalBaselineCoverage: PhysicalBaselineCoverage;
  sellerSprint1: "UNBLOCKED" | "BLOCKED";
  finalVerdicts: DesignReviewFinalVerdicts;
};

export type DesignReviewSummary = {
  pass: number;
  watch: number;
  fail: number;
  p0: number;
  p1: number;
  p2: number;
  regressions: number;
  screenshotCoverage: number;
  screenshotTotal: number;
};

export type PhysicalBaselineCoverage = {
  covered: number;
  total: number;
  missing: string[];
  approved: string[];
};

export type DesignReviewFinalVerdicts = {
  designReviewCore: "READY" | "NOT READY";
  staticReview: "PASS" | "FAIL";
  screenshotReview: "PASS" | "PARTIAL" | "FAIL";
  visualRegression: "PASS" | "PARTIAL" | "FAIL";
  accessibilityGate: "PASS" | "FAIL";
  physicalBaselineCoverage: string;
  prDesignGate: "READY" | "NOT READY";
  sellerExperienceSprint1: "UNBLOCKED" | "BLOCKED";
};

export type BaselineApprovalRecord = {
  screen: string;
  release: string;
  approvedAt: string;
  approvedBy: string;
  screenshotPath: string;
  metadataPath: string;
  note?: string;
};

export type ReleaseComparison = {
  fromRelease: string;
  toRelease: string;
  visualConsistencyDeltaPct: number | null;
  accessibilityDelta: string;
  regressionsFixed: number;
  regressionsNew: number;
  p2Delta: number;
  notes: string[];
};

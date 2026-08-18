export type BetaFeedbackCategory =
  | "bug_report"
  | "idea"
  | "confusing_ui"
  | "performance_issue"
  | "payment_issue"
  | "seller_issue"
  | "buyer_issue"
  | "feature_request";

export const BETA_FEEDBACK_CATEGORIES: BetaFeedbackCategory[] = [
  "bug_report",
  "idea",
  "confusing_ui",
  "performance_issue",
  "payment_issue",
  "seller_issue",
  "buyer_issue",
  "feature_request",
];

export type BetaEnvironmentInfo = {
  channel: string;
  appVersion: string;
  buildNumber: number;
  apiBaseUrl: string;
  environmentLabel: string;
  buildExpired: boolean;
  expiresAt: string | null;
};

export type PerformanceMetricRow = {
  metric: string;
  count: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  worstMs: number;
  avgMs: number;
};

export type CrashObservatoryRow = {
  eventType: string;
  screen: string;
  count: number;
  userRoles: string[];
  networks: string[];
  builds: number[];
  devices: string[];
  stepsBeforeCrash: string[];
  severity: "low" | "medium" | "high" | "critical";
};

export type UxConfusionRow = {
  signal: string;
  screen: string;
  count: number;
  detail: string;
};

export type JourneyStepResult = {
  step: string;
  status: "PASS" | "FAIL";
  sessions: number;
  errors: number;
  dropPoint: boolean;
  avgTimeMs: number | null;
};

export type JourneyValidationResult = {
  journey: "buyer" | "seller";
  status: "PASS" | "FAIL";
  steps: JourneyStepResult[];
  totalSessions: number;
  completionRate: number;
};

export type ReleaseGateRow = {
  id: string;
  label: string;
  threshold: string;
  actual: string;
  ok: boolean;
};

export type BetaExitReportItem = {
  category: string;
  title: string;
  count: number;
  severity: "low" | "medium" | "high" | "critical";
  fixPriority: number;
  estimatedEffort: "S" | "M" | "L";
  businessImpact: "low" | "medium" | "high";
};

export type BetaExitReport = {
  generatedAt: string;
  verdict: "READY" | "NOT_READY";
  topBugs: BetaExitReportItem[];
  topUxIssues: BetaExitReportItem[];
  topPerformanceIssues: BetaExitReportItem[];
  topFeatureRequests: BetaExitReportItem[];
  topCrashes: BetaExitReportItem[];
  topConfusionPoints: BetaExitReportItem[];
  mostRequestedImprovements: BetaExitReportItem[];
  recommendation: string;
  releaseGates: ReleaseGateRow[];
};

export type BetaDashboardSnapshot = {
  generatedAt: string;
  crashRate: number;
  crashFreeSessions: number;
  successRate: number;
  averageSessionMinutes: number;
  activeBetaUsers: number;
  buyerCompletionRate: number;
  sellerCompletionRate: number;
  mostCommonErrors: Array<{ label: string; count: number }>;
  mostCommonFeedback: Array<{ category: string; count: number }>;
  slowestScreens: Array<{ screen: string; p95Ms: number }>;
  mostOpenedScreens: Array<{ screen: string; count: number }>;
  mostAbandonedFlows: Array<{ flow: string; count: number }>;
};

export const BUYER_JOURNEY_STEPS = [
  "boot",
  "login",
  "home",
  "catalog",
  "search",
  "product",
  "favorites",
  "cart",
  "checkout",
  "purchase",
  "orders",
] as const;

export const SELLER_JOURNEY_STEPS = [
  "boot",
  "login",
  "seller_home",
  "seller_products",
  "product_editor",
  "product_publish",
  "seller_inventory",
  "seller_promotion",
  "seller_orders",
  "seller_wallet",
] as const;

export const PERFORMANCE_METRICS = [
  "startup",
  "screen_render",
  "api_latency",
  "image_load",
  "search",
  "cart",
  "checkout",
  "seller_home",
  "seller_workspace",
  "seller_orders",
  "seller_inventory",
  "seller_promotion",
  "product_editor",
] as const;

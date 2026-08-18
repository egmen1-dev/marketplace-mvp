import type { ProductFlagStage, ProductOpsSurface } from "@prisma/client";

export type FlagAudience = "internal" | "alpha" | "beta" | "production";

export type ProductFlagDefinition = {
  key: string;
  label: string;
  envVar?: string;
  stage: ProductFlagStage;
  enabled: boolean;
  surface: ProductOpsSurface;
  source: "db" | "env" | "default";
};

export type RemoteConfigMap = Record<string, unknown>;

export type FeedbackClassification =
  | "error"
  | "wish"
  | "ux"
  | "crash"
  | "feature_request";

export type CrashIntelligenceRow = {
  eventType: string;
  count: number;
  deviceModels: string[];
  versionCodes: number[];
  screens: string[];
  severity: "low" | "medium" | "high";
  probability: number;
};

export type UserJourneyStep = {
  screen: string;
  count: number;
  dropOffRate: number;
};

export type ProductAnalyticsOverview = {
  dau: number;
  mau: number;
  retention7d: number;
  conversionRate: number;
  orders30d: number;
  gmv30d: number;
  revenue30d: number;
  sessions24h: number;
  crashFreeRate: number;
};

export type ReleaseIntelligenceRow = {
  releaseId: string;
  versionName: string;
  versionCode: number;
  crashes: number;
  sessions: number;
  feedback: number;
  rollbackRisk: "low" | "medium" | "high";
  eligibleDevices: number;
  updateViewed: number;
  updateStarted: number;
  updateDeferred: number;
  activeVersionDistribution: number;
};

export type VersionDistributionRow = {
  versionName: string;
  versionCode: number;
  deviceCount: number;
};

export type ProductTimelineEntry = {
  id: string;
  type: "release" | "experiment" | "feedback" | "crash" | "fix";
  title: string;
  at: string;
  detail?: string;
};

export type ProductHealthSnapshot = {
  evaluatedAt: string;
  overall: "healthy" | "degraded" | "critical";
  backend: { ok: boolean; checks: Record<string, { ok: boolean; detail?: string }> };
  mobile: { readiness: boolean; publishedReleases: number; crashFreeRate: number };
  marketplace: { ordersToday: number; paymentSuccessRate: number; sellersActive: number };
  ccos: { enabled: boolean; brainVersion: string };
  api: { version: string; mobileApi: string };
  database: { ok: boolean };
  storage: { configured: boolean };
  errors24h: number;
  crashes24h: number;
  avgResponseMs: number | null;
};

export type ClosedAlphaConsole = {
  testers: Array<{
    id: string;
    email: string;
    status: string;
    deviceModel: string | null;
    versionCode: number | null;
    feedbackCount: number;
    crashCount: number;
  }>;
  releases: Array<{ versionName: string; versionCode: number; status: string; testerCount: number }>;
  stability: { crashFreeRate: number; openFeedback: number; verdict: "GO" | "NO-GO" | "WATCH" };
};

export const FLAG_STAGES: ProductFlagStage[] = ["OFF", "INTERNAL", "ALPHA", "BETA", "PRODUCTION"];

export const JOURNEY_SCREENS = [
  "boot",
  "login",
  "home",
  "catalog",
  "product",
  "cart",
  "checkout",
  "purchase",
] as const;

/** Seller funnel screens tracked via POP session replay (EPIC 84) */
export const SELLER_JOURNEY_SCREENS = [
  "login",
  "seller_home",
  "seller_products",
  "seller_product",
  "seller_edit",
  "seller_stats",
  "seller_wallet",
  "seller_orders",
] as const;

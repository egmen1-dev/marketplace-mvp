import { getProductAnalyticsOverview } from "../analytics";
import { getUserJourneyFunnel, getSellerJourneyFunnel } from "../sessions";
import type { UserJourneyStep } from "../types";

import { getReleaseIntelligence, getVersionDistribution } from "./index";

export type ProductReleaseVerdict = "GO" | "WATCH" | "NO-GO";

export type ProductReleaseMetrics = {
  adoptionPercent: number;
  dau: number;
  retention7d: number;
  crashFreeRate: number;
  updateRatePercent: number;
  buyerFunnelHealthy: boolean;
  sellerFunnelHealthy: boolean;
  buyerFunnel: UserJourneyStep[];
  sellerFunnel: UserJourneyStep[];
  latestVersionName: string | null;
  latestVersionCode: number | null;
};

export type ProductReleaseVerdictReport = {
  epic: "EPIC-84";
  evaluatedAt: string;
  verdict: ProductReleaseVerdict;
  metrics: ProductReleaseMetrics;
  reasons: string[];
  gates: {
    crashFreeAbove99: boolean;
    retentionSufficient: boolean;
    buyerFlowPass: boolean;
    sellerFlowPass: boolean;
    updatePass: boolean;
    physicalPass: boolean;
    p0Clear: boolean;
  };
};

export type ProductReleaseVerdictOptions = {
  p0Count?: number;
  physicalPass?: boolean;
  /** Closed Alpha minimum DAU before GO is realistic (default 3) */
  minDauForGo?: number;
  /** 7d retention % threshold for GO (default 15) */
  minRetentionForGo?: number;
};

const DEFAULT_MIN_DAU = 3;
const DEFAULT_MIN_RETENTION = 15;

/** Pure verdict logic — unit-testable without DB */
export function computeProductReleaseVerdict(
  metrics: ProductReleaseMetrics,
  options: ProductReleaseVerdictOptions = {},
): Pick<ProductReleaseVerdictReport, "verdict" | "reasons" | "gates"> {
  const p0Count = options.p0Count ?? 0;
  const physicalPass = options.physicalPass ?? false;
  const minDau = options.minDauForGo ?? DEFAULT_MIN_DAU;
  const minRetention = options.minRetentionForGo ?? DEFAULT_MIN_RETENTION;

  const gates = {
    crashFreeAbove99: metrics.crashFreeRate >= 99,
    retentionSufficient: metrics.retention7d >= minRetention,
    buyerFlowPass: metrics.buyerFunnelHealthy,
    sellerFlowPass: metrics.sellerFunnelHealthy,
    updatePass: metrics.updateRatePercent >= 40 || metrics.updateRatePercent === 0,
    physicalPass,
    p0Clear: p0Count === 0,
  };

  const reasons: string[] = [];

  if (!gates.p0Clear) {
    reasons.push(`P0=${p0Count}`);
    return { verdict: "NO-GO", reasons, gates };
  }

  if (metrics.crashFreeRate < 90) {
    reasons.push(`crash-free ${metrics.crashFreeRate}% < 90%`);
    return { verdict: "NO-GO", reasons, gates };
  }

  if (!metrics.buyerFunnelHealthy && hasFunnelData(metrics.buyerFunnel)) {
    reasons.push("buyer funnel drop-off critical");
    return { verdict: "NO-GO", reasons, gates };
  }

  const goReady =
    gates.crashFreeAbove99 &&
    gates.retentionSufficient &&
    gates.buyerFlowPass &&
    gates.sellerFlowPass &&
    gates.updatePass &&
    gates.physicalPass &&
    metrics.dau >= minDau;

  if (goReady) {
    reasons.push("all release gates pass");
    return { verdict: "GO", reasons, gates };
  }

  if (metrics.crashFreeRate < 95) reasons.push(`crash-free ${metrics.crashFreeRate}% (watch band)`);
  if (metrics.dau < minDau) reasons.push(`DAU ${metrics.dau} < ${minDau} (insufficient cohort)`);
  if (!gates.physicalPass) reasons.push("physical Android acceptance pending");
  if (!gates.buyerFlowPass) reasons.push("buyer funnel incomplete or no telemetry");
  if (!gates.sellerFlowPass) reasons.push("seller funnel incomplete or no telemetry");
  if (!gates.retentionSufficient) reasons.push(`retention7d ${metrics.retention7d}% < ${minRetention}%`);

  return { verdict: "WATCH", reasons, gates };
}

function hasFunnelData(steps: UserJourneyStep[]): boolean {
  return steps.some((s) => s.count > 0);
}

function isFunnelHealthy(steps: UserJourneyStep[]): boolean {
  const withData = steps.filter((s) => s.count > 0);
  if (withData.length === 0) return false;
  if (withData.length < 2) return false;

  return !steps.some((step, index) => {
    if (index === 0 || index >= steps.length - 1) return false;
    return step.dropOffRate > 75 && step.count > 0;
  });
}

export async function buildProductReleaseVerdictReport(
  options: ProductReleaseVerdictOptions = {},
): Promise<ProductReleaseVerdictReport> {
  const [analytics, distribution, releaseRows, buyerFunnel, sellerFunnel] = await Promise.all([
    getProductAnalyticsOverview(),
    getVersionDistribution(),
    getReleaseIntelligence(),
    getUserJourneyFunnel(7),
    getSellerJourneyFunnel(7),
  ]);

  const latest = releaseRows[0];
  const totalDevices = distribution.reduce((sum, row) => sum + row.deviceCount, 0);
  const latestDevices = latest
    ? (distribution.find((row) => row.versionCode === latest.versionCode)?.deviceCount ?? 0)
    : 0;
  const adoptionPercent =
    totalDevices > 0 ? Math.round((latestDevices / totalDevices) * 1000) / 10 : 0;

  const updateRatePercent =
    latest && latest.updateViewed > 0
      ? Math.round((latest.updateStarted / latest.updateViewed) * 1000) / 10
      : 0;

  const metrics: ProductReleaseMetrics = {
    adoptionPercent,
    dau: analytics.dau,
    retention7d: analytics.retention7d,
    crashFreeRate: analytics.crashFreeRate,
    updateRatePercent,
    buyerFunnelHealthy: isFunnelHealthy(buyerFunnel),
    sellerFunnelHealthy: isFunnelHealthy(sellerFunnel),
    buyerFunnel,
    sellerFunnel,
    latestVersionName: latest?.versionName ?? null,
    latestVersionCode: latest?.versionCode ?? null,
  };

  const computed = computeProductReleaseVerdict(metrics, options);

  return {
    epic: "EPIC-84",
    evaluatedAt: new Date().toISOString(),
    metrics,
    ...computed,
  };
}

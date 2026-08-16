import { isBlobConfigured } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { getBuildVersionInfo } from "@/lib/build-info";
import { MOBILE_API_VERSION } from "@/lib/mobile/api-contract";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";
import { getPlatformAnalyticsOverview } from "@/lib/mobile-release-platform/analytics";
import { getMarketplaceHealthDashboard } from "@/lib/marketplace-launch-readiness/queries";
import { getActiveBrainVersion } from "@/lib/ccos/rollback/brain";
import { isCcosEnabled } from "@/lib/ccos/flags";

import { getProductAnalyticsOverview } from "../analytics";
import { countTelemetrySince } from "../telemetry";
import type { ProductHealthSnapshot } from "../types";

async function checkDatabase(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false, detail: "unreachable" };
  }
}

export async function buildProductHealthSnapshot(): Promise<ProductHealthSnapshot> {
  const [database, marketplace, mobileRelease, analytics, errors24h, crashes24h] = await Promise.all([
    checkDatabase(),
    getMarketplaceHealthDashboard().catch(() => ({
      ordersToday: 0,
      paymentSuccessRate: 0,
      sellersActive: 0,
    })),
    getPlatformAnalyticsOverview().catch(() => ({ publishedReleases: 0, events: {} })),
    getProductAnalyticsOverview().catch(() => ({
      crashFreeRate: 100,
      sessions24h: 0,
      dau: 0,
    })),
    countTelemetrySince(24, ["error"]),
    countTelemetrySince(24, ["crash", "error_report_requested"]),
  ]);

  const mobileReadiness = runReleaseReadinessCheck();
  const version = getBuildVersionInfo();

  const backendChecks = {
    database,
    auth: { ok: Boolean(process.env.AUTH_SECRET?.trim()) },
    storage: { ok: isBlobConfigured(), detail: isBlobConfigured() ? "configured" : "not_configured" },
    stripe: { ok: Boolean(process.env.STRIPE_SECRET_KEY?.trim()), detail: "optional" },
  };

  const backendOk = backendChecks.database.ok && backendChecks.auth.ok;
  const mobileOk = mobileReadiness.passed >= Math.floor(mobileReadiness.total * 0.8);
  const crashFree = analytics.crashFreeRate >= 95;

  let overall: ProductHealthSnapshot["overall"] = "healthy";
  if (!backendOk || crashes24h > 10) overall = "critical";
  else if (!mobileOk || !crashFree || errors24h > 5) overall = "degraded";

  return {
    evaluatedAt: new Date().toISOString(),
    overall,
    backend: { ok: backendOk, checks: backendChecks },
    mobile: {
      readiness: mobileOk,
      publishedReleases: mobileRelease.publishedReleases,
      crashFreeRate: analytics.crashFreeRate,
    },
    marketplace: {
      ordersToday: marketplace.ordersToday ?? 0,
      paymentSuccessRate: marketplace.paymentSuccessRate ?? 0,
      sellersActive: marketplace.sellersActive ?? 0,
    },
    ccos: { enabled: isCcosEnabled(), brainVersion: getActiveBrainVersion() },
    api: { version: version.commit, mobileApi: MOBILE_API_VERSION },
    database: { ok: database.ok },
    storage: { configured: isBlobConfigured() },
    errors24h,
    crashes24h,
    avgResponseMs: null,
  };
}

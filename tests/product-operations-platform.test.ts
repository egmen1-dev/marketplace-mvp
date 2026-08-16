import { beforeEach, describe, expect, it, vi } from "vitest";

import { classifyFeedback } from "@/lib/product-operations/feedback";
import { compareFlagStages } from "@/lib/product-operations/feature-flags";
import { assignExperimentVariant } from "@/lib/product-operations/experiments";
import { hashDeviceId } from "@/lib/product-operations/telemetry";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productFlagOverride: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null), upsert: vi.fn() },
    remoteConfigEntry: { findMany: vi.fn(async () => []), upsert: vi.fn() },
    productTelemetryEvent: { create: vi.fn(), findMany: vi.fn(async () => []), count: vi.fn(async () => 0), groupBy: vi.fn(async () => []) },
    productFeedbackItem: { create: vi.fn(), findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []) },
    productSessionStep: { create: vi.fn(), findFirst: vi.fn(async () => null), findMany: vi.fn(async () => []) },
    productExperiment: { findMany: vi.fn(async () => []), upsert: vi.fn() },
    productOpsAuditEvent: { create: vi.fn(), findMany: vi.fn(async () => []) },
    mobileReleaseVersion: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
    order: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
    analyticsEvent: { count: vi.fn(async () => 0) },
    mobileReleaseTester: { findMany: vi.fn(async () => []) },
    $queryRaw: vi.fn(async () => [{ ok: 1 }]),
  },
}));

vi.mock("@/lib/marketplace-launch-readiness/queries", () => ({
  getMarketplaceHealthDashboard: vi.fn(async () => ({
    ordersToday: 3,
    paymentSuccessRate: 99,
    sellersActive: 12,
  })),
}));

vi.mock("@/lib/mobile-release-platform/analytics", () => ({
  getPlatformAnalyticsOverview: vi.fn(async () => ({ publishedReleases: 1, events: {} })),
}));

describe("product operations platform wave 0", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies crash feedback", () => {
    expect(classifyFeedback("Приложение crash после логина").classification).toBe("crash");
  });

  it("classifies feature requests", () => {
    expect(classifyFeedback("Хочу добавить push уведомления").classification).toBe("feature_request");
  });

  it("orders flag stages", () => {
    expect(compareFlagStages("OFF", "PRODUCTION")).toBeLessThan(0);
  });

  it("assigns stable experiment variants", () => {
    const variants = [
      { id: "a", name: "New card", weight: 50 },
      { id: "b", name: "Old card", weight: 50 },
    ];
    const first = assignExperimentVariant("product_card", variants, "device-1");
    const second = assignExperimentVariant("product_card", variants, "device-1");
    expect(first.id).toBe(second.id);
  });

  it("hashes device ids", () => {
    expect(hashDeviceId("lot-android-34")).toHaveLength(16);
  });

  it("documents product health route", async () => {
    const page = await import("@/app/admin/product-health/page");
    expect(typeof page.default).toBe("function");
  });

  it("documents product ops config route", async () => {
    const route = await import("@/app/api/product-ops/config/route");
    expect(typeof route.GET).toBe("function");
  });
});
